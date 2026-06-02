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
  author?: string | null;
  groupName?: string | null;
  likeCount: number;
  commentCount: number;
  sourceCredibility?: number | null;
  timelinessScore?: number | null;
  dataDensity?: number | null;
  differentiationScore?: number | null;
  actionability?: number | null;
  riskDisclosure?: number | null;
  confidenceFactor?: number | null;
  totalScore?: number | null;
  valueRating?: string | null;
  swIndustryTag?: string[] | null;
  stockMapping?: { mentionedStocks?: { name: string }[] } | null;
  expectationGap?: Record<string, any> | null;
  summaryPoints?: string[] | null;
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
  | 'valueRating'
  | 'totalScore'
  | 'swIndustryTag'
  | 'stockMapping'
  | 'originalTextRaw'
>;
