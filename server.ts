import express, { Request, Response } from 'express';
import path from 'path';
import dns from 'node:dns/promises';
import net from 'node:net';
import { createServer as createViteServer } from 'vite';

const app = express();

// In development, the app runs with Vite middleware behind AI Studio's dev reverse proxy (port 3000).
// In production deployment (e.g. Cloud Run), process.env.PORT is provided by the container runtime.
const isProduction = process.env.NODE_ENV === 'production' || (typeof __filename !== 'undefined' && __filename.endsWith('.cjs'));
const PORT = 3000;

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'mylife-proxy-server',
    timestamp: new Date().toISOString()
  });
});

/**
 * SSRF-safe outbound URL validation.
 *
 * The old implementation only checked a few IPv4 string prefixes before allowing
 * arbitrary server-side requests. This version resolves hostnames and rejects
 * loopback, private, link-local, multicast, unspecified and other reserved IPs.
 */
function isForbiddenIp(address: string): boolean {
  const normalized = address.toLowerCase();
  const version = net.isIP(normalized);
  if (!version) return true;

  if (version === 4) {
    const octets = normalized.split('.').map(Number);
    const [a, b] = octets;
    if (a === 0) return true;                    // 0.0.0.0/8
    if (a === 10) return true;                   // RFC1918
    if (a === 127) return true;                  // loopback
    if (a === 169 && b === 254) return true;     // link-local
    if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
    if (a === 192 && b === 168) return true;    // RFC1918
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a === 192 && b === 0) return true;       // IETF protocol assignments
    if (a === 198 && (b === 18 || b === 19)) return true; // benchmark
    if (a >= 224) return true;                   // multicast/reserved
    return false;
  }

  // IPv6: reject loopback, unspecified, link-local, unique-local, multicast,
  // documentation, IPv4-mapped private/loopback addresses, etc.
  const hex = normalized.replace(/^\[|\]$/g, '');
  if (hex === '::' || hex === '::1') return true;
  if (hex.startsWith('fe8') || hex.startsWith('fe9') || hex.startsWith('fea') || hex.startsWith('feb')) return true; // fe80::/10
  if (hex.startsWith('fc') || hex.startsWith('fd')) return true; // fc00::/7
  if (hex.startsWith('ff')) return true; // ff00::/8

  const mapped = hex.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return isForbiddenIp(mapped[1]);

  return false;
}

async function validateOutboundUrl(stringUrl: string): Promise<URL> {
  const parsed = new URL(stringUrl);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http:// and https:// URLs are permitted');
  }
  if (parsed.username || parsed.password) {
    throw new Error('URLs containing embedded credentials are not permitted');
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!hostname || hostname === 'localhost') {
    throw new Error('Local hostnames are not permitted');
  }

  if (net.isIP(hostname)) {
    if (isForbiddenIp(hostname)) {
      throw new Error('Private, local, link-local, multicast, or reserved IP addresses are not permitted');
    }
    return parsed;
  }

  // Resolve all addresses so a public-looking hostname cannot point at an
  // internal/private destination. All returned addresses must be safe.
  const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(entry => isForbiddenIp(entry.address))) {
    throw new Error('Hostname resolves to a private, local, link-local, multicast, or reserved IP address');
  }

  return parsed;
}

const MAX_PROXY_RESPONSE_BYTES = 15 * 1024 * 1024;
const MAX_METADATA_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_RSS_RESPONSE_BYTES = 5 * 1024 * 1024;

async function readResponseWithLimit(response: globalThis.Response, maxBytes: number): Promise<Buffer> {
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > maxBytes) {
    throw new Error(`Upstream response exceeds the ${maxBytes} byte limit`);
  }

  const reader = response.body?.getReader();
  if (!reader) return Buffer.from(await response.arrayBuffer());

  const chunks: Buffer[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error(`Upstream response exceeds the ${maxBytes} byte limit`);
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, total);
}

async function safeFetchWithRedirects(
  targetUrl: string,
  init: RequestInit,
  maxResponseBytes: number,
  maxRedirects = 3
): Promise<{ response: globalThis.Response; finalUrl: URL }> {
  let currentUrl = await validateOutboundUrl(targetUrl);

  for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
    const response = await fetch(currentUrl, {
      ...init,
      redirect: 'manual'
    });

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      const declared = Number(response.headers.get('content-length') || 0);
      if (declared > maxResponseBytes) {
        throw new Error(`Upstream response exceeds the ${maxResponseBytes} byte limit`);
      }
      return { response, finalUrl: currentUrl };
    }

    if (redirect === maxRedirects) {
      throw new Error('Too many upstream redirects');
    }

    const location = response.headers.get('location');
    if (!location) {
      throw new Error('Upstream redirect did not provide a Location header');
    }
    currentUrl = await validateOutboundUrl(new URL(location, currentUrl).toString());
  }

  throw new Error('Unable to resolve upstream URL');
}

