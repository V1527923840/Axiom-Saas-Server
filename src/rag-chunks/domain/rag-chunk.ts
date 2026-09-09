export type SourceTable = 'zsxq_posts' | 'research_analysis';

export interface ResolveResult {
  sourceTable: SourceTable;
  /**
   * zsxq_posts → UUID string
   * research_analysis → int
   */
  sourceRowId: string | number;
}