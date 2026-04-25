import { IsInt, Min } from 'class-validator';

export class CreateVideoSummaryDto {
  @IsInt()
  @Min(1)
  videoId!: number;
}