/**
 * Dedicated generic proxy only for existing app callers.
 * It is deliberately restricted to GET/HEAD so it cannot be used as an
 * arbitrary cross-site write primitive, and outbound validation is performed
 * before every request and redirect.
 */
app.all('/api/proxy/fetch', async (req: Request, res: Response): Promise<void> => {
  const targetUrl = (req.query.url as string) || req.body?.url;

  if (!targetUrl || typeof targetUrl !== 'string') {
    res.status(400).json({ ok: false, error: 'Missing target URL' });
    return;
  }

  const method = String(req.body?.method || req.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    res.status(405).json({ ok: false, error: 'Proxy only permits GET and HEAD requests' });
    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const upstream = await safeFetchWithRedirects(
      targetUrl,
      {
        method,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; EmrehProxy/1.0)',
          'Accept': req.headers['accept'] || '*/*'
        },
        signal: controller.signal
      },
      MAX_PROXY_RESPONSE_BYTES
    );

    const upstreamRes = upstream.response;
    const rateLimitRemaining = upstreamRes.headers.get('x-ratelimit-remaining');
    const rateLimitReset = upstreamRes.headers.get('x-ratelimit-reset');
    const retryAfter = upstreamRes.headers.get('retry-after');

    if (rateLimitRemaining) res.setHeader('X-RateLimit-Remaining', rateLimitRemaining);
    if (rateLimitReset) res.setHeader('X-RateLimit-Reset', rateLimitReset);
    if (retryAfter) res.setHeader('Retry-After', retryAfter);

    const contentType = upstreamRes.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    if (!upstreamRes.ok) {
      const errorBody = await readResponseWithLimit(upstreamRes, 512 * 1024);
      const errorText = errorBody.toString('utf8');
      res.status(upstreamRes.status);
      try {
        const jsonError = JSON.parse(errorText);
        res.json({
          ok: false,
          upstreamStatus: upstreamRes.status,
          error: jsonError.message || jsonError.errorMessage || jsonError.error || errorText.slice(0, 300),
          rateLimitRemaining,
          rateLimitReset,
          retryAfter
        });
      } catch {
        res.send(errorText);
      }
      return;
    }

    if (method === 'HEAD') {
      res.status(upstreamRes.status).end();
      return;
    }

    const dataBuffer = await readResponseWithLimit(upstreamRes, MAX_PROXY_RESPONSE_BYTES);
    res.status(upstreamRes.status).send(dataBuffer);
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err?.name === 'AbortError';
    res.status(isTimeout ? 504 : 502).json({
      ok: false,
      error: isTimeout
        ? 'Proxy request timed out.'
        : err?.message || 'Unable to connect to target server.'
    });
    return;
  } finally {
    clearTimeout(timeoutId);
  }
});

/**
 * Dedicated Raindrop API Proxy (/api/sync/raindrop)
 * Forwards requests to https://api.raindrop.io/rest/v1/...
 */
app.all('/api/sync/raindrop', async (req: Request, res: Response): Promise<void> => {
  const endpoint = (req.query.path as string) || req.body?.path || 'user';
  const cleanEndpoint = endpoint.replace(/^\//, '');
  const targetUrl = `https://api.raindrop.io/rest/v1/${cleanEndpoint}`;

  const token = req.headers['authorization'] || req.body?.token;
  if (!token) {
    res.status(401).json({
      ok: false,
      error: 'Missing Raindrop Authorization Bearer token.'
    });
    return;
  }

  const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'User-Agent': 'MyLifeApp/1.0'
      }
    });

    const rateLimitRemaining = upstreamRes.headers.get('x-ratelimit-remaining');
    const rateLimitReset = upstreamRes.headers.get('x-ratelimit-reset');
    const retryAfter = upstreamRes.headers.get('retry-after');

    if (rateLimitRemaining) res.setHeader('X-RateLimit-Remaining', rateLimitRemaining);
    if (rateLimitReset) res.setHeader('X-RateLimit-Reset', rateLimitReset);
    if (retryAfter) res.setHeader('Retry-After', retryAfter);

    const json = await upstreamRes.json();
    res.status(upstreamRes.status).json(json);
  } catch (err: any) {
    res.status(502).json({
      ok: false,
      error: `Raindrop Proxy Connection Error: ${err.message || 'Failed to communicate with Raindrop.io'}`
    });
  }
});

/**
 * Dedicated Pinterest API & RSS Proxy (/api/sync/pinterest)
 */
app.all('/api/sync/pinterest', async (req: Request, res: Response): Promise<void> => {
  const endpoint = (req.query.path as string) || req.body?.path || 'user_account';
  const cleanEndpoint = endpoint.replace(/^\//, '');
  const targetUrl = `https://api.pinterest.com/v5/${cleanEndpoint}`;

  const token = req.headers['authorization'] || req.body?.token;
  if (!token) {
    res.status(401).json({
      ok: false,
      error: 'Missing Pinterest Authorization Bearer token.'
    });
    return;
  }

  const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'User-Agent': 'MyLifeApp/1.0'
      }
    });

    const rateLimitRemaining = upstreamRes.headers.get('x-ratelimit-remaining');
    const retryAfter = upstreamRes.headers.get('retry-after');

    if (rateLimitRemaining) res.setHeader('X-RateLimit-Remaining', rateLimitRemaining);
    if (retryAfter) res.setHeader('Retry-After', retryAfter);

    const json = await upstreamRes.json();
    res.status(upstreamRes.status).json(json);
  } catch (err: any) {
    res.status(502).json({
      ok: false,
      error: `Pinterest Proxy Error: ${err.message || 'Failed to reach Pinterest API'}`
    });
  }
});

