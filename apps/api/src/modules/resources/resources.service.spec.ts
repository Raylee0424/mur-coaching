import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ResourcesService, safeFileName } from './resources.service';

const row = { id: 'r1', coachId: 'c1', sizeBytes: 100, storageKey: 'k', uploadedAt: null, shares: [], createdAt: new Date() };

function setup() {
  const prisma = {
    resource: { findFirst: vi.fn().mockResolvedValue(row), create: vi.fn().mockResolvedValue({ ...row, contentType: 'application/pdf', kind: 'GUIDE' }), update: vi.fn().mockResolvedValue(row), deleteMany: vi.fn() },
    coachClient: { count: vi.fn().mockResolvedValue(1) },
  };
  const storage = { configured: true, size: vi.fn().mockResolvedValue(100), remove: vi.fn(), uploadUrl: vi.fn().mockReturnValue({ url: 'u', headers: {} }) };
  return { prisma, storage, service: new ResourcesService(prisma as never, storage as never) };
}

describe('ResourcesService', () => {
  it('rejects unsupported content types before reserving a row', async () => {
    const { service, prisma } = setup();
    await expect(service.create('c1', { title: 't', fileName: 'a.exe', contentType: 'application/x-msdownload', sizeBytes: 5 })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.resource.create).not.toHaveBeenCalled();
  });

  it('complete lists the file only when the stored size matches', async () => {
    const ok = setup();
    await ok.service.complete('c1', 'r1');
    expect(ok.prisma.resource.update).toHaveBeenCalled();

    const bad = setup();
    bad.storage.size.mockResolvedValue(7);
    await expect(bad.service.complete('c1', 'r1')).rejects.toBeInstanceOf(ConflictException);
    expect(bad.storage.remove).toHaveBeenCalledWith('k');
    expect(bad.prisma.resource.update).not.toHaveBeenCalled();
  });

  it('refuses to share with a client outside the coach roster', async () => {
    const { service, prisma } = setup();
    prisma.coachClient.count.mockResolvedValue(0);
    await expect(service.share('c1', 'r1', ['stranger'])).rejects.toBeInstanceOf(NotFoundException);
  });

  it('builds a safe object key name', () => {
    expect(safeFileName('../My Plan (v2).pdf')).toBe('_My_Plan_v2_.pdf');
  });
});
