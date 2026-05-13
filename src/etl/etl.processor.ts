import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import { ContentItemEntity } from '../content/infrastructure/persistence/relational/entities/content-item.entity';
import { ContentCategoryEntity } from '../content/infrastructure/persistence/relational/entities/content-category.entity';
import { DocumentClassificationEntity } from './infrastructure/persistence/relational/entities/document-classification.entity';

export interface ParsedEntry {
  title: string;
  summary?: string;
  originalContent?: string;
  reportDate?: Date;
  entryIndex?: number;
  entryId?: string;
  contentTimestamp?: Date;
  companies?: { name: string; code?: string; context?: string }[];
  sentiment?: string;
  parser?: string;
  sourceFile?: string;
  metadata: Record<string, any>;
}

export interface ParsedDocument {
  parser: string;
  documentId: string;
  documentPath: string;
  entries: ParsedEntry[];
}

export interface EtlProcessorResult {
  success: number;
  failed: number;
  errors: { entryId: string; error: string }[];
}

@Injectable()
export class EtlProcessor {
  private readonly logger = new Logger(EtlProcessor.name);

  // Classification rules based on parser type
  private readonly CLASSIFICATION_RULES: Record<string, string[]> = {
    zsxq_parser: ['UNSTRUCTURED_TEXT'],
    research_report_parser: ['STRUCTURED_DOC', 'RESEARCH_REPORT'],
    audio_parser: ['SEMI_STRUCTURED_AUDIO', 'CONFERENCE'],
  };

  // Sentiment to financial viewpoint mapping
  private readonly SENTIMENT_MAPPING: Record<string, string[]> = {
    positive: ['VIEWPOINT_STRONG_BUY'],
    negative: ['VIEWPOINT_STRONG_SELL'],
    neutral: [],
  };

  constructor(
    @InjectRepository(ContentItemEntity)
    private readonly contentItemRepository: Repository<ContentItemEntity>,
    @InjectRepository(ContentCategoryEntity)
    private readonly categoryRepository: Repository<ContentCategoryEntity>,
    @InjectRepository(DocumentClassificationEntity)
    private readonly classificationRepository: Repository<DocumentClassificationEntity>,
  ) {}

