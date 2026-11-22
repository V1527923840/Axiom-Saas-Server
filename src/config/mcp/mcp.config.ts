import { registerAs } from '@nestjs/config';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { McpConfig } from './mcp-config.type';

class EnvironmentVariablesValidator {
  @IsOptional()
  @IsString()
  MCP_ENABLED: string;

  @IsOptional()
  @IsString()
  MCP_API_KEY: string;

  @IsOptional()
  @IsString()
  MCP_PATH: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  MCP_MAX_PAGE_SIZE: number;

  @IsOptional()
  @IsInt()
  @Min(1000)
  MCP_MAX_ORIGINAL_TEXT_LENGTH: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  MCP_RATE_LIMIT_RPS: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  MCP_RATE_LIMIT_BURST: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  MCP_MAX_CONCURRENCY: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  MCP_MAX_FILTER_LENGTH: number;
}

export default registerAs<McpConfig>('mcp', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    // ★ 默认关闭。必须显式设 MCP_ENABLED=true 才会暴露 MCP 端点。
    //   这样「升级后端」不会意外让一个新的对外端点上线 ——
    //   对已有前端调用的接口零影响,新端点按需显式开启。
    enabled: process.env.MCP_ENABLED === 'true',
    apiKey: process.env.MCP_API_KEY,
    path: process.env.MCP_PATH || 'mcp',
    maxPageSize: process.env.MCP_MAX_PAGE_SIZE
      ? parseInt(process.env.MCP_MAX_PAGE_SIZE, 10)
      : 20,
    maxOriginalTextLength: process.env.MCP_MAX_ORIGINAL_TEXT_LENGTH
      ? parseInt(process.env.MCP_MAX_ORIGINAL_TEXT_LENGTH, 10)
      : 20000,
    // Per-caller sustained rate. Deliberately conservative: an MCP
    // client issues these calls on behalf of a human reading results,
    // so a handful per second is already generous.
    rateLimitRps: process.env.MCP_RATE_LIMIT_RPS
      ? parseInt(process.env.MCP_RATE_LIMIT_RPS, 10)
      : 5,
    rateLimitBurst: process.env.MCP_RATE_LIMIT_BURST
      ? parseInt(process.env.MCP_RATE_LIMIT_BURST, 10)
      : 10,
    // Bounds concurrent DB work regardless of request rate.
    maxConcurrency: process.env.MCP_MAX_CONCURRENCY
      ? parseInt(process.env.MCP_MAX_CONCURRENCY, 10)
      : 8,
    maxFilterLength: process.env.MCP_MAX_FILTER_LENGTH
      ? parseInt(process.env.MCP_MAX_FILTER_LENGTH, 10)
      : 100,
  };
});
