export interface Intelligence {
  id: string;
  scrapeLogId?: string | null;
  sourceFileKey: string;
  version: string;
  postDate: Date;
  categoryL1: string;
  categoryL2: string;
  summary?: string | null;
  title?: string | null;
  originalText: string;
  originalTextRaw?: string | null;
  imageUrls?: string[] | null;
  author?: string | null;
  groupName?: string | null;
  swIndustryTag?: string[] | null;
  stockMapping?: { mentionedStocks?: { name: string }[] } | null;
  expectationGap?: Record<string, any> | null;

  // Pyramid-view fields
  classificationMethod?: string | null;
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

export type IntelligenceListItem = Pick<
  Intelligence,
  | 'id'
  | 'title'
  | 'author'
  | 'groupName'
  | 'summary'
  | 'postDate'
  | 'createdAt'
  | 'categoryL1'
  | 'categoryL2'
  | 'swIndustryTag'
  | 'stockMapping'
  | 'coreView'
  | 'pyramidVersion'
  | 'classificationMethod'
  | 'originalTextRaw'
>;
