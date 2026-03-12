import {
  Controller,
  Post,
  Delete,
  Param,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuid } from 'uuid';
import { ListingsService } from '../listings/listings.service';
import { CurrentUser } from '../auth/current-user.decorator';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'listings');

@ApiTags('Uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Post('listings/:listingId')
  @ApiOperation({ summary: 'Upload an image for a listing' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `${uuid()}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    }),
  )
  async uploadImage(
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @CurrentUser('id') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Query('primary') primary?: string,
  ) {
    const url = `/uploads/listings/${file.filename}`;
    const isPrimary = primary === 'true';
    return this.listingsService.addImage(listingId, userId, url, isPrimary);
  }

  @Delete('images/:imageId')
  @ApiOperation({ summary: 'Delete a listing image' })
  async deleteImage(
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.listingsService.removeImage(imageId, userId);
    return { message: 'Image deleted' };
  }
}
