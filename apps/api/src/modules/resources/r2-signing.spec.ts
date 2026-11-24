import { describe, expect, it } from 'vitest';
import { presignUrl } from './r2-signing';

describe('presignUrl', () => {
  // AWS "Authenticating requests: using query parameters" documented example (signing is identical for R2).
  it('reproduces the AWS documented GET example signature', () => {
    const url = presignUrl({
      method: 'GET',
      host: 'examplebucket.s3.amazonaws.com',
      path: '/test.txt',
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      region: 'us-east-1',
      now: new Date('2013-05-24T00:00:00Z'),
      expiresSeconds: 86400,
    });
    expect(url).toContain('X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404');
    expect(url).toContain('X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request');
  });

  it('signs extra headers and encodes path segments and query values', () => {
    const base = {
      method: 'PUT' as const,
      host: 'acct.r2.cloudflarestorage.com',
      path: '/bucket/coaches/c 1/file (1).pdf',
      accessKeyId: 'AK',
      secretAccessKey: 'SK',
      region: 'auto',
      now: new Date('2026-11-27T10:00:00Z'),
      expiresSeconds: 900,
    };
    const url = presignUrl({ ...base, headers: { 'Content-Type': 'application/pdf' } });
    expect(url).toContain('/bucket/coaches/c%201/file%20%281%29.pdf?');
    expect(url).toContain('X-Amz-SignedHeaders=content-type%3Bhost');
    // Changing a signed header changes the signature.
    const other = presignUrl({ ...base, headers: { 'Content-Type': 'video/mp4' } });
    expect(other.split('X-Amz-Signature=')[1]).not.toBe(url.split('X-Amz-Signature=')[1]);
  });
});
