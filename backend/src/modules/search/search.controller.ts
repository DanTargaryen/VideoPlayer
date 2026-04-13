import { Controller, Get, Headers, Param, Query } from '@nestjs/common';

import { ok } from '../../common/dto/api-response.dto';
import { AuthService } from '../auth/auth.service';
import { SearchService } from './search.service';

@Controller()
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly authService: AuthService,
  ) {}

  @Get('feeds/recommend')
  async getRecommendFeed(
    @Headers('authorization') authorization: string | undefined,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('categoryCode') categoryCode?: string,
  ) {
    const user = await this.authService.getCurrentUser(authorization);
    return ok(
      await this.searchService.getRecommendFeed({
        currentUserId: user?.id,
        page: page !== undefined ? Number(page) : undefined,
        pageSize: pageSize !== undefined ? Number(pageSize) : undefined,
        categoryCode,
      }),
    );
  }

  @Get('feeds/categories/:code/videos')
  async getCategoryFeed(
    @Headers('authorization') authorization: string | undefined,
    @Param('code') code: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const user = await this.authService.getCurrentUser(authorization);
    return ok(
      await this.searchService.getRecommendFeed({
        currentUserId: user?.id,
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
    @Headers('authorization') authorization: string | undefined,
    @Query('keyword') keyword = '',
    @Query('tab') tab?: 'video' | 'live' | 'user',
    @Query('sortBy') sortBy?: 'best' | 'hot' | 'latest',
    @Query('category') categoryCode?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const user = await this.authService.getCurrentUser(authorization);
    return ok(
      await this.searchService.search({
        currentUserId: user?.id,
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

  @Get('search/suggest')
  async getSuggestions(@Query('keyword') keyword = '') {
    return ok(await this.searchService.suggest(keyword));
  }
}
