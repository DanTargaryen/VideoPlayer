import { Controller, Get, Query } from '@nestjs/common';

import { ok } from '../../common/dto/api-response.dto';
import { SearchService } from './search.service';

@Controller()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('feeds/recommend')
  async getRecommendFeed() {
    return ok(await this.searchService.getRecommendFeed());
  }

  @Get('search/all')
  async search(@Query('keyword') keyword = '') {
    return ok(await this.searchService.search(keyword));
  }
}
