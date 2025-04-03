'use client';

import { SWRConfig } from 'swr';

const fetcher = <T = unknown,>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> => {
  return fetch(input, init).then((res) => {
    if (!res.ok) {
      throw new Error(`Request failed with status ${res.status}`);
    }
    return res.json() as Promise<T>;
  });
};

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={{ fetcher }}>{children}</SWRConfig>;
}
