/**
 * Resilient Network & CORS Sync Utility
 *
 * Provides fallback routing through the local Express backend (/api/proxy/fetch, /api/sync/raindrop, etc.)
 * when direct browser fetch fails due to CORS, origin restrictions, or strict server policies.
 *
 * Also extracts granular rate-limiting headers (X-RateLimit-*, Retry-After) and creates actionable,
 * human-friendly error messages with countdown support.
 */

export interface RateLimitDetails {
  remaining?: number;
  resetDate?: Date;
  retryAfterSeconds?: number;
}

export type SyncErrorCategory =
  | 'auth'
  | 'forbidden'
  | 'rate_limit'
  | 'not_found'
  | 'network'
  | 'server'
  | 'unknown';

export interface ResilientResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  rawText?: string;
  error?: string;
  category?: SyncErrorCategory;
  rateLimit?: RateLimitDetails;
  isProxied: boolean;
  sourceUrl: string;
}

export function extractRateLimitDetails(headers: Headers): RateLimitDetails | undefined {
  const remainingStr = headers.get('x-ratelimit-remaining');
  const resetStr = headers.get('x-ratelimit-reset');
  const retryAfterStr = headers.get('retry-after');
  const details: RateLimitDetails = {};
  let hasDetails = false;

  if (remainingStr !== null) {
    const rem = parseInt(remainingStr, 10);
    if (!isNaN(rem)) {
      details.remaining = rem;
      hasDetails = true;
    }
  }

  if (retryAfterStr !== null) {
    const sec = parseInt(retryAfterStr, 10);
    if (!isNaN(sec)) {
      details.retryAfterSeconds = sec;
      hasDetails = true;
    }
  }

  if (resetStr !== null) {
    const resetNum = parseInt(resetStr, 10);
    if (!isNaN(resetNum)) {
      const date = resetNum > 1e11 ? new Date(resetNum) : new Date(resetNum * 1000);
      details.resetDate = date;
      const secDiff = Math.max(0, Math.ceil((date.getTime() - Date.now()) / 1000));
      if (details.retryAfterSeconds === undefined && secDiff > 0) details.retryAfterSeconds = secDiff;
      hasDetails = true;
    }
  }

  return hasDetails ? details : undefined;
}

export function categorizeSyncError(
  status: number,
  defaultMsg?: string,
  rateLimit?: RateLimitDetails
): { category: SyncErrorCategory; message: string } {
  if (status === 401) return { category: 'auth', message: 'API Token is invalid or has expired. Please verify or re-generate your token in your service account settings.' };
  if (status === 403) return { category: 'forbidden', message: 'Access forbidden. Your token does not have permission for this resource, or anti-scraping protections blocked access.' };
  if (status === 404) return { category: 'not_found', message: 'The requested resource, collection, board, or feed URL could not be found (HTTP 404).' };
  if (status === 429) {
    const sec = rateLimit?.retryAfterSeconds;
    return { category: 'rate_limit', message: sec !== undefined ? `API rate limit reached. The service requires waiting ${sec} seconds before trying again.` : 'API rate limit reached. Please wait a moment before retrying.' };
  }
  if (status >= 500 && status <= 504) return { category: 'server', message: `Upstream service error (HTTP ${status}). The remote provider is temporarily experiencing downtime or high load.` };
  if (status === 0) return { category: 'network', message: 'Network request blocked by browser CORS security policy or connection offline. Routing via backend proxy...' };
  return { category: 'unknown', message: defaultMsg || `Request failed with HTTP status ${status}.` };
}

/**
 * Resilient fetcher with an end-to-end timeout covering both header and body
 * consumption. Previously the timer was cleared immediately after fetch(), so
 * a connection that returned headers but stalled while reading the body could
 * hang indefinitely.
 */
export async function resilientFetch<T = any>(
  url: string,
  options: RequestInit & { forceProxy?: boolean; timeoutMs?: number } = {}
): Promise<ResilientResponse<T>> {
  const { forceProxy = false, timeoutMs = 15000, ...fetchOptions } = options;

  if (!forceProxy) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...fetchOptions, signal: controller.signal });
      const rateLimit = extractRateLimitDetails(res.headers);
      const isJson = (res.headers.get('content-type') || '').includes('application/json');

      let parsedData: unknown;
      let errorText = '';
      try {
        if (res.ok) {
          parsedData = isJson ? await res.json() : await res.text();
        } else {
          const body = await res.text();
          try {
            const parsed = JSON.parse(body);
            errorText = parsed.message || parsed.error || body.slice(0, 200);
          } catch {
            errorText = body.slice(0, 200);
          }
        }
      } catch (bodyErr: any) {
        if (bodyErr?.name === 'AbortError') throw bodyErr;
        throw bodyErr;
      }

      if (!res.ok) {
        const errInfo = categorizeSyncError(res.status, errorText, rateLimit);
        if ((res.status === 403 || res.status === 502 || res.status === 503) &&
            (fetchOptions.method || 'GET').toUpperCase() === 'GET') {
          console.warn(`[resilientFetch] HTTP ${res.status} on direct fetch for ${url}. Attempting backend proxy fallback...`);
          return resilientProxyFetch<T>(url, fetchOptions, timeoutMs);
        }
        return { ok: false, status: res.status, error: errInfo.message, category: errInfo.category, rateLimit, isProxied: false, sourceUrl: url };
      }

      return {
        ok: true,
        status: res.status,
        data: parsedData as T,
        rawText: typeof parsedData === 'string' ? parsedData : undefined,
        rateLimit,
        isProxied: false,
        sourceUrl: url
      };
    } catch (directErr: any) {
      console.info(`[resilientFetch] Direct fetch failed (${directErr.message || 'CORS'}). Routing through backend proxy...`);
    } finally {
      clearTimeout(timer);
    }
  }

  return resilientProxyFetch<T>(url, fetchOptions, timeoutMs);
}

