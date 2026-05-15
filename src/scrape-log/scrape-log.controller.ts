import {
  Controller,
  Get,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiParam } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../roles/roles.guard';
import { infinityPagination } from '../utils/infinity-pagination';
import { PaginatedApiResponseDto } from '../utils/dto/infinity-pagination-response.dto';
import { NullableType } from '../utils/types/nullable.type';
import { ScrapeLog } from './domain/scrape-log';
import { ScrapeLogService } from './scrape-log.service';

@ApiBearerAuth()
@Roles(RoleEnum.admin)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('ScrapeLog')
@Controller({
  path: 'scrape-log',
  version: '1',
})
export class ScrapeLogController {
  constructor(private readonly scrapeLogService: ScrapeLogService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedApiResponseDto<ScrapeLog>> {
    const pageNum = page ?? 1;
    let limitNum = limit ?? 10;
    if (limitNum > 100) {
      limitNum = 100;
    }

    const result = await this.scrapeLogService.findAllWithPagination({
      paginationOptions: {
        page: pageNum,
        limit: limitNum,
      },
    });

    return infinityPagination(
      result.data,
      { page: pageNum, limit: limitNum },
      result.total,
    ) as PaginatedApiResponseDto<ScrapeLog>;
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id') id: ScrapeLog['id']): Promise<NullableType<ScrapeLog>> {
    return this.scrapeLogService.findById(id);
  }
}
