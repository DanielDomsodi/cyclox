import { ServiceResult } from '../types/service';

// Success helper function
export function serviceSuccess<T>(data: T): ServiceResult<T> {
  return {
    success: true,
    data,
    error: null,
  };
}

// Error helper function
export function serviceError<T = never>(
  error: string,
  code?: string
): ServiceResult<T> {
  return {
    success: false,
    data: null,
    error,
    code,
  };
}
