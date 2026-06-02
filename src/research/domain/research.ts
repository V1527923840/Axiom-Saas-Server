export interface ResearchAnalysis {
  id: number;
  version?: string | null;
  documentName: string;
  docType?: string | null;
  sourceFileKey?: string | null;
  scrapeLogId?: string | null;
  analyzedAt?: Date | null;
  categoryL1?: string | null;
  categoryL2?: string | null;
  swIndustryTag?: Record<string, any>[] | null;
  mentionedStocks?: Record<string, any>[] | null;
  keyThesis?: string | null;
  summaryPoints?: string[] | null;
  expectationGap?: Record<string, any> | null;
  sourceCredibility?: number | null;
  timelinessScore?: number | null;
  dataDensity?: number | null;
  differentiationScore?: number | null;
  actionability?: number | null;
  riskDisclosure?: number | null;
  confidenceFactor?: number | null;
  overallScore?: number | null;
  valueRating?: string | null;
  recommendation?: string | null;
  targetPrice?: string | null;
  investmentHorizon?: string | null;
  risksWarnings?: Record<string, any>[] | null;
  impactLevel?: string | null;
  affectedSectors?: Record<string, any>[] | null;
  marketSentiment?: string | null;
  originalText?: string | null;
  originalTextRaw?: string | null;
  analysisVersion?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ResearchAnalysisListItem = Pick<
  ResearchAnalysis,
  | 'id'
  | 'documentName'
  | 'keyThesis'
  | 'analyzedAt'
  | 'createdAt'
  | 'categoryL1'
  | 'categoryL2'
  | 'valueRating'
  | 'overallScore'
  | 'swIndustryTag'
  | 'mentionedStocks'
>;
