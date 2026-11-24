/**
 * File-signature check for uploaded clips and voice notes. The signed PUT pins the declared content type; this
 * proves the bytes match it, so a renamed file of another type is never listed.
 */
export function sniffMedia(bytes: Uint8Array, contentType: string): boolean {
  const ascii = (from: number, to: number): string => String.fromCharCode(...bytes.slice(from, to));
  const isoBmff = bytes.length >= 12 && ascii(4, 8) === 'ftyp'; // MP4, QuickTime, M4A
  const ebml = bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3; // WebM
  switch (contentType) {
    case 'video/mp4':
    case 'video/quicktime':
    case 'audio/mp4':
      return isoBmff;
    case 'video/webm':
    case 'audio/webm':
      return ebml;
    case 'audio/ogg':
      return bytes.length >= 4 && ascii(0, 4) === 'OggS';
    default:
      return false;
  }
}
