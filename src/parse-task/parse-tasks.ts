import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { MenuAccessGuard } from '../menus/menu-access.guard';
import { MenuPaths } from '../menus/menu-paths.decorator';
import { infinityPagination } from '../utils/infinity-pagination';
import { PaginatedApiResponseDto } from '../utils/dto/infinity-pagination-response.dto';
import { NullableType } from '../utils/types/nullable.type';
import { ParseTask } from './domain/parse-task';
import { ParseTaskService } from './parse-task.service';
import {
  CreateParseTaskDto,
  ParseTaskQueryDto,
  ExecuteParseTaskDto,
} from './dto/parse-task.dto';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), MenuAccessGuard)
@ApiTags('ParseTasks')
@Controller({
  path: 'parse/tasks',
  version: '1',
})
export class ParseTaskController {
  constructor(private readonly parseTaskService: ParseTaskService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @MenuPaths('/parse/tasks')
  async findAll(
    @Query() query: ParseTaskQueryDto,
  ): Promise<PaginatedApiResponseDto<ParseTask>> {
    const result = await this.parseTaskService.findAllWithPagination(query);

    return infinityPagination(
      result.data,
      { page: result.page, limit: result.limit },
      result.total,
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', type: String })
  async findOne(@Param('id') id: string): Promise<NullableType<ParseTask>> {
    return this.parseTaskService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateParseTaskDto): Promise<{
    success: boolean;
    data: { taskId: string; status: string; message: string };
  }> {
    const task = await this.parseTaskService.create(createDto);

    return {
      success: true,
      data: {
        taskId: task.id,
        status: task.status,
        message: 'Task created successfully',
      },
    };
  }

  @Post(':id/execute')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', type: String })
  async execute(
    @Param('id') id: string,
    @Body() executeDto: ExecuteParseTaskDto,
  ): Promise<{
    success: boolean;
    data: { taskId: string; status: string; agentJobId: string };
  }> {
    const task = await this.parseTaskService.execute(id, executeDto.parser);

    return {
      success: true,
      data: {
        taskId: task.id,
        status: task.status,
        agentJobId: 'placeholder-agent-job-id', // Would be replaced with actual agent job ID
      },
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', type: String })
  async delete(
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: null; message: string }> {
    await this.parseTaskService.delete(id);

    return {
      success: true,
      data: null,
      message: 'Task deleted successfully',
    };
  }
}
