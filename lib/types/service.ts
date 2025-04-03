export interface ServiceResult<T> {
  success: boolean;
  data: T | null;
  error?: string | null;
  code?: string; // Optional error code for programmatic handling
}
