import { Injectable } from '@nestjs/common';
import {
  CreatePaymentFlowDto,
  UpdatePaymentFlowDto,
} from './dto/payment-flow.dto';
import { NullableType } from '../utils/types/nullable.type';
import {
  FilterPaymentFlowDto,
  QueryPaymentFlowDto,
  SortPaymentFlowDto,
} from './dto/query-payment-flow.dto';
import { PaymentFlowRepository } from './infrastructure/persistence/payment-flow.repository';
import { PaymentFlow } from './domain/payment-flow';

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

  findPaymentFlowsWithPagination(query: QueryPaymentFlowDto): Promise<{
    data: PaymentFlow[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.pageSize ?? 10;

    const filters: FilterPaymentFlowDto = {};
    if (query.userName) filters.userName = query.userName;
    if (query.userEmail) filters.userEmail = query.userEmail;
    if (query.type) filters.type = query.type;
    if (query.paymentMethod) filters.paymentMethod = query.paymentMethod;
    if (query.status) filters.status = query.status;
    if (query.dateFrom) filters.dateFrom = query.dateFrom;
    if (query.dateTo) filters.dateTo = query.dateTo;

    const sort: SortPaymentFlowDto[] | undefined = query.sortBy
      ? [
          {
            orderBy: query.sortBy as keyof PaymentFlow,
            order: query.sortOrder ?? 'ASC',
          },
        ]
      : undefined;

    return this.paymentFlowRepository
      .findManyWithPagination({
        filterOptions: Object.keys(filters).length ? filters : undefined,
        sortOptions: sort ?? undefined,
        paginationOptions: { page, limit },
      })
      .then((result) => ({ ...result, page, limit }));
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