  async processFile(
    filePath: string,
    dryRun: boolean = false,
  ): Promise<EtlProcessorResult> {
    this.logger.log(`Processing file: ${filePath}, dryRun: ${dryRun}`);

    const data = this.readJsonFile(filePath);
    const document = this.parseDocument(data);

    if (!document || document.entries.length === 0) {
      return {
        success: 0,
        failed: 0,
        errors: [{ entryId: 'N/A', error: 'No entries found' }],
      };
    }

    let success = 0;
    let failed = 0;
    const errors: { entryId: string; error: string }[] = [];

    // Find default category for this parser type
    const defaultCategory = await this.findDefaultCategory(document.parser);

    for (const entry of document.entries) {
      try {
        // Check for duplicates (idempotency)
        if (await this.isDuplicate(entry.entryId, document.documentId)) {
          this.logger.debug(`Skipping duplicate entry: ${entry.entryId}`);
          continue;
        }

        if (!dryRun) {
          // Create content item
          const contentItem = await this.createContentItem(
            entry,
            defaultCategory?.id,
          );

          // Auto-classify and assign categories
          const categories = this.autoClassify(entry);
          await this.assignCategories(contentItem.id, categories);
        }

        success++;
      } catch (error) {
        failed++;
        errors.push({
          entryId: entry.entryId || 'N/A',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { success, failed, errors };
  }

  private readJsonFile(filePath: string): any {
    // In production, this would read from filesystem
    // For now, assume filePath is the actual JSON content for testing
    try {
      return JSON.parse(filePath);
    } catch {
      // If not valid JSON, try to read from file system
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
      }
      throw new Error(`Cannot parse file: ${filePath}`);
    }
  }

  private parseDocument(data: any): ParsedDocument | null {
    const parser = data.parser;
    if (!parser) {
      this.logger.error('No parser found in document');
      return null;
    }

    const entries: ParsedEntry[] = [];

    if (parser === 'zsxq_parser') {
      // Handle zsxq multi-entry format
      const rawEntries = data.entries || [];
      for (const entry of rawEntries) {
        entries.push({
          title: entry.title || 'Untitled',
          summary: entry.content_summary,
          originalContent: entry.content_raw,
          reportDate: this.parseDate(data.report_date),
          entryIndex: entry.index,
          entryId: entry.entry_id,
          contentTimestamp: this.parseTimestamp(entry.timestamp),
          companies: entry.companies || [],
          sentiment: entry.sentiment?.overall,
          parser: parser,
          sourceFile: data.document_path,
          metadata: {
            sourceDocumentId: data.document_id,
            entryType: entry.entry_type,
            rawData: entry,
          },
        });
      }
    } else {
      // Handle single document format (research report, etc.)
      entries.push({
        title: data.metadata?.title || 'Untitled',
        summary: data.summary || data.metadata?.summary,
        originalContent: data.full_text || data.content,
        reportDate: this.parseDate(data.report_date),
        entryIndex: 0,
        entryId: data.document_id,
        contentTimestamp: this.parseTimestamp(data.timestamp),
        companies: data.companies || [],
        sentiment: data.sentiment?.overall,
        parser: parser,
        sourceFile: data.document_path,
        metadata: {
          sourceDocumentId: data.document_id,
          ratingInfo: data.rating_info,
          keyFindings: data.key_findings,
          structuredData: data.structured_data,
          rawData: data,
        },
      });
    }

    return {
      parser,
      documentId: data.document_id,
      documentPath: data.document_path,
      entries,
    };
  }

  private async findDefaultCategory(
    parser: string,
  ): Promise<ContentCategoryEntity | null> {
    const carrierCategory = this.CLASSIFICATION_RULES[parser]?.[0];
    if (!carrierCategory) {
      return null;
    }
    return this.categoryRepository.findOne({
      where: { code: carrierCategory },
    });
  }

  private async isDuplicate(
    entryId: string | undefined,
    sourceDocumentId: string,
  ): Promise<boolean> {
    if (!entryId) {
      return false;
    }
    const existing = await this.contentItemRepository.findOne({
      where: {
        entryId: entryId,
        metadata: { sourceDocumentId: sourceDocumentId } as any,
      },
    });
    return !!existing;
  }

  private async createContentItem(
    entry: ParsedEntry,
    categoryId: string | undefined,
  ): Promise<ContentItemEntity> {
    const contentItem = this.contentItemRepository.create({
      categoryId: categoryId || '00000000-0000-0000-0000-000000000000', // placeholder
      title: entry.title,
      summary: entry.summary || null,
      originalContent: entry.originalContent || null,
      sourceFile: entry.sourceFile || null,
      parser: entry.parser || null,
      reportDate: entry.reportDate || null,
      entryIndex: entry.entryIndex || null,
      entryId: entry.entryId || null,
      contentTimestamp: entry.contentTimestamp || null,
      companies: entry.companies || [],
      sentiment: entry.sentiment || null,
      collectedAt: new Date(),
      status: 'active',
      metadata: entry.metadata || {},
    });
    return this.contentItemRepository.save(contentItem);
  }

  private autoClassify(entry: ParsedEntry): string[] {
    const categories: string[] = [];
    const parser = entry.parser;

    // Based on parser type
    if (parser && this.CLASSIFICATION_RULES[parser]) {
      categories.push(...this.CLASSIFICATION_RULES[parser]);
    }

    // Based on entry_type or metadata
    const entryType = entry.metadata?.entryType;
    if (entryType === 'sentiment_rank') {
      categories.push('FLASH_NEWS');
    } else if (entryType === 'earnings') {
      categories.push('RESEARCH_REPORT');
    }

    // Based on sentiment
    if (entry.sentiment && this.SENTIMENT_MAPPING[entry.sentiment]) {
      categories.push(...this.SENTIMENT_MAPPING[entry.sentiment]);
    }

    return [...new Set(categories)]; // Remove duplicates
  }

  private async assignCategories(
    contentItemId: string,
    categoryCodes: string[],
  ): Promise<void> {
    for (const code of categoryCodes) {
      const category = await this.categoryRepository.findOne({
        where: { code },
      });
      if (category) {
        const classification = this.classificationRepository.create({
          contentItemId,
          categoryId: category.id,
          confidence: 0.9, // Default confidence for auto-classification
          manualReviewed: false,
        });
        await this.classificationRepository.save(classification);
      }
    }
  }

  private parseDate(dateStr: string | undefined): Date | undefined {
    if (!dateStr) return undefined;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? undefined : date;
  }

  private parseTimestamp(
    timestamp: string | number | undefined,
  ): Date | undefined {
    if (!timestamp) return undefined;
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? undefined : date;
  }
}
