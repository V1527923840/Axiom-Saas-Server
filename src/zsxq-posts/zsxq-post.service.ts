import { Injectable } from '@nestjs/common';
import { ZsxqPostRepository } from './infrastructure/persistence/zsxq-post.repository';
import { ZsxqPost } from './domain/zsxq-post';

@Injectable()
export class ZsxqPostService {
  constructor(private readonly repository: ZsxqPostRepository) {}

  // IN-batch lookup for callers that hold a list of ids — currently
  // DailySummaryService.getSources, which maps `source_post_ids` back
  // to rows. Missing ids are simply absent from the returned array;
  // the caller is responsible for the missing-id fallback.
  async findManyByIds(ids: string[]): Promise<ZsxqPost[]> {
    return this.repository.findManyByIds(ids);
  }
}
