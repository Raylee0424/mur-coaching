import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { EnvService } from '../../config/env.service';
import { presignUrl } from './r2-signing';

const UPLOAD_TTL_SECONDS = 15 * 60;
const READ_TTL_SECONDS = 5 * 60;
const CONTROL_TTL_SECONDS = 60;

/** Cloudflare R2 through its S3 API with presigned URLs. The API never proxies file bytes. */
@Injectable()
export class StorageService {
  constructor(private readonly env: EnvService) {}

  get configured(): boolean {
    return Boolean(this.env.get('R2_ACCOUNT_ID') && this.env.get('R2_ACCESS_KEY_ID') && this.env.get('R2_SECRET_ACCESS_KEY') && this.env.get('R2_BUCKET'));
  }

  /** The browser PUTs the file here with exactly `headers`. */
  uploadUrl(key: string, contentType: string): { url: string; headers: Record<string, string> } {
    const headers = { 'Content-Type': contentType };
    return { url: this.sign('PUT', key, UPLOAD_TTL_SECONDS, {}, headers), headers };
  }

  /** `fileName` sets the download name; omit it for inline images. */
  readUrl(key: string, fileName?: string): string {
    if (!fileName) return this.sign('GET', key, READ_TTL_SECONDS);
    const safeName = fileName.replace(/["\\\r\n]/g, '_');
    return this.sign('GET', key, READ_TTL_SECONDS, { 'response-content-disposition': `inline; filename="${safeName}"` });
  }

  /** Size in bytes of the stored object, or null when it is missing. */
  async size(key: string): Promise<number | null> {
    const res = await fetch(this.sign('HEAD', key, CONTROL_TTL_SECONDS), { method: 'HEAD' }).catch(() => null);
    if (!res) throw new ServiceUnavailableException('File storage is unreachable. Try again shortly.');
    if (res.status === 404) return null;
    if (!res.ok) throw new ServiceUnavailableException('File storage refused the request.');
    const length = Number(res.headers.get('content-length'));
    return Number.isFinite(length) ? length : null;
  }

  /** First `bytes` bytes of the object (ranged GET), or null when it is missing. */
  async head(key: string, bytes: number): Promise<Uint8Array | null> {
    const res = await fetch(this.sign('GET', key, CONTROL_TTL_SECONDS), { headers: { Range: `bytes=0-${bytes - 1}` } }).catch(() => null);
    if (!res) throw new ServiceUnavailableException('File storage is unreachable. Try again shortly.');
    if (res.status === 404) return null;
    if (!res.ok) throw new ServiceUnavailableException('File storage refused the request.');
    return new Uint8Array(await res.arrayBuffer()).slice(0, bytes);
  }

  /** Best effort: an orphaned object costs storage but never leaks, since reads need a signed URL. */
  async remove(key: string): Promise<void> {
    await fetch(this.sign('DELETE', key, CONTROL_TTL_SECONDS), { method: 'DELETE' }).catch(() => undefined);
  }

  private sign(method: 'GET' | 'PUT' | 'HEAD' | 'DELETE', key: string, expiresSeconds: number, query: Record<string, string> = {}, headers?: Record<string, string>): string {
    const accountId = this.env.get('R2_ACCOUNT_ID');
    const accessKeyId = this.env.get('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.env.get('R2_SECRET_ACCESS_KEY');
    const bucket = this.env.get('R2_BUCKET');
    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) throw new ServiceUnavailableException('File storage is not configured on this server.');
    return presignUrl({
      method,
      host: `${accountId}.r2.cloudflarestorage.com`,
      path: `/${bucket}/${key}`,
      query,
      headers,
      accessKeyId,
      secretAccessKey,
      region: 'auto',
      now: new Date(),
      expiresSeconds,
    });
  }
}
