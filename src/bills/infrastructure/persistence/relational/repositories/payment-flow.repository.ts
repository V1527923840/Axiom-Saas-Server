import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { FindOptionsWhere, Repository, Between } from 'typeorm';
import { PaymentFlowEntity } from '../entities/payment-flow.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import {
  FilterPaymentFlowDto,
  SortPaymentFlowDto,
} from '../../../../dto/query-payment-flow.dto';
import { PaymentFlow } from '../../../../domain/payment-flow';
import { PaymentFlowRepository } from '../../payment-flow.repository';
import { PaymentFlowMapper } from '../mappers/payment-flow.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class PaymentFlowRelationalRepository implements PaymentFlowRepository {
  constructor(
    @InjectRepository(PaymentFlowEntity)
    private readonly repository: Repository<PaymentFlowEntity>,
  ) {}

  async create(
    data: Omit<PaymentFlow, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<PaymentFlow> {
    const persistenceModel = PaymentFlowMapper.toPersistence(data);
    const newEntity = await this.repository.save(
      this.repository.create(persistenceModel),
    );
    return PaymentFlowMapper.toDomain(newEntity);
  }

  async findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterPaymentFlowDto | null;
    sortOptions?: SortPaymentFlowDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<{ data: PaymentFlow[]; total: number }> {
    const where: FindOptionsWhere<PaymentFlowEntity> = {};

    if (filterOptions?.userId) {
      where.userId = filterOptions.userId;
    }

    if (filterOptions?.userName) {
      where.userName = filterOptions.userName;
    }

    if (filterOptions?.userEmail) {
      where.userEmail = filterOptions.userEmail;
    }

    if (filterOptions?.type) {
      where.type = filterOptions.type;
    }

    if (filterOptions?.paymentMethod) {
      where.paymentMethod = filterOptions.paymentMethod;
    }

    if (filterOptions?.status) {
      where.status = filterOptions.status;
    }

    if (filterOptions?.dateFrom && filterOptions?.dateTo) {
      where.createdAt = Between(
        new Date(filterOptions.dateFrom),
        new Date(filterOptions.dateTo),
      );
    }

    const [entities, total] = await this.repository.findAndCount({
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
      data: entities.map((entity) => PaymentFlowMapper.toDomain(entity)),
      total,
    };
  }

  async findById(id: PaymentFlow['id']): Promise<NullableType<PaymentFlow>> {
    const entity = await this.repository.findOne({
      where: { id: id as string },
    });

    return entity ? PaymentFlowMapper.toDomain(entity) : null;
  }

  async findByOrderNo(orderNo: string): Promise<NullableType<PaymentFlow>> {
    const entity = await this.repository.findOne({
      where: { orderNo },
    });

    return entity ? PaymentFlowMapper.toDomain(entity) : null;
  }

  async update(
    id: PaymentFlow['id'],
    payload: Partial<PaymentFlow>,
  ): Promise<PaymentFlow | null> {
    const entity = await this.repository.findOne({
      where: { id: id as string },
    });

    if (!entity) {
      return null;
    }

    const updatedEntity = await this.repository.save(
      this.repository.create(
        PaymentFlowMapper.toPersistence({
          ...PaymentFlowMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return PaymentFlowMapper.toDomain(updatedEntity);
  }
}
