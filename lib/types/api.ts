export interface ApiSuccessResponse<T = unknown> {
  status: 'success';
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  status: 'error';
  message: string;
  error: string;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
