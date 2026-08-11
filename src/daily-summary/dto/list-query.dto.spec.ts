// src/daily-summary/dto/list-query.dto.spec.ts
//
// Verifies Part 3.6 of the cleanup plan:
// - `2026-13-45` (regex-passing but not a real date) is rejected
// - `dateFrom > dateTo` is rejected
// - normal ranges pass
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListQueryDto } from './list-query.dto';

async function validateDto(input: Record<string, unknown>) {
  const dto = plainToInstance(ListQueryDto, input);
  const errors = await validate(dto);
  return errors;
}

describe('ListQueryDto', () => {
  it('should accept a normal range', async () => {
    const errors = await validateDto({
      frequency: 'daily',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-11',
    });
    expect(errors).toHaveLength(0);
  });

  it('should accept equal dateFrom and dateTo', async () => {
    const errors = await validateDto({
      dateFrom: '2026-08-11',
      dateTo: '2026-08-11',
    });
    expect(errors).toHaveLength(0);
  });

  it('should reject dateFrom > dateTo', async () => {
    const errors = await validateDto({
      dateFrom: '2026-08-11',
      dateTo: '2026-08-01',
    });
    const crossErr = errors.find((e) => e.property === 'dateTo');
    expect(crossErr).toBeDefined();
    expect(crossErr?.constraints?.['IsDateRangeOrdered']).toBeDefined();
  });

  it('should reject malformed dates like 2026-13-45', async () => {
    const errors = await validateDto({
      dateFrom: '2026-13-45',
      dateTo: '2026-12-31',
    });
    // class-validator's @IsDateString + @Matches both fire
    const fromErr = errors.find((e) => e.property === 'dateFrom');
    expect(fromErr).toBeDefined();
    expect(fromErr?.constraints?.['isDateString']).toBeDefined();
  });

  it('should reject bad frequency values', async () => {
    const errors = await validateDto({ frequency: 'monthly' });
    expect(errors.find((e) => e.property === 'frequency')).toBeDefined();
  });
});
