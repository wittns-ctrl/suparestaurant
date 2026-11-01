import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// Only removes a value from the owner's own gallery, so any string that was
// stored (including older ones) may be named — but it must be a string, not a
// Mongo query object such as {"$regex": ".*"}.
export class RemoveImageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  imageUrl!: string;
}
