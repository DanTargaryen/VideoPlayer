import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { VideoModule } from '../video/video.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [AuthModule, VideoModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
