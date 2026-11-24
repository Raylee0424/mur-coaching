export type JpegScan = 'clean' | 'metadata' | 'not-jpeg' | 'truncated';

/** Segments that can carry identifying data: APP1 (EXIF, XMP, GPS), APP13 (IPTC) and COM (free-text comment). */
const IDENTIFYING = new Set([0xe1, 0xed, 0xfe]);

/**
 * Walks the JPEG header segments up to the first scan (SOS) and reports whether any can carry metadata.
 * The browser re-encodes photos through a canvas, which writes none; this is the server-side proof.
 * `head` must hold the file's first bytes; headers longer than that report 'truncated'.
 */
export function scanJpegHeader(head: Uint8Array): JpegScan {
  if (head.length < 4 || head[0] !== 0xff || head[1] !== 0xd8) return 'not-jpeg';
  let i = 2;
  while (i < head.length) {
    if (head[i] !== 0xff) return 'not-jpeg';
    while (head[i] === 0xff) i++; // fill bytes
    if (i >= head.length) return 'truncated';
    const marker = head[i++] as number;
    if (marker === 0xda || marker === 0xd9) return 'clean'; // start of scan / end of image: no headers left
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) continue; // standalone markers carry no length
    if (i + 2 > head.length) return 'truncated';
    if (IDENTIFYING.has(marker)) return 'metadata';
    const length = ((head[i] as number) << 8) | (head[i + 1] as number);
    if (length < 2) return 'not-jpeg';
    i += length;
  }
  return 'truncated';
}
