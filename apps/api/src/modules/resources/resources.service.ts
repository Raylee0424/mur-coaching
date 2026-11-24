import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { resourceKindFor } from '@coaching/shared';
import type { ClientResourceDto, CreateResourceResponse, RedirectUrlDto, ResourceDto, ResourceLibraryDto } from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ACCESSIBLE_LINK_STATUSES } from '../clients/link-status';
import type { CreateResourceDto } from './dto/resources.dto';
import { StorageService } from '../storage/storage.service';

const resourceInclude = { shares: { select: { clientId: true } } } satisfies Prisma.ResourceInclude;

const toDto = (r: Prisma.ResourceGetPayload<{ include: typeof resourceInclude }>): ResourceDto => ({
  id: r.id,
  title: r.title,
  description: r.description,
  kind: r.kind,
  fileName: r.fileName,
  contentType: r.contentType,
  sizeBytes: r.sizeBytes,
  createdAt: r.createdAt.toISOString(),
  sharedWith: r.shares.map((s) => s.clientId),
});

/** Keep the extension and drop anything that is not a safe path character. */
export const safeFileName = (name: string): string => name.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^\.+/, '').slice(-100) || 'file';

@Injectable()
export class ResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private accessibleClients(coachId: string) {
    return this.prisma.coachClient.findMany({
      where: { coachId, status: { in: [...ACCESSIBLE_LINK_STATUSES] } },
      select: { client: { select: { id: true, name: true } } },
      orderBy: { client: { name: 'asc' } },
    });
  }

  async library(coachId: string): Promise<ResourceLibraryDto> {
    const [rows, links] = await Promise.all([
      this.prisma.resource.findMany({ where: { coachId, uploadedAt: { not: null } }, include: resourceInclude, orderBy: { createdAt: 'desc' } }),
      this.accessibleClients(coachId),
    ]);
    return { storageConfigured: this.storage.configured, resources: rows.map(toDto), clients: links.map((l) => l.client) };
  }

  /** Step 1: reserve the row and hand back a presigned PUT. The row stays hidden until `complete`. */
  async create(coachId: string, dto: CreateResourceDto): Promise<CreateResourceResponse> {
    if (!this.storage.configured) throw new ServiceUnavailableException('File storage is not configured on this server.');
    const kind = resourceKindFor(dto.contentType);
    if (!kind) throw new BadRequestException('That file type is not supported. Use PDF, Word, text, CSV, Excel, MP4, MOV, WebM, PNG or JPEG.');
    const storageKey = `coaches/${coachId}/${randomUUID()}/${safeFileName(dto.fileName)}`;
    const row = await this.prisma.resource.create({
      data: {
        coachId,
        title: dto.title,
        description: dto.description || null,
        kind,
        fileName: dto.fileName,
        contentType: dto.contentType.toLowerCase(),
        sizeBytes: dto.sizeBytes,
        storageKey,
      },
      include: resourceInclude,
    });
    const upload = this.storage.uploadUrl(storageKey, row.contentType);
    return { resource: toDto(row), uploadUrl: upload.url, uploadHeaders: upload.headers };
  }

  /** Step 2: confirm the object landed at the declared size, then list it. */
  async complete(coachId: string, id: string): Promise<ResourceDto> {
    const row = await this.prisma.resource.findFirst({ where: { id, coachId }, include: resourceInclude });
    if (!row) throw new NotFoundException('Resource not found');
    if (row.uploadedAt) return toDto(row);
    const stored = await this.storage.size(row.storageKey);
    if (stored !== row.sizeBytes) {
      await this.prisma.resource.deleteMany({ where: { id, coachId, uploadedAt: null } });
      await this.storage.remove(row.storageKey);
      throw new ConflictException(stored === null ? 'The upload did not arrive. Try again.' : 'The uploaded file does not match the size you selected. Try again.');
    }
    const updated = await this.prisma.resource.update({ where: { id }, data: { uploadedAt: new Date() }, include: resourceInclude });
    return toDto(updated);
  }

  async remove(coachId: string, id: string): Promise<void> {
    const row = await this.prisma.resource.findFirst({ where: { id, coachId }, select: { storageKey: true } });
    if (!row) throw new NotFoundException('Resource not found');
    await this.prisma.resource.delete({ where: { id } });
    await this.storage.remove(row.storageKey);
  }

  /** Replaces the share set. Every id must be one of this coach's accessible clients. */
  async share(coachId: string, id: string, clientIds: string[]): Promise<ResourceDto> {
    const resource = await this.prisma.resource.findFirst({ where: { id, coachId, uploadedAt: { not: null } }, select: { id: true } });
    if (!resource) throw new NotFoundException('Resource not found');
    const ids = [...new Set(clientIds)];
    const allowed = await this.prisma.coachClient.count({ where: { coachId, clientId: { in: ids }, status: { in: [...ACCESSIBLE_LINK_STATUSES] } } });
    if (allowed !== ids.length) throw new NotFoundException('Client not found');
    await this.prisma.$transaction([
      this.prisma.resourceShare.deleteMany({ where: { resourceId: id, clientId: { notIn: ids } } }),
      this.prisma.resourceShare.createMany({ data: ids.map((clientId) => ({ resourceId: id, clientId })), skipDuplicates: true }),
    ]);
    return toDto(await this.prisma.resource.findUniqueOrThrow({ where: { id }, include: resourceInclude }));
  }

  async coachReadUrl(coachId: string, id: string): Promise<RedirectUrlDto> {
    const row = await this.prisma.resource.findFirst({ where: { id, coachId, uploadedAt: { not: null } }, select: { storageKey: true, fileName: true } });
    if (!row) throw new NotFoundException('Resource not found');
    return { url: this.storage.readUrl(row.storageKey, row.fileName) };
  }

  /** What the client's coach shared with them. Nothing once the coach link is archived. */
  async forClient(clientId: string): Promise<ClientResourceDto[]> {
    const link = await this.prisma.coachClient.findUnique({ where: { clientId }, select: { coachId: true, status: true } });
    if (!link || !ACCESSIBLE_LINK_STATUSES.includes(link.status)) return [];
    const shares = await this.prisma.resourceShare.findMany({
      where: { clientId, resource: { coachId: link.coachId, uploadedAt: { not: null } } },
      include: { resource: true },
      orderBy: { createdAt: 'desc' },
    });
    return shares.map((s) => ({
      id: s.resource.id,
      title: s.resource.title,
      description: s.resource.description,
      kind: s.resource.kind,
      fileName: s.resource.fileName,
      sizeBytes: s.resource.sizeBytes,
      sharedAt: s.createdAt.toISOString(),
    }));
  }

  async clientReadUrl(clientId: string, id: string): Promise<RedirectUrlDto> {
    const visible = (await this.forClient(clientId)).some((r) => r.id === id);
    if (!visible) throw new NotFoundException('Resource not found');
    const row = await this.prisma.resource.findUniqueOrThrow({ where: { id }, select: { storageKey: true, fileName: true } });
    return { url: this.storage.readUrl(row.storageKey, row.fileName) };
  }
}
