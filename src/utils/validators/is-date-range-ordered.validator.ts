import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Pass when the host DTO's `dateFrom` and `dateTo` properties are both
 * present AND `dateFrom <= dateTo` under string comparison.
 *
 * Why string comparison: ListQueryDto enforces the YYYY-MM-DD format
 * upstream, so lexicographic order matches calendar order. This avoids
 * pulling in a date library just for one cross-field check.
 *
 * Returns `true` when either bound is absent (no cross-check possible),
 * matching the standard `@IsOptional()` semantics elsewhere on the DTO.
 */
@ValidatorConstraint({ name: 'IsDateRangeOrdered', async: false })
export class IsDateRangeOrderedConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as { dateFrom?: string; dateTo?: string };
    const from = obj.dateFrom;
    const to = obj.dateTo;
    if (!from || !to) return true;
    return from <= to;
  }

  defaultMessage(args: ValidationArguments): string {
    const obj = args.object as { dateFrom?: string; dateTo?: string };
    return `dateFrom (${obj.dateFrom}) must be earlier than or equal to dateTo (${obj.dateTo})`;
  }
}
