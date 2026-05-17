/**
 * Resize a user-selected image client-side before upload.
 *
 * - Uses createImageBitmap + Canvas for one fast trip (no decoder->encoder
 *   double round on the main thread).
 * - Preserves PNG transparency when the input is PNG; everything else is
 *   re-encoded as JPEG at quality 0.9 for upload size sanity.
 * - Returns the input file unchanged if the environment lacks the
 *   primitives (older Safari, prerender).
 */
export async function resizeImage(file: File, maxEdgePx: number): Promise<Blob> {
  if (typeof createImageBitmap === "undefined") return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdgePx / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  return new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob ?? file),
      file.type === "image/png" ? "image/png" : "image/jpeg",
      0.9
    );
  });
}
