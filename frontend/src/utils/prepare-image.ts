const MAX_EDGE = 2048;
const KEEP_BELOW_BYTES = 1.5 * 1024 * 1024;

/**
 * Shrinks a camera photo in the browser before it is uploaded. A 12 MP
 * phone photo is 3–8 MB; the server only ever serves 1600px variants, so
 * sending more than ~2000px wastes the seller's (slow, metered) data.
 * Falls back to the untouched file whenever anything goes wrong.
 */
export async function prepareImage(file: File): Promise<Blob> {
  try {
    if (typeof createImageBitmap !== 'function') return file;
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const longest = Math.max(bitmap.width, bitmap.height);
    if (longest <= MAX_EDGE && file.size <= KEEP_BELOW_BYTES) {
      bitmap.close();
      return file;
    }
    const scale = Math.min(1, MAX_EDGE / longest);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.fillStyle = '#fff'; // JPEG has no transparency
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85),
    );
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}
