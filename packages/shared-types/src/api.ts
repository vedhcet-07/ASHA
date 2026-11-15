export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta: {
    request_id: string;
    timestamp: string;
    next_cursor?: string;
    has_more?: boolean;
    limit?: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      issue: string;
    }>;
  };
  meta: {
    request_id: string;
    timestamp: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
