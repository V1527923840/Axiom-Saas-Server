import {
  Controller,
  Get,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IntelligenceService } from './intelligence.service';
import { QueryIntelligenceDto } from './dto/query-intelligence.dto';
import { Intelligence, IntelligenceListItem } from './domain/intelligence';

@ApiTags('Intelligence')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'intelligence',
  version: '1',
})
export class IntelligenceController {
  constructor(private readonly intelligenceService: IntelligenceService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get intelligence list' })
  async getIntelligenceList(@Query() query: QueryIntelligenceDto): Promise<{
    data: IntelligenceListItem[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const pageNum = query.page ?? 1;
    const pageSizeNum = query.pageSize ?? 10;

    const result = await this.intelligenceService.getIntelligenceList({
      ...query,
      page: pageNum,
      pageSize: pageSizeNum,
    });

    return {
      data: result.data,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get intelligence detail by id' })
  async getIntelligenceDetail(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: Intelligence }> {
    const intelligence =
      await this.intelligenceService.getIntelligenceDetail(id);
    if (!intelligence) {
      throw new NotFoundException({
        status: 404,
        errors: {
          intelligence: 'Intelligence not found',
        },
      });
    }
    return intelligence;
  }
}
