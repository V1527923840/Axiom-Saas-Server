import { Injectable } from '@nestjs/common';

import { NullableType } from '../../../../../utils/types/nullable.type';
import { FilterPlanDto, SortPlanDto } from '../../../../dto/query-plan.dto';
import { Plan } from '../../../../domain/plan';
import { PlanRepository } from '../../plan.repository';
import { PlanSchemaClass } from '../entities/plan.schema';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model } from 'mongoose';
import { PlanMapper } from '../mappers/plan.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class PlansDocumentRepository implements PlanRepository {
  constructor(
    @InjectModel(PlanSchemaClass.name)
    private readonly plansModel: Model<PlanSchemaClass>,
  ) {}

  async create(data: Plan): Promise<Plan> {
    const persistenceModel = PlanMapper.toPersistence(data);
    const createdPlan = new this.plansModel(persistenceModel);
    const planObject = await createdPlan.save();
    return PlanMapper.toDomain(planObject);
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
    const where: QueryFilter<PlanSchemaClass> = {};
    if (filterOptions?.cycle) {
      where.cycle = filterOptions.cycle;
    }
    if (filterOptions?.tier) {
      where.tier = filterOptions.tier;
    }
    if (filterOptions?.status) {
      where.status = filterOptions.status;
    }

    const [planObjects, total] = await Promise.all([
      this.plansModel
        .find(where)
        .sort(
          sortOptions?.reduce(
            (accumulator, sort) => ({
              ...accumulator,
              [sort.orderBy === 'id' ? '_id' : sort.orderBy]:
                sort.order.toUpperCase() === 'ASC' ? 1 : -1,
            }),
            {},
          ),
        )
        .skip((paginationOptions.page - 1) * paginationOptions.limit)
        .limit(paginationOptions.limit),
      this.plansModel.countDocuments(where),
    ]);

    return {
      data: planObjects.map((planObject) => PlanMapper.toDomain(planObject)),
      total,
    };
  }

  async findById(id: Plan['id']): Promise<NullableType<Plan>> {
    const planObject = await this.plansModel.findById(id);
    return planObject ? PlanMapper.toDomain(planObject) : null;
  }

  async findByIds(ids: Plan['id'][]): Promise<Plan[]> {
    const planObjects = await this.plansModel.find({
      _id: { $in: ids.map((id) => id.toString()) },
    });
    return planObjects.map((planObject) => PlanMapper.toDomain(planObject));
  }

  async update(id: Plan['id'], payload: Partial<Plan>): Promise<Plan | null> {
    const clonedPayload = { ...payload };
    delete clonedPayload.id;

    const filter = { _id: id.toString() };
    const plan = await this.plansModel.findOne(filter);

    if (!plan) {
      return null;
    }

    const planObject = await this.plansModel.findOneAndUpdate(
      filter,
      PlanMapper.toPersistence({
        ...PlanMapper.toDomain(plan),
        ...clonedPayload,
      }),
      { new: true },
    );

    return planObject ? PlanMapper.toDomain(planObject) : null;
  }

  async remove(id: Plan['id']): Promise<void> {
    await this.plansModel.deleteOne({
      _id: id.toString(),
    });
  }
}