async function resilientProxyFetch<T = any>(url: string, fetchOptions: RequestInit, timeoutMs = 20000): Promise<ResilientResponse<T>> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headersObj: Record<string, string> = {};
      if (fetchOptions.headers) {
        if (fetchOptions.headers instanceof Headers) fetchOptions.headers.forEach((v, k) => { headersObj[k] = v; });
        else if (Array.isArray(fetchOptions.headers)) fetchOptions.headers.forEach(([k, v]) => { headersObj[k] = v; });
        else Object.assign(headersObj, fetchOptions.headers);
      }

      const method = (fetchOptions.method || 'GET').toUpperCase();
      // The hardened generic server proxy accepts only GET/HEAD. Do not make a
      // request that is guaranteed to be rejected for mutation methods.
      if (method !== 'GET' && method !== 'HEAD') {
        return {
          ok: false,
          status: 405,
          error: 'Backend proxy fallback supports only GET and HEAD requests.',
          category: 'forbidden',
          isProxied: true,
          sourceUrl: url
        };
      }

      const proxyRes = await fetch('/api/proxy/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, method, headers: headersObj }),
        signal: controller.signal
      });

      const rateLimit = extractRateLimitDetails(proxyRes.headers);
      const contentType = proxyRes.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      let data: unknown;
      if (isJson) data = await proxyRes.json();
      else data = await proxyRes.text();

      if (!proxyRes.ok) {
        const errMessage = typeof data === 'object' && data !== null
          ? ((data as any).error || (data as any).message || `Proxy error ${proxyRes.status}`)
          : String(data || `Proxy error ${proxyRes.status}`);
        const errInfo = categorizeSyncError(proxyRes.status, errMessage, rateLimit);
        return { ok: false, status: proxyRes.status, error: errInfo.message, category: errInfo.category, rateLimit, isProxied: true, sourceUrl: url };
      }

      return { ok: true, status: proxyRes.status, data: data as T, rawText: typeof data === 'string' ? data : undefined, rateLimit, isProxied: true, sourceUrl: url };
    } finally {
      clearTimeout(timer);
    }
  } catch (proxyErr: any) {
    const isTimeout = proxyErr.name === 'AbortError';
    return {
      ok: false,
      status: isTimeout ? 504 : 0,
      error: isTimeout ? `Sync timed out after ${timeoutMs / 1000} seconds. The remote server is responding very slowly.` : `Connection failed: ${proxyErr.message || 'Unable to connect to server backend proxy.'}`,
      category: 'network',
      isProxied: true,
      sourceUrl: url
    };
  }
}

export async function resilientFetchRss(rssUrl: string): Promise<{ ok: boolean; xmlText: string; error?: string }> {
  try {
    const directController = new AbortController();
    const directTimer = setTimeout(() => directController.abort(), 15000);
    try {
      const directRes = await fetch(rssUrl, { headers: { Accept: 'application/rss+xml, application/xml, text/xml, */*' }, signal: directController.signal });
      if (directRes.ok) {
        const text = await directRes.text();
        if (text.includes('<rss') || text.includes('<feed') || text.includes('<channel') || text.includes('<xml')) return { ok: true, xmlText: text };
      }
    } finally {
      clearTimeout(directTimer);
    }
  } catch {
    // CORS blocked, network failure, or timeout; proceed to proxy.
  }

  try {
    const proxyController = new AbortController();
    const proxyTimer = setTimeout(() => proxyController.abort(), 15000);
    try {
      const proxyRes = await fetch(`/api/proxy/rss?url=${encodeURIComponent(rssUrl)}`, { signal: proxyController.signal });
      if (proxyRes.ok) return { ok: true, xmlText: await proxyRes.text() };
      const err = await proxyRes.json().catch(() => ({ error: `Status ${proxyRes.status}` }));
      return { ok: false, xmlText: '', error: err.error || 'RSS feed fetch failed' };
    } finally {
      clearTimeout(proxyTimer);
    }
  } catch (e: any) {
    return { ok: false, xmlText: '', error: e?.name === 'AbortError' ? 'RSS feed fetch timed out.' : e.message || 'Network error fetching RSS feed' };
  }
}
