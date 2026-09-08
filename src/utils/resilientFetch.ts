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
  | 'auth'         // 401: Token invalid or expired
  | 'forbidden'    // 403: Scope/permission error or anti-bot block
  | 'rate_limit'   // 429: Too many requests
  | 'not_found'    // 404: Board / Collection / URL not found
  | 'network'      // Network offline, timeout, or CORS block
  | 'server'       // 500-504: Remote upstream failure
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

/**
 * Extracts rate-limit metadata from headers
 */
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
      // Could be epoch seconds or epoch milliseconds
      const date = resetNum > 1e11 ? new Date(resetNum) : new Date(resetNum * 1000);
      details.resetDate = date;
      const secDiff = Math.max(0, Math.ceil((date.getTime() - Date.now()) / 1000));
      if (!details.retryAfterSeconds && secDiff > 0) {
        details.retryAfterSeconds = secDiff;
      }
      hasDetails = true;
    }
  }

  return hasDetails ? details : undefined;
}

/**
 * Maps HTTP status codes and error contexts to user-friendly messages and error categories.
 */
export function categorizeSyncError(
  status: number,
  defaultMsg?: string,
  rateLimit?: RateLimitDetails
): { category: SyncErrorCategory; message: string } {
  if (status === 401) {
    return {
      category: 'auth',
      message: 'API Token is invalid or has expired. Please verify or re-generate your token in your service account settings.'
    };
  }

  if (status === 403) {
    return {
      category: 'forbidden',
      message: 'Access forbidden. Your token does not have permission for this resource, or anti-scraping protections blocked access.'
    };
  }

  if (status === 404) {
    return {
      category: 'not_found',
      message: 'The requested resource, collection, board, or feed URL could not be found (HTTP 404).'
    };
  }

  if (status === 429) {
    const sec = rateLimit?.retryAfterSeconds;
    return {
      category: 'rate_limit',
      message: sec
        ? `API rate limit reached. The service requires waiting ${sec} seconds before trying again.`
        : 'API rate limit reached. Please wait a moment before retrying.'
    };
  }

  if (status >= 500 && status <= 504) {
    return {
      category: 'server',
      message: `Upstream service error (HTTP ${status}). The remote provider is temporarily experiencing downtime or high load.`
    };
  }

  if (status === 0) {
    return {
      category: 'network',
      message: 'Network request blocked by browser CORS security policy or connection offline. Routing via backend proxy...'
    };
  }

  return {
    category: 'unknown',
    message: defaultMsg || `Request failed with HTTP status ${status}.`
  };
}

/**
 * Resilient fetcher:
 * 1. Attempts direct fetch first.
 * 2. If blocked by CORS (TypeError: Failed to fetch) or returns HTTP 0,
 *    seamlessly switches to the Express backend proxy (/api/proxy/fetch).
 */
export async function resilientFetch<T = any>(
  url: string,
  options: RequestInit & { forceProxy?: boolean; timeoutMs?: number } = {}
): Promise<ResilientResponse<T>> {
  const { forceProxy = false, timeoutMs = 15000, ...fetchOptions } = options;

  // If forceProxy is requested, skip direct attempt
  if (!forceProxy) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal
      });
      clearTimeout(timer);

      const rateLimit = extractRateLimitDetails(res.headers);
      const isJson = (res.headers.get('content-type') || '').includes('application/json');

      if (!res.ok) {
        let errorText = '';
        try {
          const body = await res.text();
          try {
            const parsed = JSON.parse(body);
            errorText = parsed.message || parsed.error || body.slice(0, 200);
          } catch {
            errorText = body.slice(0, 200);
          }
        } catch {}

        const errInfo = categorizeSyncError(res.status, errorText, rateLimit);

        // If 403 or blocked, try backend proxy as secondary fallback
        if (res.status === 403 || res.status === 502 || res.status === 503) {
          console.warn(`[resilientFetch] HTTP ${res.status} on direct fetch for ${url}. Attempting backend proxy fallback...`);
          return resilientProxyFetch<T>(url, fetchOptions, timeoutMs);
        }

        return {
          ok: false,
          status: res.status,
          error: errInfo.message,
          category: errInfo.category,
          rateLimit,
          isProxied: false,
          sourceUrl: url
        };
      }

      const data = isJson ? await res.json() : await res.text();
      return {
        ok: true,
        status: res.status,
        data: data as T,
        rawText: typeof data === 'string' ? data : undefined,
        rateLimit,
        isProxied: false,
        sourceUrl: url
      };
    } catch (directErr: any) {
      // CORS block, network error, or timeout — seamlessly fallback to Express proxy!
      console.info(`[resilientFetch] Direct fetch failed (${directErr.message || 'CORS'}). Routing through backend proxy...`);
    }
  }

  // Fallback to Express backend proxy
  return resilientProxyFetch<T>(url, fetchOptions, timeoutMs);
}

