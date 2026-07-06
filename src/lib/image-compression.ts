/**
 * Client-side image compression, run just before upload.
 *
 * Goals (per product requirement): keep every uploaded image under ~1 MB and
 * cap its longest edge at a sane maximum, doing the work in the browser so the
 * network transfer and stored object are both small.
 *
 * Behaviour:
 *  - Only raster formats we can safely re-encode via <canvas> are touched
 *    (jpeg/png/webp). Animated GIFs, SVGs, HEIC, videos, PDFs and any
 *    non-image pass through UNCHANGED (canvas would flatten/garble them).
 *  - Downscale-only: the longest edge is capped at MAX_DIMENSION; images
 *    already smaller are never upscaled.
 *  - Quality, then dimensions, are stepped down until the encoded blob fits
 *    TARGET_BYTES.
 *  - If we can't beat the original size (already tiny), the ORIGINAL file is
 *    returned — we never hand back something larger.
 *  - Any decode/encode failure falls back to the original file, so this can
 *    never block an upload.
 */

const TARGET_BYTES = 1024 * 1024 // ~1 MB
const MAX_DIMENSION = 2560 // px, longest edge
const QUALITY_STEPS = [0.85, 0.72, 0.6, 0.48, 0.38]
const MIN_SCALE = 0.4 // don't shrink below 40% of the (already capped) size

// Formats we can re-encode. Deliberately excludes image/gif (animation) and
// image/svg+xml (vector) — those pass through untouched.
const COMPRESSIBLE = new Set(["image/jpeg", "image/png", "image/webp"])

/** Prefer WebP (better ratio + alpha); fall back to JPEG where unsupported. */
function pickOutputType(): "image/webp" | "image/jpeg" {
  try {
    const c = document.createElement("canvas")
    c.width = c.height = 1
    if (c.toDataURL("image/webp").startsWith("data:image/webp")) return "image/webp"
  } catch {
    /* ignore — fall through to jpeg */
  }
  return "image/jpeg"
}

function extFor(type: string): string {
  return type === "image/webp" ? "webp" : "jpg"
}

function renamed(name: string, ext: string): string {
  return `${name.replace(/\.[^./\\]+$/, "")}.${ext}`
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality))
}

function finalize(original: File, blob: Blob | null, outType: string): File {
  // Never return something bigger than we started with.
  if (!blob || blob.size >= original.size) return original
  return new File([blob], renamed(original.name, extFor(outType)), {
    type: outType,
    lastModified: Date.now(),
  })
}

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || !COMPRESSIBLE.has(file.type)) return file
  if (typeof document === "undefined" || typeof createImageBitmap === "undefined") return file

  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions)

    const outType = pickOutputType()
    const needsWhiteBg = outType === "image/jpeg" // JPEG has no alpha channel
    const { width: srcW, height: srcH } = bitmap

    // Downscale factor to fit MAX_DIMENSION (never upscale).
    const capScale = Math.min(1, MAX_DIMENSION / Math.max(srcW, srcH))

    let best: Blob | null = null
    for (let scale = capScale; scale >= capScale * MIN_SCALE; scale *= 0.8) {
      const w = Math.max(1, Math.round(srcW * scale))
      const h = Math.max(1, Math.round(srcH * scale))

      const canvas = document.createElement("canvas")
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext("2d")
      if (!ctx) return file
      if (needsWhiteBg) {
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, w, h)
      }
      ctx.drawImage(bitmap, 0, 0, w, h)

      // Highest quality first: the first blob that fits is the best-looking fit.
      for (const q of QUALITY_STEPS) {
        const blob = await canvasToBlob(canvas, outType, q)
        if (!blob) continue
        if (!best || blob.size < best.size) best = blob
        if (blob.size <= TARGET_BYTES) return finalize(file, blob, outType)
      }
    }

    // Nothing hit the target (very dense image) — return the smallest we made.
    return finalize(file, best, outType)
  } catch {
    return file
  } finally {
    bitmap?.close?.()
  }
}
