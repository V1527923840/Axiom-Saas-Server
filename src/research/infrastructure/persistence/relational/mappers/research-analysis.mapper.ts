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
      summaryPoints: entity.summaryPoints,
      expectationGap: entity.expectationGap,
      sourceCredibility: entity.sourceCredibility,
      timelinessScore: entity.timelinessScore,
      dataDensity: entity.dataDensity,
      differentiationScore: entity.differentiationScore,
      actionability: entity.actionability,
      riskDisclosure: entity.riskDisclosure,
      confidenceFactor: entity.confidenceFactor,
      overallScore: entity.overallScore,
      valueRating: entity.valueRating,
      recommendation: entity.recommendation,
      targetPrice: entity.targetPrice,
      investmentHorizon: entity.investmentHorizon,
      risksWarnings: entity.risksWarnings,
      impactLevel: entity.impactLevel,
      affectedSectors: entity.affectedSectors,
      marketSentiment: entity.marketSentiment,
      originalText: entity.originalText,
      originalTextRaw: entity.originalTextRaw,
      analysisVersion: entity.analysisVersion,
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
    entity.summaryPoints = domain.summaryPoints;
    entity.expectationGap = domain.expectationGap;
    entity.sourceCredibility = domain.sourceCredibility;
    entity.timelinessScore = domain.timelinessScore;
    entity.dataDensity = domain.dataDensity;
    entity.differentiationScore = domain.differentiationScore;
    entity.actionability = domain.actionability;
    entity.riskDisclosure = domain.riskDisclosure;
    entity.confidenceFactor = domain.confidenceFactor;
    entity.overallScore = domain.overallScore;
    entity.valueRating = domain.valueRating;
    entity.recommendation = domain.recommendation;
    entity.targetPrice = domain.targetPrice;
    entity.investmentHorizon = domain.investmentHorizon;
    entity.risksWarnings = domain.risksWarnings;
    entity.impactLevel = domain.impactLevel;
    entity.affectedSectors = domain.affectedSectors;
    entity.marketSentiment = domain.marketSentiment;
    entity.originalText = domain.originalText;
    entity.originalTextRaw = domain.originalTextRaw;
    entity.analysisVersion = domain.analysisVersion;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }
}
