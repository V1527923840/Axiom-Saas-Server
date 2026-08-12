import { DailySummary } from '../../../../domain/daily-summary';
import { DailySummaryEntity } from '../entities/daily-summary.entity';

/**
 * 只提供 `toDomain`：daily_summary 表由 Agent 侧管线写入，SaaS 端只读消费，
 * 没有任何写路径需要 `toPersistence`。等真的出现写需求时再补，避免死代码。
 */
export class DailySummaryMapper {
  static toDomain(raw: DailySummaryEntity): DailySummary {
    const domainEntity = new DailySummary();
    domainEntity.reportId = raw.reportId;
    domainEntity.frequency = raw.frequency;
    domainEntity.reportDate = raw.reportDate;
    domainEntity.weekStart = raw.weekStart ?? null;
    domainEntity.dataWindowStart = raw.dataWindowStart;
    domainEntity.dataWindowEnd = raw.dataWindowEnd;
    domainEntity.sections = raw.sections;
    domainEntity.sourcePostIds = raw.sourcePostIds ?? [];
    domainEntity.sourceResearchIds = raw.sourceResearchIds ?? [];
    domainEntity.sourcePostCount = raw.sourcePostCount;
    domainEntity.sourceResearchCount = raw.sourceResearchCount;
    domainEntity.completenessRatio = raw.completenessRatio;
    domainEntity.hasDataWarning = raw.hasDataWarning;
    domainEntity.triggerReason = raw.triggerReason;
    domainEntity.buildPromptVersion = raw.buildPromptVersion;
    domainEntity.buildModel = raw.buildModel;
    domainEntity.hasTopics = raw.hasTopics;
    domainEntity.topics = raw.topics ?? [];
    domainEntity.briefSummaryMd = raw.briefSummaryMd ?? null;
    domainEntity.generatedAt = raw.generatedAt;
    domainEntity.lastDataCheckAt = raw.lastDataCheckAt;
    return domainEntity;
  }
}
