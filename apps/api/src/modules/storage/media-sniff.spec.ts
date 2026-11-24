import { describe, expect, it } from 'vitest';
import { sniffMedia } from './media-sniff';

const bytes = (...parts: (number[] | string)[]): Uint8Array =>
  new Uint8Array(parts.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p)));

describe('sniffMedia', () => {
  const mp4 = bytes([0, 0, 0, 0x18], 'ftypisom', [0, 0, 0, 0]);
  const webm = bytes([0x1a, 0x45, 0xdf, 0xa3, 0x9f]);
  const jpeg = bytes([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);

  it('accepts matching signatures', () => {
    expect(sniffMedia(mp4, 'video/mp4')).toBe(true);
    expect(sniffMedia(mp4, 'video/quicktime')).toBe(true);
    expect(sniffMedia(mp4, 'audio/mp4')).toBe(true);
    expect(sniffMedia(webm, 'video/webm')).toBe(true);
    expect(sniffMedia(webm, 'audio/webm')).toBe(true);
    expect(sniffMedia(bytes('OggS', [0]), 'audio/ogg')).toBe(true);
  });

  it('rejects a mismatch, other files and unknown types', () => {
    expect(sniffMedia(webm, 'video/mp4')).toBe(false);
    expect(sniffMedia(jpeg, 'video/mp4')).toBe(false);
    expect(sniffMedia(mp4, 'image/jpeg')).toBe(false);
    expect(sniffMedia(new Uint8Array(), 'video/webm')).toBe(false);
  });
});
