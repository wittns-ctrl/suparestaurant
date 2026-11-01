import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsTrustedImageRef } from 'src/common/validators/trusted-image.validator';

export class AddImagesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  // Only images uploaded through SupaMeal (our Cloudinary account or /uploads)
  @IsTrustedImageRef({}, { each: true })
  images!: string[];
}
