import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentCategoryEntity } from '../../../../../content/infrastructure/persistence/relational/entities/content-category.entity';

@Injectable()
export class ContentCategorySeedService {
  constructor(
    @InjectRepository(ContentCategoryEntity)
    private readonly repository: Repository<ContentCategoryEntity>,
  ) {}

  async run() {
    const count = await this.repository.count();

    if (!count) {
      await this.repository.save([
        this.repository.create({
          name: '每日消息',
          code: 'daily-news',
          description: '每日资讯新闻内容',
          sortOrder: 1,
          isActive: true,
        }),
        this.repository.create({
          name: '音频解读',
          code: 'audio-interpretation',
          description: '音频转文字解读内容',
          sortOrder: 2,
          isActive: true,
        }),
        this.repository.create({
          name: '机构研报',
          code: 'institution-reports',
          description: '机构发布的研究报告',
          sortOrder: 3,
          isActive: true,
        }),
      ]);
    }
  }
}
