import { adminApi } from '../../../api/adminApi';
import { RecordDetailPage } from '../../user/records';
import type { UserRecord } from '../../user/records';
import { createAdminRecordDetailLoader } from './adminRecordDetailModel';

const loadAdminRecordDetail = createAdminRecordDetailLoader(adminApi.getRecord);
type AdminRecordDetailRow = UserRecord & { userId?: number };

export function AdminRecordDetailPage({ onExit, record }: { onExit: () => void; record: AdminRecordDetailRow }) {
  return (
    <RecordDetailPage
      loadRecordDetail={loadAdminRecordDetail}
      record={record}
      onExit={onExit}
    />
  );
}
