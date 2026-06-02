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
      author: entity.author,
      groupName: entity.groupName,
      likeCount: entity.likeCount,
      commentCount: entity.commentCount,
      sourceCredibility: entity.sourceCredibility,
      timelinessScore: entity.timelinessScore,
      dataDensity: entity.dataDensity,
      differentiationScore: entity.differentiationScore,
      actionability: entity.actionability,
      riskDisclosure: entity.riskDisclosure,
      confidenceFactor: entity.confidenceFactor,
      totalScore: entity.totalScore,
      valueRating: entity.valueRating,
      swIndustryTag: entity.swIndustryTag,
      stockMapping: entity.stockMapping,
      expectationGap: entity.expectationGap,
      summaryPoints: entity.summaryPoints,
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
    entity.author = domain.author;
    entity.groupName = domain.groupName;
    entity.likeCount = domain.likeCount;
    entity.commentCount = domain.commentCount;
    entity.sourceCredibility = domain.sourceCredibility;
    entity.timelinessScore = domain.timelinessScore;
    entity.dataDensity = domain.dataDensity;
    entity.differentiationScore = domain.differentiationScore;
    entity.actionability = domain.actionability;
    entity.riskDisclosure = domain.riskDisclosure;
    entity.confidenceFactor = domain.confidenceFactor;
    entity.totalScore = domain.totalScore;
    entity.valueRating = domain.valueRating;
    entity.swIndustryTag = domain.swIndustryTag;
    entity.stockMapping = domain.stockMapping;
    entity.expectationGap = domain.expectationGap;
    entity.summaryPoints = domain.summaryPoints;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }
}
