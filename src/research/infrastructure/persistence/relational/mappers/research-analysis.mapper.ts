import { ResearchAnalysisEntity } from '../entities/research-analysis.entity';
import { ResearchAnalysis } from '../../../../domain/research';

export class ResearchAnalysisMapper {
  static toDomain(entity: ResearchAnalysisEntity): ResearchAnalysis {
    return {
      id: entity.id,
      version: entity.version,
      documentName: entity.documentName,
      docType: entity.docType,
      sourceFileKey: entity.sourceFileKey,
      ossUrl: entity.ossUrl,
      localPath: entity.localPath,
      scrapeLogId: entity.scrapeLogId,
      categoryL1: entity.categoryL1,
      categoryL2: entity.categoryL2,
      swIndustryTag: entity.swIndustryTag,
      mentionedStocks: entity.mentionedStocks,
      keyThesis: entity.keyThesis,
      analysisVersion: entity.analysisVersion,
      rawFacts: entity.rawFacts,
      inductionGroups: entity.inductionGroups,
      baseView: entity.baseView,
      midView: entity.midView,
      coreView: entity.coreView,
      pyramidJudgement: entity.pyramidJudgement,
      pyramidVersion: entity.pyramidVersion,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  // No `toPersistence`: research_analysis is owned by the Agent pipeline
  // and never written from the SaaS side. This mirrors the read-only
  // stance of `DailySummaryMapper` (see daily-summary.mapper.ts:4-7).
}
