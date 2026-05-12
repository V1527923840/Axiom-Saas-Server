import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentItemEntity } from '../../../../../content/infrastructure/persistence/relational/entities/content-item.entity';
import { ContentCategoryEntity } from '../../../../../content/infrastructure/persistence/relational/entities/content-category.entity';

@Injectable()
export class ContentItemSeedService {
  constructor(
    @InjectRepository(ContentItemEntity)
    private readonly itemRepository: Repository<ContentItemEntity>,
    @InjectRepository(ContentCategoryEntity)
    private readonly categoryRepository: Repository<ContentCategoryEntity>,
  ) {}

  async run() {
    const count = await this.itemRepository.count();

    if (!count) {
      const now = new Date();

      // Daily News - 3 items
      const dailyNews = [
        {
          title: '市场行情：A股三大指数集体收涨',
          summary: '今日A股市场表现强势，三大指数集体收涨，沪指涨逾2%。',
          originalContent:
            '今日A股市场表现强势，三大指数集体收涨。沪指收盘报3256点，涨幅2.1%；深成指报12345点，涨幅2.3%；创业板指报2345点，涨幅1.8%。',
          publishedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
          collectedAt: now,
          status: 'active',
          metadata: { author: '市场分析员', source: '证券时报' },
          images: [],
        },
        {
          title: '央行宣布降准0.25个百分点',
          summary:
            '央行宣布下调存款准备金率0.25个百分点，预计释放长期资金约5000亿元。',
          originalContent:
            '中国人民银行宣布，为保持流动性合理充裕，决定于2024年3月5日下调金融机构存款准备金率0.25个百分点。',
          publishedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
          collectedAt: now,
          status: 'active',
          metadata: { author: '财经记者', source: '央行官网' },
          images: [],
        },
        {
          title: '新能源汽车销量突破500万辆',
          summary: '2024年1月新能源汽车销量同比增长80%，突破500万辆大关。',
          originalContent:
            '根据中国汽车工业协会数据，2024年1月新能源汽车销量达到125万辆，同比增长80%，环比增长20%。',
          publishedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
          collectedAt: now,
          status: 'active',
          metadata: { author: '汽车研究员', source: '中汽协' },
          images: [],
        },
        {
          title: '科创板迎来首批做市商',
          summary: '科创板做市商制度正式启动，首批获准参与的券商达到40家。',
          originalContent:
            '科创板股票做市商制度于2024年3月正式启动，这将有助于提升科创板股票的流动性，降低投资者交易成本。',
          publishedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
          collectedAt: now,
          status: 'active',
          metadata: { author: '券商研究员', source: '上证报' },
          images: [],
        },
        {
          title: '人民币汇率中间价创年内新高',
          summary: '在岸人民币对美元汇率中间价报6.85，创下年内新高。',
          originalContent:
            '受美元指数回落和市场对中国经济复苏预期增强影响，人民币汇率持续走强，在岸人民币对美元汇率中间价报6.85。',
          publishedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
          collectedAt: now,
          status: 'active',
          metadata: { author: '外汇分析师', source: '中国证券报' },
          images: [],
        },
        {
          title: 'A股ETF净流入创新高',
          summary: '今年来A股ETF净流入超过2000亿元，创历史新高。',
          originalContent:
            '投资者借道ETF布局A股市场的热情高涨。数据显示，今年以来A股ETF净流入已超过2000亿元，远超去年同期水平。',
          publishedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
          collectedAt: now,
          status: 'active',
          metadata: { author: '基金研究员', source: '证券日报' },
          images: [],
        },
      ];

      // Audio Interpretation - 3 items
      const audioInterpretation = [
        {
          title: '每日开盘解读：市场情绪分析',
          summary: '今日开盘后市场情绪较为乐观，机构资金呈现净流入态势。',
          originalContent:
            '今日开盘后市场情绪较为乐观，机构资金呈现净流入态势。沪指开盘后快速拉升，突破3200点关口。',
          audioUrl: 'https://example.com/audio/daily-analysis-001.mp3',
          transcript:
            '各位投资者大家好，今天的市场开盘呈现出积极信号。从资金流向来看，主力资金净流入超过50亿元。',
          publishedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
          collectedAt: now,
          status: 'active',
          metadata: { duration: '5:30', speaker: '李分析师' },
          images: [],
        },
        {
          title: '收盘点评：明日操作建议',
          summary: '今日沪指收于3250点，明日关注3280点压力位。',
          originalContent:
            '今日沪指收于3250点，涨幅1.5%。明日关注3280点压力位，若能突破可继续持有。',
          audioUrl: 'https://example.com/audio/closing-review-001.mp3',
          transcript:
            '今日沪指收于3250点，涨幅1.5%。从技术面来看，3280点是一个重要压力位。',
          publishedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
          collectedAt: now,
          status: 'active',
          metadata: { duration: '4:45', speaker: '王分析师' },
          images: [],
        },
        {
          title: '行业深度解读：半导体板块',
          summary: '半导体板块今日表现强势，多只个股涨停。',
          originalContent:
            '半导体板块今日表现强势，多只个股涨停。从基本面来看，国产替代逻辑持续强化。',
          audioUrl:
            'https://example.com/audio/industry-analysis-semiconductor.mp3',
          transcript:
            '半导体板块今日表现强势，多只个股涨停。我们认为这主要得益于国产替代逻辑的持续强化。',
          publishedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
          collectedAt: now,
          status: 'active',
          metadata: { duration: '8:20', speaker: '张首席' },
          images: [],
        },
      ];

      // Institution Reports - 3 items
      const institutionReports = [
        {
          title: '2024年度宏观策略报告',
          summary: '中金公司发布2024年度宏观策略报告，预期GDP增长5.2%。',
          originalContent:
            '中金公司宏观策略团队发布2024年度展望报告，预计2024年GDP增长5.2%，CPI上涨2.0%。',
          sourceFileUrl:
            'https://example.com/reports/2024-macro-strategy-cicc.pdf',
          jsonFileUrl:
            'https://example.com/reports/2024-macro-strategy-cicc.json',
          summaryFileUrl:
            'https://example.com/reports/2024-macro-strategy-cicc-summary.pdf',
          publishedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
          collectedAt: now,
          status: 'active',
          metadata: { institution: '中金公司', reportType: '宏观策略' },
          images: [],
        },
        {
          title: '新能源汽车行业深度报告',
          summary: '兴业证券发布新能源汽车行业深度报告，看好产业链发展。',
          originalContent:
            '兴业证券发布新能源汽车行业深度报告，认为2024年新能源汽车销量将突破1000万辆。',
          sourceFileUrl: 'https://example.com/reports/ev-industry-xyz.pdf',
          jsonFileUrl: 'https://example.com/reports/ev-industry-xyz.json',
          summaryFileUrl:
            'https://example.com/reports/ev-industry-xyz-summary.pdf',
          publishedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          collectedAt: now,
          status: 'active',
          metadata: { institution: '兴业证券', reportType: '行业研究' },
          images: [],
        },
        {
          title: '半导体设备国产替代专题报告',
          summary: '国泰君安发布半导体设备国产替代专题报告，看好设备厂商。',
          originalContent:
            '国泰君安发布半导体设备国产替代专题报告，认为半导体设备国产化率将显著提升。',
          sourceFileUrl:
            'https://example.com/reports/semiconductor-equipment-gtja.pdf',
          jsonFileUrl:
            'https://example.com/reports/semiconductor-equipment-gtja.json',
          summaryFileUrl:
            'https://example.com/reports/semiconductor-equipment-gtja-summary.pdf',
          publishedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
          collectedAt: now,
          status: 'active',
          metadata: { institution: '国泰君安', reportType: '专题研究' },
          images: [],
        },
      ];

      // Get category IDs
      const dailyNewsCategory = await this.categoryRepository.findOne({
        where: { code: 'daily-news' },
      });
      const audioInterpretationCategory = await this.categoryRepository.findOne(
        {
          where: { code: 'audio-interpretation' },
        },
      );
      const institutionReportsCategory = await this.categoryRepository.findOne({
        where: { code: 'institution-reports' },
      });

      // Save Daily News items
      for (const item of dailyNews) {
        await this.itemRepository.save(
          this.itemRepository.create({
            ...item,
            categoryId: dailyNewsCategory?.id,
          }),
        );
      }

      // Save Audio Interpretation items
      for (const item of audioInterpretation) {
        await this.itemRepository.save(
          this.itemRepository.create({
            ...item,
            categoryId: audioInterpretationCategory?.id,
          }),
        );
      }

      // Save Institution Reports items
      for (const item of institutionReports) {
        await this.itemRepository.save(
          this.itemRepository.create({
            ...item,
            categoryId: institutionReportsCategory?.id,
          }),
        );
      }
    }
  }
}
