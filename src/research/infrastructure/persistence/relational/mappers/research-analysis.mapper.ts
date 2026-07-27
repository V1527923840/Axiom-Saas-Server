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
      analyzedAt: entity.analyzedAt,
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

  static toPersistence(domain: ResearchAnalysis): ResearchAnalysisEntity {
    const entity = new ResearchAnalysisEntity();
    entity.id = domain.id;
    entity.version = domain.version;
    entity.documentName = domain.documentName;
    entity.docType = domain.docType;
    entity.sourceFileKey = domain.sourceFileKey;
    entity.ossUrl = domain.ossUrl;
    entity.localPath = domain.localPath;
    entity.scrapeLogId = domain.scrapeLogId;
    entity.analyzedAt = domain.analyzedAt;
    entity.categoryL1 = domain.categoryL1;
    entity.categoryL2 = domain.categoryL2;
    entity.swIndustryTag = domain.swIndustryTag;
    entity.mentionedStocks = domain.mentionedStocks;
    entity.keyThesis = domain.keyThesis;
    entity.analysisVersion = domain.analysisVersion;
    entity.rawFacts = domain.rawFacts;
    entity.inductionGroups = domain.inductionGroups;
    entity.baseView = domain.baseView;
    entity.midView = domain.midView;
    entity.coreView = domain.coreView;
    entity.pyramidJudgement = domain.pyramidJudgement;
    entity.pyramidVersion = domain.pyramidVersion;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }
}
