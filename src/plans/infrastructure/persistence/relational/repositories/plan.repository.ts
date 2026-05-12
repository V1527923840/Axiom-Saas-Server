import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { FindOptionsWhere, Repository, In } from 'typeorm';
import { PlanEntity } from '../entities/plan.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { FilterPlanDto, SortPlanDto } from '../../../../dto/query-plan.dto';
import { Plan } from '../../../../domain/plan';
import { PlanRepository } from '../../plan.repository';
import { PlanMapper } from '../mappers/plan.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class PlansRelationalRepository implements PlanRepository {
  constructor(
    @InjectRepository(PlanEntity)
    private readonly plansRepository: Repository<PlanEntity>,
  ) {}

  async create(data: Plan): Promise<Plan> {
    const persistenceModel = PlanMapper.toPersistence(data);
    const newEntity = await this.plansRepository.save(
      this.plansRepository.create(persistenceModel),
    );
    return PlanMapper.toDomain(newEntity);
  }

  async findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterPlanDto | null;
    sortOptions?: SortPlanDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<{ data: Plan[]; total: number }> {
    const where: FindOptionsWhere<PlanEntity> = {};
    if (filterOptions?.cycle) {
      where.cycle = filterOptions.cycle;
    }
    if (filterOptions?.tier) {
      where.tier = filterOptions.tier;
    }
    if (filterOptions?.status) {
      where.status = filterOptions.status;
    }

    const [entities, total] = await this.plansRepository.findAndCount({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
      where: where,
      order: sortOptions?.reduce(
        (accumulator, sort) => ({
          ...accumulator,
          [sort.orderBy]: sort.order,
        }),
        {},
      ),
    });

    return {
      data: entities.map((plan) => PlanMapper.toDomain(plan)),
      total,
    };
  }

  async findById(id: Plan['id']): Promise<NullableType<Plan>> {
    const entity = await this.plansRepository.findOne({
      where: { id: id as string },
    });

    return entity ? PlanMapper.toDomain(entity) : null;
  }

  async findByIds(ids: Plan['id'][]): Promise<Plan[]> {
    const entities = await this.plansRepository.find({
      where: { id: In(ids as string[]) },
    });

    return entities.map((plan) => PlanMapper.toDomain(plan));
  }

  async update(id: Plan['id'], payload: Partial<Plan>): Promise<Plan | null> {
    const entity = await this.plansRepository.findOne({
      where: { id: id as string },
    });

    if (!entity) {
      return null;
    }

    const updatedEntity = await this.plansRepository.save(
      this.plansRepository.create(
        PlanMapper.toPersistence({
          ...PlanMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return PlanMapper.toDomain(updatedEntity);
  }

  async remove(id: Plan['id']): Promise<void> {
    await this.plansRepository.softDelete(id as string);
  }
}
