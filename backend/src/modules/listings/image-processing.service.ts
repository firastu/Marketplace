import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import sharp from "sharp";
import { join, extname } from "path";
import { unlink, mkdir, rename } from "fs/promises";
import { existsSync } from "fs";
import { ListingImage } from "./listing-image.entity";
import { UPLOAD_DIR } from "../../common/image-upload.utils";

const VARIANTS = {
  thumb: { width: 320, quality: 80 },
  medium: { width: 900, quality: 85 },
  large: { width: 1600, quality: 90 },
} as const;

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);

  constructor(
    @InjectRepository(ListingImage)
    private readonly imageRepo: Repository<ListingImage>,
  ) {}

  async processImage(imageId: string): Promise<ListingImage> {
    const image = await this.imageRepo.findOne({ where: { id: imageId } });
    if (!image) throw new NotFoundException("Image not found");

    const rawPath = image.url.replace(/^\/uploads\/listings\//, "");
    const originalPath = join(UPLOAD_DIR, rawPath);

    this.logger.debug(
      `Looking for image at: ${originalPath}, exists=${existsSync(originalPath)}`,
    );

    if (!existsSync(originalPath)) {
      await this.imageRepo.update(imageId, {
        status: "failed",
        processingError: `Original file not found: ${originalPath}`,
      });
      throw new NotFoundException("Original image file not found");
    }

    const listingDir = join(UPLOAD_DIR, image.listingId);
    await mkdir(join(listingDir, "original"), { recursive: true });

    const ext = extname(originalPath);
    const originalDest = join(listingDir, "original", `${imageId}${ext}`);
    await rename(originalPath, originalDest);

    const storageKeyOriginal = join(
      image.listingId,
      "original",
      `${imageId}${ext}`,
    );

    const storageKeys: Partial<
      Record<"storageKeyThumb" | "storageKeyMedium" | "storageKeyLarge", string>
    > = {};

    try {
      const metadata = await sharp(originalDest).metadata();
      const inputBuffer = await sharp(originalDest).rotate().toBuffer();

      for (const [variant, config] of Object.entries(VARIANTS)) {
        const variantDir = join(listingDir, variant);
        await mkdir(variantDir, { recursive: true });

        const outName = `${imageId}.webp`;
        const outPath = join(variantDir, outName);
        const storageKey = join(image.listingId, variant, outName);

        await sharp(inputBuffer)
          .resize(config.width, undefined, {
            withoutEnlargement: true,
            fit: "inside",
          })
          .webp({ quality: config.quality })
          .toFile(outPath);

        if (variant === "thumb") storageKeys.storageKeyThumb = storageKey;
        if (variant === "medium") storageKeys.storageKeyMedium = storageKey;
        if (variant === "large") storageKeys.storageKeyLarge = storageKey;
      }

      await this.imageRepo.update(imageId, {
        status: "ready",
        width: metadata.width,
        height: metadata.height,
        mimeType: metadata.format,
        storageKeyOriginal,
        ...storageKeys,
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
    const variants = [
      image.storageKeyOriginal,
      image.storageKeyThumb,
      image.storageKeyMedium,
      image.storageKeyLarge,
    ];

    await Promise.all(
      variants.filter(Boolean).map(async (key) => {
        const filePath = join(UPLOAD_DIR, key);
        try {
          await unlink(filePath);
        } catch {
          // file may not exist — ok
        }
      }),
    );
  }

  buildImageUrls(image: ListingImage): {
    original: string;
    thumb: string;
    medium: string;
    large: string;
  } {
    const base = "/uploads/listings";
    return {
      original: image.storageKeyOriginal
        ? `${base}/${image.storageKeyOriginal}`
        : image.url,
      thumb: image.storageKeyThumb
        ? `${base}/${image.storageKeyThumb}`
        : image.url,
      medium: image.storageKeyMedium
        ? `${base}/${image.storageKeyMedium}`
        : image.url,
      large: image.storageKeyLarge
        ? `${base}/${image.storageKeyLarge}`
        : image.url,
    };
  }
}