/**
 * Routes request through the Express backend /api/proxy/fetch
 */
async function resilientProxyFetch<T = any>(
  url: string,
  fetchOptions: RequestInit,
  timeoutMs = 20000
): Promise<ResilientResponse<T>> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const headersObj: Record<string, string> = {};
    if (fetchOptions.headers) {
      if (fetchOptions.headers instanceof Headers) {
        fetchOptions.headers.forEach((v, k) => { headersObj[k] = v; });
      } else if (Array.isArray(fetchOptions.headers)) {
        fetchOptions.headers.forEach(([k, v]) => { headersObj[k] = v; });
      } else {
        Object.assign(headersObj, fetchOptions.headers);
      }
    }

    const proxyRes = await fetch('/api/proxy/fetch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        method: fetchOptions.method || 'GET',
        headers: headersObj,
        data: fetchOptions.body
      }),
      signal: controller.signal
    });
    clearTimeout(timer);

    const rateLimit = extractRateLimitDetails(proxyRes.headers);
    const contentType = proxyRes.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (!proxyRes.ok) {
      let errMessage = '';
      try {
        const errJson = await proxyRes.json();
        errMessage = errJson.error || errJson.message || `Proxy error ${proxyRes.status}`;
      } catch {
        errMessage = await proxyRes.text();
      }

      const errInfo = categorizeSyncError(proxyRes.status, errMessage, rateLimit);
      return {
        ok: false,
        status: proxyRes.status,
        error: errInfo.message,
        category: errInfo.category,
        rateLimit,
        isProxied: true,
        sourceUrl: url
      };
    }

    const data = isJson ? await proxyRes.json() : await proxyRes.text();
    return {
      ok: true,
      status: proxyRes.status,
      data: data as T,
      rawText: typeof data === 'string' ? data : undefined,
      rateLimit,
      isProxied: true,
      sourceUrl: url
    };
  } catch (proxyErr: any) {
    const isTimeout = proxyErr.name === 'AbortError';
    return {
      ok: false,
      status: isTimeout ? 504 : 0,
      error: isTimeout
        ? 'Sync timed out after 20 seconds. The remote server is responding very slowly.'
        : `Connection failed: ${proxyErr.message || 'Unable to connect to server backend proxy.'}`,
      category: 'network',
      isProxied: true,
      sourceUrl: url
    };
  }
}

/**
 * Resilient RSS / XML Feed fetcher:
 * Tries direct fetch first, then seamlessly falls back to /api/proxy/rss
 */
export async function resilientFetchRss(rssUrl: string): Promise<{ ok: boolean; xmlText: string; error?: string }> {
  try {
    const directRes = await fetch(rssUrl, {
      headers: { Accept: 'application/rss+xml, application/xml, text/xml, */*' }
    });
    if (directRes.ok) {
      const text = await directRes.text();
      if (text.includes('<rss') || text.includes('<feed') || text.includes('<channel') || text.includes('<xml')) {
        return { ok: true, xmlText: text };
      }
    }
  } catch {
    // CORS blocked; proceed to proxy
  }

  try {
    const proxyRes = await fetch(`/api/proxy/rss?url=${encodeURIComponent(rssUrl)}`);
    if (proxyRes.ok) {
      const text = await proxyRes.text();
      return { ok: true, xmlText: text };
    }
    const err = await proxyRes.json().catch(() => ({ error: `Status ${proxyRes.status}` }));
    return { ok: false, xmlText: '', error: err.error || 'RSS feed fetch failed' };
  } catch (e: any) {
    return { ok: false, xmlText: '', error: e.message || 'Network error fetching RSS feed' };
  }
}
