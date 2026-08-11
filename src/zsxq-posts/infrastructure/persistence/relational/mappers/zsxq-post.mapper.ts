import { ZsxqPost } from '../../../../domain/zsxq-post';
import { ZsxqPostEntity } from '../entities/zsxq-post.entity';

export class ZsxqPostMapper {
  static toDomain(raw: ZsxqPostEntity): ZsxqPost {
    const domain = new ZsxqPost();
    domain.id = raw.id;
    domain.title = raw.title ?? null;
    domain.categoryL1 = raw.categoryL1 ?? null;
    domain.postDate = raw.postDate;
    domain.sourceFileKey = raw.sourceFileKey ?? null;
    return domain;
  }
}
