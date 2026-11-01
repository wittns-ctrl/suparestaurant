import { IsOptional, IsString, MaxLength } from 'class-validator';
import { IsTrustedImageRef } from 'src/common/validators/trusted-image.validator';

export class CreateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  @IsTrustedImageRef({ allowDataImage: true, allowGoogleAvatar: true })
  imageurl?: string;
}
