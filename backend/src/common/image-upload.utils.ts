import { memoryStorage } from "multer";
import { join } from "path";
import { FileValidator } from "@nestjs/common";
import * as fs from "fs";

const envUploadDir = (() => {
  const raw = process.env.UPLOAD_DIR || "./uploads";
  try {
    return fs.realpathSync(raw);
  } catch {
    return join(process.cwd(), raw.replace(/^\.\//, ""));
  }
})();

export const UPLOAD_DIR = join(envUploadDir, "listings");
export const UPLOADS_DIR = envUploadDir;

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_MIME_TYPES = /^image\/(jpeg|png|webp)$/;

/**
 * Uploads are kept in memory (capped at MAX_IMAGE_BYTES by multer) and only
 * written to disk after the listing owner is verified and sharp has
 * confirmed the bytes really are an image. With disk storage a rejected or
 * unauthorised upload used to leave its file behind, already publicly
 * served under the client-supplied extension.
 */
export const imageMemoryStorage = memoryStorage();

export const imageUploadOptions = {
  storage: imageMemoryStorage,
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
};

/**
 * Cheap first filter on the declared MIME type. The authoritative check is
 * ImageProcessingService.detectFormat(), which decodes the actual bytes.
 */
export class ImageFileValidator extends FileValidator<Record<string, unknown>> {
  constructor() {
    super({});
  }

  isValid(file?: Express.Multer.File): boolean {
    return !!file?.mimetype && ALLOWED_MIME_TYPES.test(file.mimetype);
  }

  buildErrorMessage(file: Express.Multer.File): string {
    return `Unsupported file type ${file?.mimetype ?? "unknown"}; upload a JPEG, PNG or WebP image`;
  }
}
