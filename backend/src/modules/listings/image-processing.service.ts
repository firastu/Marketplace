import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import sharp from "sharp";
import { join, posix } from "path";
import { unlink, mkdir, writeFile } from "fs/promises";
import { ListingImage } from "./listing-image.entity";
import { UPLOAD_DIR } from "../../common/image-upload.utils";

const VARIANTS = {
  thumb: { width: 320, quality: 80 },
  medium: { width: 900, quality: 85 },
  large: { width: 1600, quality: 90 },
} as const;

/** Detected format → file extension. Anything else is rejected. */
const ALLOWED_FORMATS: Record<string, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
};

/** Guard against decompression bombs (e.g. a tiny PNG claiming 50k×50k). */
const MAX_INPUT_PIXELS = 40_000_000;

export interface DetectedImage {
  format: string;
  extension: string;
  width: number;
  height: number;
}

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);

  constructor(
    @InjectRepository(ListingImage)
    private readonly imageRepo: Repository<ListingImage>,
  ) {}

  /**
   * Decodes the header of the uploaded bytes. The client-declared MIME type
   * and filename are never trusted for the stored file's type or name.
   */
  async detectFormat(buffer: Buffer): Promise<DetectedImage> {
    let meta: sharp.Metadata;
    try {
      meta = await sharp(buffer, {
        limitInputPixels: MAX_INPUT_PIXELS,
      }).metadata();
    } catch {
      throw new BadRequestException(
        "File is not a valid image. Upload a JPEG, PNG or WebP image.",
      );
    }
    const extension = meta.format ? ALLOWED_FORMATS[meta.format] : undefined;
    if (!extension || !meta.width || !meta.height) {
      throw new BadRequestException(
        `Unsupported image format${meta.format ? ` (${meta.format})` : ""}. Upload a JPEG, PNG or WebP image.`,
      );
    }
    if (meta.width * meta.height > MAX_INPUT_PIXELS) {
      throw new BadRequestException("Image dimensions are too large");
    }
    return {
      format: meta.format!,
      extension,
      width: meta.width,
      height: meta.height,
    };
  }

  /**
   * Writes the original (kept private, see main.ts) and the public WebP
   * variants. Variants are re-encoded by sharp, which drops EXIF metadata,
   * so a phone photo's GPS position is never published.
   */
  async processImage(
    imageId: string,
    buffer: Buffer,
    detected: DetectedImage,
  ): Promise<ListingImage> {
    const image = await this.imageRepo.findOne({ where: { id: imageId } });
    if (!image) throw new NotFoundException("Image not found");

    const listingDir = join(UPLOAD_DIR, image.listingId);
    // Storage keys are URL paths, so always use forward slashes.
    const storageKeyOriginal = posix.join(
      image.listingId,
      "original",
      `${imageId}.${detected.extension}`,
    );

    try {
      await mkdir(join(listingDir, "original"), { recursive: true });
      await writeFile(join(UPLOAD_DIR, storageKeyOriginal), buffer);
      // Record the original immediately so cleanup can find it on failure.
      await this.imageRepo.update(imageId, { storageKeyOriginal });

      const rotated = await sharp(buffer, {
        limitInputPixels: MAX_INPUT_PIXELS,
      })
        .rotate()
        .toBuffer();

      const storageKeys: Record<string, string> = {};
      for (const [variant, config] of Object.entries(VARIANTS)) {
        await mkdir(join(listingDir, variant), { recursive: true });
        const storageKey = posix.join(
          image.listingId,
          variant,
          `${imageId}.webp`,
        );
        await sharp(rotated)
          .resize(config.width, undefined, {
            withoutEnlargement: true,
            fit: "inside",
          })
          .webp({ quality: config.quality })
          .toFile(join(UPLOAD_DIR, storageKey));
        storageKeys[variant] = storageKey;
      }

      await this.imageRepo.update(imageId, {
        status: "ready",
        url: `/uploads/listings/${storageKeys.medium}`,
        width: detected.width,
        height: detected.height,
        mimeType: `image/${detected.format}`,
        fileSizeBytes: buffer.length,
        storageKeyThumb: storageKeys.thumb,
        storageKeyMedium: storageKeys.medium,
        storageKeyLarge: storageKeys.large,
      });

      this.logger.log(
        `Processed image ${imageId} for listing ${image.listingId}`,
      );
      return this.imageRepo.findOneOrFail({ where: { id: imageId } });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await this.imageRepo.update(imageId, {
        status: "failed",
        processingError: message,
      });
      this.logger.error(`Failed to process image ${imageId}: ${message}`);
      throw err;
    }
  }

  async deleteImageFiles(image: ListingImage): Promise<void> {
    const keys = [
      image.storageKeyOriginal,
      image.storageKeyThumb,
      image.storageKeyMedium,
      image.storageKeyLarge,
    ];

    await Promise.all(
      keys.filter(Boolean).map(async (key) => {
        try {
          await unlink(join(UPLOAD_DIR, key));
        } catch {
          // file may not exist — ok
        }
      }),
    );
  }
}
