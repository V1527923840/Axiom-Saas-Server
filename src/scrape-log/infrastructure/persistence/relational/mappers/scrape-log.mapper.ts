import { ScrapeLog } from '../../../../domain/scrape-log';
import { ScrapeLogEntity } from '../entities/scrape-log.entity';

export class ScrapeLogMapper {
  static toDomain(entity: ScrapeLogEntity): ScrapeLog {
    return {
      id: entity.id,
      source: entity.source,
      targettime: entity.targettime,
      status: entity.status as ScrapeLog['status'],
      filecount: entity.filecount,
      postcount: entity.postcount,
      latestposttime: entity.latestposttime,
      osspath: entity.osspath,
      errormessage: entity.errormessage,
      startedat: entity.startedat,
      completedat: entity.completedat,
      createdat: entity.createdat,
      updatedat: entity.updatedat,
    };
  }

  static toPersistence(
    domain: Omit<ScrapeLog, 'id' | 'createdat' | 'updatedat'>,
  ): Partial<ScrapeLogEntity> {
    return {
      source: domain.source,
      targettime: domain.targettime,
      status: domain.status,
      filecount: domain.filecount,
      postcount: domain.postcount,
      latestposttime: domain.latestposttime,
      osspath: domain.osspath,
      errormessage: domain.errormessage,
      startedat: domain.startedat,
      completedat: domain.completedat,
    };
  }
}
