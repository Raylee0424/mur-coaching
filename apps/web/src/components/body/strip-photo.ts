import { fitWithin, PHOTO_QUALITY } from './body-model';

/**
 * Redraws the photo on a canvas and encodes a fresh JPEG. Canvas output carries no EXIF, GPS, XMP or comment
 * data, and the orientation tag is applied to the pixels first. The API re-checks the stored header.
 */
export async function stripToJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.drawImage(bitmap, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Encoding failed'))), 'image/jpeg', PHOTO_QUALITY),
    );
  } finally {
    bitmap.close();
  }
}
