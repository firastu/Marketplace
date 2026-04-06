import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Listing } from "./listing.entity";
import { ListingImage } from "./listing-image.entity";
import { ImageJob } from "./image-job.entity";
import { ListingsService } from "./listings.service";
import { ImageProcessingService } from "./image-processing.service";
import { ListingsController } from "./listings.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Listing, ListingImage, ImageJob])],
  controllers: [ListingsController],
  providers: [ListingsService, ImageProcessingService],
  exports: [ListingsService, ImageProcessingService],
})
export class ListingsModule {}
