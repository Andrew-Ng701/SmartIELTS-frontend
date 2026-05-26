export type ResultCode = 0 | 1;

export type Result<T> = {
  code: ResultCode;
  msg: string | null;
  data: T;
};

export type PageResult<T> = {
  list: T[];
  total: number;
  pageNum: number;
  pageSize: number;
};

export type UserRole = 'USER' | 'ADMIN';

export type SortDirection = 'ASC' | 'DESC';

export type LocalDateTimeString = string;

export type EmptyResponse = Record<string, never> | null;

export type PageQuery = {
  pageNum?: number;
  pageSize?: number;
  sortDirection?: SortDirection;
  startTime?: LocalDateTimeString;
  endTime?: LocalDateTimeString;
};

export type ModuleType = 'READING' | 'LISTENING' | 'WRITING' | 'SPEAKING';

export type RecordState = 'ACTIVE' | 'DELETED';

export type ApiMessageResponse = {
  message: string;
  clearTokenRequired?: boolean;
  reloginRequired?: boolean;
};
