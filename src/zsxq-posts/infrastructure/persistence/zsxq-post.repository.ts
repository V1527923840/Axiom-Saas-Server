import { ZsxqPost } from '../../domain/zsxq-post';

export abstract class ZsxqPostRepository {
  // IN-batch lookup. `daily_summary.source_post_ids` references
  // zsxq_posts.id (uuid), so the ids must be valid uuid strings —
  // non-uuid entries are the caller's problem to filter out.
  abstract findManyByIds(ids: string[]): Promise<ZsxqPost[]>;
}
