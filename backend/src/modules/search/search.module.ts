import { Module } from '@nestjs/common';

import { LiveModule } from '../live/live.module';
import { VideoModule } from '../video/video.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [VideoModule, LiveModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
