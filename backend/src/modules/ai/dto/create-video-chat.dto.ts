import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateVideoChatDto {
  @IsInt()
  @Min(1)
  videoId!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  prompt!: string;
}
