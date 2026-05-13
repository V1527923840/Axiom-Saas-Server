import { EtlJob } from '../../../../domain/etl-job';
import { EtlJobEntity } from '../entities/etl-job.entity';

export class EtlJobMapper {
  static toDomain(raw: EtlJobEntity): EtlJob {
    const domainEntity = new EtlJob();
    domainEntity.id = raw.id;
    domainEntity.sourceFile = raw.sourceFile;
    domainEntity.parser = raw.parser ?? null;
    domainEntity.totalItems = raw.totalItems;
    domainEntity.successItems = raw.successItems;
    domainEntity.failedItems = raw.failedItems;
    domainEntity.status = raw.status as EtlJob['status'];
    domainEntity.errorMessage = raw.errorMessage ?? null;
    domainEntity.startedAt = raw.startedAt ?? null;
    domainEntity.completedAt = raw.completedAt ?? null;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;
    return domainEntity;
  }

  static toPersistence(domainEntity: EtlJob): EtlJobEntity {
    const persistenceEntity = new EtlJobEntity();
    persistenceEntity.id = domainEntity.id;
    persistenceEntity.sourceFile = domainEntity.sourceFile;
    persistenceEntity.parser = domainEntity.parser ?? null;
    persistenceEntity.totalItems = domainEntity.totalItems;
    persistenceEntity.successItems = domainEntity.successItems;
    persistenceEntity.failedItems = domainEntity.failedItems;
    persistenceEntity.status = domainEntity.status;
    persistenceEntity.errorMessage = domainEntity.errorMessage ?? null;
    persistenceEntity.startedAt = domainEntity.startedAt ?? null;
    persistenceEntity.completedAt = domainEntity.completedAt ?? null;
    return persistenceEntity;
  }
}
