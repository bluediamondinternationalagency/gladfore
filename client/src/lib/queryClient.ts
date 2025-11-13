// client/src/lib/queryClient.ts
import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Throws an error if the response is not ok.
 */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * Generic API request helper
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<any> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";

/**
 * Default query function for react-query
 */
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = Array.isArray(queryKey) ? queryKey[0] : queryKey;
    const params = Array.isArray(queryKey) && queryKey[1] ? queryKey[1] : undefined;

    const res = await fetch(url, {
      method: params ? "POST" : "GET",
      headers: params ? { "Content-Type": "application/json" } : {},
      body: params ? JSON.stringify(params) : undefined,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return res.json();
  };

/**
 * React Query client
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
