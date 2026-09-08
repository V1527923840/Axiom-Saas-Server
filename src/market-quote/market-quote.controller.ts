import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MarketQuoteService, DailyQuoteResponse } from './market-quote.service';
import { GetDailyQuoteDto } from './dto/get-daily-quote.dto';

// Minimal User shape required by this controller — avoids loading the
// full User class which transitively triggers databaseConfig() at
// import time. Keep aligned with src/users/domain/user.ts.
interface CurrentUserShape {
  id: number | string;
}

@ApiTags('Market Quote')
@ApiBearerAuth()
@Controller({
  path: 'market/quote',
  version: '1',
})
export class MarketQuoteController {
  constructor(private readonly service: MarketQuoteService) {}

  @Get('daily')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Get daily OHLCV for an A-share stock (proxied to AxiomVibeTrading)',
  })
  async getDaily(
    @Query() query: GetDailyQuoteDto,
    @CurrentUser() user: CurrentUserShape,
  ): Promise<{ data: DailyQuoteResponse }> {
    const result = await this.service.proxyDailyQuote(query, user.id);
    return { data: result };
  }
}