import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { toApiUrl } from "./api-url";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

function getBodyPreview(value: string, maxLength = 180): string {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export async function parseJsonResponse<T>(res: Response): Promise<T> {
  const contentType = (res.headers.get("content-type") || "").toLowerCase();

  if (!contentType.includes("application/json")) {
    const rawBody = await res.text();
    const preview = getBodyPreview(rawBody);
    throw new Error(
      `Expected JSON but received ${contentType || "unknown content type"} from ${
        res.url || "API"
      }. Set VITE_API_BASE_URL to your backend URL. Response: ${preview || "[empty]"}`,
    );
  }

  return (await res.json()) as T;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers = new Headers();
  headers.set("Accept", "application/json");
  if (data) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(toApiUrl(url), {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export function getQueryFn<T>(options: {
  on401: UnauthorizedBehavior;
}): QueryFunction<T> {
  return async ({ queryKey }) => {
    const unauthorizedBehavior = options.on401;
    const res = await fetch(toApiUrl(queryKey.join("/") as string), {
      headers: {
        Accept: "application/json",
      },
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null as T;
    }

    await throwIfResNotOk(res);
    return (await parseJsonResponse<unknown>(res)) as T;
  };
}

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
