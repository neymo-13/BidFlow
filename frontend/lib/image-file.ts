// Client-side checks for auction images (same limits as the API).
// UX only: the backend checks the real file content (magic bytes) again.

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_MAX_COUNT = 5;
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

// Only what the checks need, so tests can pass plain objects instead of File
export interface ImageFileLike {
  name: string;
  type: string;
  size: number;
}

// null = OK, otherwise a message for the user
export function validateImageFile(file: ImageFileLike): string | null {
  const name = file.name.toLowerCase();
  // Some browsers leave type empty — fall back to the extension
  const typeOk = file.type
    ? ALLOWED_TYPES.includes(file.type)
    : ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));

  if (!typeOk) return `${file.name}: only JPG, PNG or WebP images are allowed`;
  if (file.size === 0) return `${file.name}: the file is empty`;
  if (file.size > IMAGE_MAX_BYTES) return `${file.name}: must be 5 MB or smaller`;
  return null;
}

// Splits newly picked files into ones to keep and error messages,
// respecting the 5-image limit together with the images already attached
export function pickImageFiles<T extends ImageFileLike>(
  existingCount: number,
  files: T[]
): { accepted: T[]; errors: string[] } {
  const accepted: T[] = [];
  const errors: string[] = [];
  let skippedForLimit = 0;

  for (const file of files) {
    const error = validateImageFile(file);
    if (error) {
      errors.push(error);
    } else if (existingCount + accepted.length >= IMAGE_MAX_COUNT) {
      skippedForLimit++;
    } else {
      accepted.push(file);
    }
  }

  if (skippedForLimit > 0) {
    errors.push(
      `Up to ${IMAGE_MAX_COUNT} images per auction — ${skippedForLimit} ${skippedForLimit === 1 ? "file was" : "files were"} not added`
    );
  }
  return { accepted, errors };
}
