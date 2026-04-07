import { Controller, Get, Param, Query } from '@nestjs/common';

import { ok } from '../../common/dto/api-response.dto';
import { SearchService } from './search.service';

@Controller()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('feeds/recommend')
  async getRecommendFeed(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('categoryCode') categoryCode?: string,
  ) {
    return ok(
      await this.searchService.getRecommendFeed({
        page: page !== undefined ? Number(page) : undefined,
        pageSize: pageSize !== undefined ? Number(pageSize) : undefined,
        categoryCode,
      }),
    );
  }

  @Get('feeds/categories/:code/videos')
  async getCategoryFeed(
    @Param('code') code: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return ok(
      await this.searchService.getRecommendFeed({
        page: page !== undefined ? Number(page) : undefined,
        pageSize: pageSize !== undefined ? Number(pageSize) : undefined,
        categoryCode: code,
      }),
    );
  }

  @Get('feeds/hot')
  async getHotFeed(@Query('targetType') targetType = 'VIDEO') {
    return ok(await this.searchService.getHotFeed(targetType));
  }

  @Get('search/all')
  async search(
    @Query('keyword') keyword = '',
    @Query('tab') tab?: 'video' | 'live' | 'user',
    @Query('sortBy') sortBy?: 'hot' | 'latest',
    @Query('category') categoryCode?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return ok(
      await this.searchService.search({
        keyword,
        tab,
        sortBy,
        categoryCode,
        page: page !== undefined ? Number(page) : undefined,
        pageSize: pageSize !== undefined ? Number(pageSize) : undefined,
      }),
    );
  }

  @Get('search/hotwords')
  async getHotwords() {
    return ok(await this.searchService.getHotwords());
  }
}
