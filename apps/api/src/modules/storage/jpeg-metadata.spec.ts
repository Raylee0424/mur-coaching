import { describe, expect, it } from 'vitest';
import { scanJpegHeader } from './jpeg-metadata';

const seg = (marker: number, payload: number[]): number[] => [0xff, marker, (payload.length + 2) >> 8, (payload.length + 2) & 0xff, ...payload];
const jpeg = (...segments: number[][]): Uint8Array => new Uint8Array([0xff, 0xd8, ...segments.flat(), 0xff, 0xda, 0, 2]);
const JFIF = seg(0xe0, [0x4a, 0x46, 0x49, 0x46, 0]);

describe('scanJpegHeader', () => {
  it('passes a canvas-style JPEG with only JFIF, quant and huffman tables', () => {
    expect(scanJpegHeader(jpeg(JFIF, seg(0xdb, new Array(65).fill(1)), seg(0xc4, [0, 1, 2])))).toBe('clean');
  });

  it('flags EXIF, IPTC and comment segments', () => {
    expect(scanJpegHeader(jpeg(JFIF, seg(0xe1, [0x45, 0x78, 0x69, 0x66, 0, 0])))).toBe('metadata');
    expect(scanJpegHeader(jpeg(seg(0xed, [1, 2])))).toBe('metadata');
    expect(scanJpegHeader(jpeg(seg(0xfe, [0x68, 0x69])))).toBe('metadata');
  });

  it('rejects non-JPEG bytes and headers that run past the sample', () => {
    expect(scanJpegHeader(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe('not-jpeg');
    expect(scanJpegHeader(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x10, 0x00, 1, 2]))).toBe('truncated');
  });
});
