const rawApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "";
const apiBase = rawApiBase.replace(/\/+$/, "");

export function toApiUrl(path: string): string {
  if (!apiBase) return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${apiBase}${path.startsWith("/") ? path : `/${path}`}`;
}

