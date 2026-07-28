// src/industry-chain/industry-chain.controller.ts
import {
  Controller,
  Get,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { MenuAccessGuard } from '../menus/menu-access.guard';
import { MenuPaths } from '../menus/menu-paths.decorator';
import { infinityPagination } from '../utils/infinity-pagination';
import { PaginatedApiResponseDto } from '../utils/dto/infinity-pagination-response.dto';
import {
  ChainItem,
  L1Item,
  L2Item,
  VersionItem,
} from './domain/industry-chain';
import { IndustryChainService } from './industry-chain.service';
import { QueryL1Dto } from './dto/query-l1.dto';
import { QueryL2Dto } from './dto/query-l2.dto';
import { QueryChainsDto } from './dto/query-chains.dto';
import { QueryVersionsDto } from './dto/query-versions.dto';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), MenuAccessGuard)
@ApiTags('IndustryChain')
@MenuPaths('/content/industry-chains')
@Controller({
  path: 'industry-chains',
  version: '1',
})
export class IndustryChainController {
  constructor(private readonly industryChainService: IndustryChainService) {}

  @Get('l1')
  @HttpCode(HttpStatus.OK)
  async findL1(
    @Query() query: QueryL1Dto,
  ): Promise<PaginatedApiResponseDto<L1Item>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const result = await this.industryChainService.findL1List({
      paginationOptions: { page, limit: pageSize },
    });
    return infinityPagination(
      result.data,
      { page, limit: pageSize },
      result.total,
    );
  }

  @Get('l2')
  @HttpCode(HttpStatus.OK)
  async findL2(
    @Query() query: QueryL2Dto,
  ): Promise<PaginatedApiResponseDto<L2Item>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const result = await this.industryChainService.findL2List(query.l1, {
      paginationOptions: { page, limit: pageSize },
    });
    return infinityPagination(
      result.data,
      { page, limit: pageSize },
      result.total,
    );
  }

  @Get('chains')
  @HttpCode(HttpStatus.OK)
  async findChains(
    @Query() query: QueryChainsDto,
  ): Promise<PaginatedApiResponseDto<ChainItem>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const result = await this.industryChainService.findChains(query.l2, {
      paginationOptions: { page, limit: pageSize },
    });
    return infinityPagination(
      result.data,
      { page, limit: pageSize },
      result.total,
    );
  }

  @Get('versions')
  @HttpCode(HttpStatus.OK)
  async findVersions(
    @Query() query: QueryVersionsDto,
  ): Promise<PaginatedApiResponseDto<VersionItem>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const result = await this.industryChainService.findVersions(query.chain, {
      paginationOptions: { page, limit: pageSize },
    });
    return infinityPagination(
      result.data,
      { page, limit: pageSize },
      result.total,
    );
  }
}