/**
 * Dedicated RSS / XML Feed Proxy (/api/proxy/rss)
 * Reliably pulls RSS XML feeds without browser CORS or origin restrictions
 */
app.get('/api/proxy/rss', async (req: Request, res: Response): Promise<void> => {
  const feedUrl = req.query.url as string;
  if (!feedUrl || typeof feedUrl !== 'string') {
    res.status(400).json({
      ok: false,
      error: 'Valid RSS feed URL required'
    });
    return;
  }

  try {
    const upstream = await safeFetchWithRedirects(
      feedUrl,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; EmrehReader/1.0)',
          'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*'
        },
        signal: AbortSignal.timeout(10000)
      },
      MAX_RSS_RESPONSE_BYTES
    );

    if (!upstream.response.ok) {
      res.status(upstream.response.status).json({
        ok: false,
        error: `Feed source returned status ${upstream.response.status}`
      });
      return;
    }

    const xml = (await readResponseWithLimit(upstream.response, MAX_RSS_RESPONSE_BYTES)).toString('utf8');
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(xml);
  } catch (err: any) {
    res.status(502).json({
      ok: false,
      error: `Failed to fetch RSS feed: ${err.message || 'Network error'}`
    });
  }
});

/**
 * Website Metadata & OpenGraph Scraper (/api/proxy/metadata)
 */
app.get('/api/proxy/metadata', async (req: Request, res: Response): Promise<void> => {
  const targetUrl = req.query.url as string;
  if (!targetUrl || typeof targetUrl !== 'string') {
    res.status(400).json({ ok: false, error: 'Valid URL parameter required.' });
    return;
  }

  try {
    const upstream = await safeFetchWithRedirects(
      targetUrl,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; EmrehMetadata/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: AbortSignal.timeout(10000)
      },
      MAX_METADATA_RESPONSE_BYTES
    );

    if (!upstream.response.ok) {
      res.status(upstream.response.status).json({ ok: false, status: upstream.response.status, error: 'Target URL unreachable' });
      return;
    }

    const html = (await readResponseWithLimit(upstream.response, MAX_METADATA_RESPONSE_BYTES)).toString('utf8');
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                      html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i);
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i);

    let host = 'web';
    try {
      host = new URL(targetUrl).hostname.replace(/^www\./, '');
    } catch {}

    res.json({
      ok: true,
      title: titleMatch ? titleMatch[1].trim() : host,
      description: descMatch ? descMatch[1].trim() : '',
      image: ogImageMatch ? ogImageMatch[1].trim() : '',
      domain: host,
      favicon: `https://www.google.com/s2/favicons?domain=${host}&sz=64`
    });
  } catch (err: any) {
    res.status(502).json({ ok: false, error: err.message || 'Failed to scrape metadata' });
  }
});

// Box API Configuration & Proxy routes
app.get('/api/box/config', (_req: Request, res: Response) => {
  const clientId = process.env.BOX_CLIENT_ID || '';
  const hasSecret = Boolean(process.env.BOX_CLIENT_SECRET);
  res.json({
    configured: Boolean(clientId),
    clientId: clientId ? clientId.trim() : '',
    hasSecret
  });
});

app.post('/api/box/oauth/token', async (req: Request, res: Response) => {
  try {
    const { code, redirectUri, clientId, clientSecret } = req.body || {};
    const effectiveClientId = (clientId || process.env.BOX_CLIENT_ID || '').trim();
    const effectiveClientSecret = (clientSecret || process.env.BOX_CLIENT_SECRET || '').trim();

    if (!code) {
      res.status(400).json({ error: 'Missing authorization code' });
      return;
    }
    if (!effectiveClientId || !effectiveClientSecret) {
      res.status(400).json({ error: 'BOX_CLIENT_ID or BOX_CLIENT_SECRET not configured' });
      return;
    }

    const formData = new URLSearchParams();
    formData.append('grant_type', 'authorization_code');
    formData.append('code', code);
    formData.append('client_id', effectiveClientId);
    formData.append('client_secret', effectiveClientSecret);
    if (redirectUri) {
      formData.append('redirect_uri', redirectUri);
    }

    const boxRes = await fetch('https://api.box.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
    const boxData = await boxRes.json();
    res.status(boxRes.status).json(boxData);
  } catch (err: any) {
    res.status(502).json({ error: err.message || 'Box OAuth request failed' });
  }
});

