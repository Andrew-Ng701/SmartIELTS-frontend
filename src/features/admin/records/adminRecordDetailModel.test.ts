import { describe, expect, it } from 'vitest';
import type { ModuleType } from '../../../contracts/common';
import type { UserRecordDetailVO } from '../../../contracts/records';
import { createAdminRecordDetailLoader } from './adminRecordDetailModel';

describe('createAdminRecordDetailLoader', () => {
  it('loads a global admin record detail through the admin records endpoint', async () => {
    const payload: UserRecordDetailVO = {
      detailType: 'READING_RECORD_DETAIL',
      moduleType: 'READING',
      recordId: 42,
      detail: { testTitle: 'Reading mock' },
      review: null,
    };
    const calls: Array<{ module: ModuleType; recordId: number }> = [];
    const getRecord = async <TDetail = unknown>(module: ModuleType, recordId: number): Promise<TDetail> => {
      calls.push({ module, recordId });
      return payload as TDetail;
    };
    const loadRecordDetail = createAdminRecordDetailLoader(getRecord);

    await expect(loadRecordDetail('READING', 42)).resolves.toBe(payload);
    expect(calls).toEqual([{ module: 'READING', recordId: 42 }]);
  });
});
