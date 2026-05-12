import { Injectable } from '@nestjs/common';
import {
  CreatePaymentFlowDto,
  UpdatePaymentFlowDto,
} from './dto/payment-flow.dto';
import { NullableType } from '../utils/types/nullable.type';
import {
  FilterPaymentFlowDto,
  SortPaymentFlowDto,
} from './dto/query-payment-flow.dto';
import { PaymentFlowRepository } from './infrastructure/persistence/payment-flow.repository';
import { PaymentFlow } from './domain/payment-flow';
import { IPaginationOptions } from '../utils/types/pagination-options';

@Injectable()
export class BillsService {
  constructor(private readonly paymentFlowRepository: PaymentFlowRepository) {}

  async createPaymentFlow(
    createDto: CreatePaymentFlowDto,
  ): Promise<PaymentFlow> {
    return this.paymentFlowRepository.create({
      userId: createDto.userId,
      userName: createDto.userName,
      userEmail: createDto.userEmail,
      orderNo: createDto.orderNo,
      type: createDto.type,
      paymentMethod: createDto.paymentMethod,
      amount: createDto.amount,
      points: createDto.points,
      status: createDto.status ?? 'pending',
      metadata: createDto.metadata ?? {},
      completedAt: null,
    });
  }

  findPaymentFlowsWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterPaymentFlowDto | null;
    sortOptions?: SortPaymentFlowDto[] | null;
    paginationOptions: IPaginationOptions;
  }) {
    return this.paymentFlowRepository.findManyWithPagination({
      filterOptions,
      sortOptions,
      paginationOptions,
    });
  }

  findPaymentFlowById(
    id: PaymentFlow['id'],
  ): Promise<NullableType<PaymentFlow>> {
    return this.paymentFlowRepository.findById(id);
  }

  async updatePaymentFlow(
    id: PaymentFlow['id'],
    updateDto: UpdatePaymentFlowDto,
  ): Promise<PaymentFlow | null> {
    return this.paymentFlowRepository.update(id, updateDto);
  }
}
