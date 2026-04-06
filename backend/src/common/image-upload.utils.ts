import { diskStorage } from "multer";
import { extname, join } from "path";
import { v4 as uuid } from "uuid";
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

export const ALLOWED_MIME_TYPES = /^image\/(jpeg|png|webp)$/;

export const imageDiskStorage = diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    cb(null, `${uuid()}${ext}`);
  },
});

export class ImageFileValidator extends FileValidator<Record<string, unknown>> {
  constructor() {
    super({});
  }

  async isValid(file: Express.Multer.File): Promise<boolean> {
    if (!file?.mimetype) return false;
    if (!ALLOWED_MIME_TYPES.test(file.mimetype)) return false;
    if (!file.buffer) return true;
    try {
      const { fileTypeFromBuffer } = await import("file-type");
      const detected = await fileTypeFromBuffer(file.buffer);
      if (detected) {
        return ALLOWED_MIME_TYPES.test(detected.mime);
      }
    } catch {
      // file-type detection failed — trust browser MIME type
    }
    return true;
  }

  buildErrorMessage(file: Express.Multer.File): string {
    return `Validation failed (current file type is ${file.mimetype}, expected type is ${ALLOWED_MIME_TYPES})`;
  }
}
