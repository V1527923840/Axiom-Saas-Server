import { IntelligenceClassificationEntity } from '../entities/intelligence-classification.entity';
import { Intelligence } from '../../../../domain/intelligence';

export class IntelligenceClassificationMapper {
  static toDomain(entity: IntelligenceClassificationEntity): Intelligence {
    return {
      id: entity.id,
      scrapeLogId: entity.scrapeLogId,
      sourceFileKey: entity.sourceFileKey,
      version: entity.version,
      postDate: entity.postDate,
      categoryL1: entity.categoryL1,
      categoryL2: entity.categoryL2,
      summary: entity.summary,
      title: entity.title,
      originalText: entity.originalText,
      originalTextRaw: entity.originalTextRaw,
      imageUrls: entity.imageUrls ?? [],
      author: entity.author,
      groupName: entity.groupName,
      swIndustryTag: entity.swIndustryTag,
      stockMapping: entity.stockMapping,
      expectationGap: entity.expectationGap,
      classificationMethod: entity.classificationMethod,
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

  static toPersistence(domain: Intelligence): IntelligenceClassificationEntity {
    const entity = new IntelligenceClassificationEntity();
    entity.id = domain.id;
    entity.scrapeLogId = domain.scrapeLogId;
    entity.sourceFileKey = domain.sourceFileKey;
    entity.version = domain.version;
    entity.postDate = domain.postDate;
    entity.categoryL1 = domain.categoryL1;
    entity.categoryL2 = domain.categoryL2;
    entity.summary = domain.summary;
    entity.title = domain.title;
    entity.originalText = domain.originalText;
    entity.originalTextRaw = domain.originalTextRaw;
    entity.imageUrls = domain.imageUrls ?? [];
    entity.author = domain.author;
    entity.groupName = domain.groupName;
    entity.swIndustryTag = domain.swIndustryTag;
    entity.stockMapping = domain.stockMapping;
    entity.expectationGap = domain.expectationGap;
    entity.classificationMethod = domain.classificationMethod;
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
