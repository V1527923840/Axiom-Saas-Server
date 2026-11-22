import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { IntelligenceModule } from '../intelligence/intelligence.module';
import { ResearchModule } from '../research/research.module';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { McpAuthGuard } from './mcp-auth.guard';
import { McpRateLimiterService } from './mcp-rate-limiter.service';
import { McpAuditService } from './mcp-audit.service';

/**
 * MCP (Model Context Protocol) module.
 *
 * Exposes the intelligence and research-analysis data as MCP tools over
 * the Streamable HTTP transport, so MCP clients (WorkBuddy / CodeBuddy)
 * can query them with natural language.
 */
@Module({
  imports: [
    // IntelligenceModule / ResearchModule export their services, which the
    // MCP tools call directly instead of re-querying the database.
    IntelligenceModule,
    ResearchModule,
    // Needed by McpAuthGuard to verify a JWT credential.
    JwtModule.register({}),
  ],
  controllers: [McpController],
  providers: [
    McpService,
    McpAuthGuard,
    // Per-caller rate limiting + global concurrency cap.
    McpRateLimiterService,
    // Structured audit trail for tool calls.
    McpAuditService,
  ],
  exports: [McpService, McpRateLimiterService, McpAuditService],
})
export class McpModule {}
