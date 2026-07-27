export interface ResearchAnalysis {
  id: number;
  version: string;
  documentName: string;
  docType?: string | null;
  sourceFileKey?: string | null;
  ossUrl?: string | null;
  localPath?: string | null;
  scrapeLogId?: string | null;
  analyzedAt?: Date | null;
  categoryL1?: string | null;
  categoryL2?: string | null;
  swIndustryTag?: Record<string, any>[] | null;
  mentionedStocks?: Record<string, any>[] | null;
  keyThesis?: string | null;
  analysisVersion?: string | null;

  // Pyramid-view fields
  rawFacts?: Record<string, any> | null;
  inductionGroups?: Record<string, any> | null;
  baseView?: Record<string, any> | null;
  midView?: Record<string, any> | null;
  coreView?: Record<string, any> | null;
  pyramidJudgement?: Record<string, any> | null;
  pyramidVersion?: string | null;

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
  | 'swIndustryTag'
  | 'mentionedStocks'
  | 'coreView'
  | 'pyramidVersion'
>;
