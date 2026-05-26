import type { ModuleType } from '../../../contracts/common';
import type { UserRecordDetailVO } from '../../../contracts/records';

type AdminGetRecord = <TDetail = unknown>(module: ModuleType, recordId: number) => Promise<TDetail>;

export function createAdminRecordDetailLoader(getRecord: AdminGetRecord) {
  return async (moduleType: ModuleType, recordId: number): Promise<UserRecordDetailVO> => {
    const payload = await getRecord<unknown>(moduleType, recordId);
    return normalizeAdminRecordDetail(payload, moduleType, recordId);
  };
}

export function normalizeAdminRecordDetail(payload: unknown, moduleType: ModuleType, recordId: number): UserRecordDetailVO {
  const source = asRecord(payload);
  if (source.detailType || source.review || source.detail) {
    return source as UserRecordDetailVO;
  }

  return {
    moduleType,
    recordId,
    detailType: `${moduleType}_RECORD_DETAIL`,
    detail: source,
    review: null,
  } as UserRecordDetailVO;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}
