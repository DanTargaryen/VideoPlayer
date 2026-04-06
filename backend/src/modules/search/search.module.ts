import { Module } from '@nestjs/common';

import { VideoModule } from '../video/video.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [VideoModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
