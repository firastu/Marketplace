import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { ListingsModule } from '../listings/listings.module';

@Module({
  imports: [ListingsModule],
  controllers: [UploadsController],
})
export class UploadsModule {}
