import { Module } from '@nestjs/common';
import { MarketQuoteController } from './market-quote.controller';
import { MarketQuoteService } from './market-quote.service';

@Module({
  controllers: [MarketQuoteController],
  providers: [MarketQuoteService],
  exports: [MarketQuoteService],
})
export class MarketQuoteModule {}
