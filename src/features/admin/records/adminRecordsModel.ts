import type { AdminRecordRow, UserRecord } from '../../user/records';

export type AdminRecordModuleSummary = {
  module: UserRecord['module'];
  activeCount: number;
  deletedCount: number;
};

export function getAdminRecordModuleSummaries(records: AdminRecordRow[]): AdminRecordModuleSummary[] {
  return (['Reading', 'Listening', 'Writing', 'Speaking'] as UserRecord['module'][]).map((module) => {
    const moduleRecords = records.filter((record) => record.module === module);

    return {
      module,
      activeCount: moduleRecords.filter((record) => record.isDeleted === 0).length,
      deletedCount: moduleRecords.filter((record) => record.isDeleted === 1).length,
    };
  });
}
