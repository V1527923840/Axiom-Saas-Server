import { NullableType } from '../../../utils/types/nullable.type';
import { PaymentFlow } from '../../domain/payment-flow';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import {
  FilterPaymentFlowDto,
  SortPaymentFlowDto,
} from '../../dto/query-payment-flow.dto';

export abstract class PaymentFlowRepository {
  abstract create(
    data: Omit<PaymentFlow, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<PaymentFlow>;

  abstract findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterPaymentFlowDto | null;
    sortOptions?: SortPaymentFlowDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<{ data: PaymentFlow[]; total: number }>;

  abstract findById(id: PaymentFlow['id']): Promise<NullableType<PaymentFlow>>;

  abstract findByOrderNo(orderNo: string): Promise<NullableType<PaymentFlow>>;

  abstract update(
    id: PaymentFlow['id'],
    payload: Partial<PaymentFlow>,
  ): Promise<PaymentFlow | null>;
}
