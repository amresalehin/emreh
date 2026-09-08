import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
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
 * Helper: Validate and sanitize target URL
 */
function isValidHttpUrl(stringUrl: string): boolean {
  try {
    const parsed = new URL(stringUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Universal Resilient CORS Proxy (/api/proxy/fetch)
 * Supports GET/POST with custom headers, query params, and body forwarding.
 * Propagates upstream status codes, rate limits, and content types safely.
 */
app.all('/api/proxy/fetch', async (req: Request, res: Response): Promise<void> => {
  const targetUrl = (req.query.url as string) || req.body?.url;

  if (!targetUrl || typeof targetUrl !== 'string' || !isValidHttpUrl(targetUrl)) {
    res.status(400).json({
      ok: false,
      error: 'Invalid or missing target URL. Must start with http:// or https://'
    });
    return;
  }

  const method = (req.body?.method || req.method || 'GET').toUpperCase();
  const forwardHeaders: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 MyLifeSync/1.0',
    'Accept': req.headers['accept'] || '*/*'
  };

  // Forward authorization if provided
  const authHeader = req.headers['authorization'] || req.body?.headers?.['Authorization'] || req.body?.headers?.['authorization'];
  if (authHeader) {
    forwardHeaders['Authorization'] = authHeader;
  }

  // Forward custom headers from client if requested
  if (req.body?.headers && typeof req.body.headers === 'object') {
    Object.entries(req.body.headers).forEach(([k, v]) => {
      if (typeof v === 'string' && !['host', 'connection', 'content-length'].includes(k.toLowerCase())) {
        forwardHeaders[k] = v;
      }
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20-second timeout

  try {
    const fetchOptions: RequestInit = {
      method: method === 'GET' || method === 'HEAD' ? 'GET' : method,
      headers: forwardHeaders,
      signal: controller.signal
    };

    if (method !== 'GET' && method !== 'HEAD' && req.body?.data) {
      fetchOptions.body = typeof req.body.data === 'string' ? req.body.data : JSON.stringify(req.body.data);
      if (!forwardHeaders['Content-Type'] && !forwardHeaders['content-type']) {
        forwardHeaders['Content-Type'] = 'application/json';
      }
    }

    const upstreamRes = await fetch(targetUrl, fetchOptions);
    clearTimeout(timeoutId);

    // Propagate rate limiting headers if upstream provided them
    const rateLimitRemaining = upstreamRes.headers.get('x-ratelimit-remaining');
    const rateLimitReset = upstreamRes.headers.get('x-ratelimit-reset');
    const retryAfter = upstreamRes.headers.get('retry-after');

    if (rateLimitRemaining) res.setHeader('X-RateLimit-Remaining', rateLimitRemaining);
    if (rateLimitReset) res.setHeader('X-RateLimit-Reset', rateLimitReset);
    if (retryAfter) res.setHeader('Retry-After', retryAfter);

    const contentType = upstreamRes.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    // If upstream errored, provide structured status
    if (!upstreamRes.ok) {
      const errorBody = await upstreamRes.text();
      res.status(upstreamRes.status);
      try {
        const jsonError = JSON.parse(errorBody);
        res.json({
          ok: false,
          upstreamStatus: upstreamRes.status,
          error: jsonError.message || jsonError.errorMessage || jsonError.error || errorBody.slice(0, 300),
          rateLimitRemaining,
          rateLimitReset,
          retryAfter,
          raw: jsonError
        });
      } catch {
        res.send(errorBody);
      }
      return;
    }

    const dataBuffer = await upstreamRes.arrayBuffer();
    res.status(upstreamRes.status).send(Buffer.from(dataBuffer));
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err.name === 'AbortError';
    res.status(isTimeout ? 504 : 502).json({
      ok: false,
      error: isTimeout
        ? 'Proxy Request Timeout: Target server took longer than 20 seconds to respond.'
        : `Proxy Fetch Error: ${err.message || 'Unable to connect to target server.'}`,
      targetUrl,
      isTimeout
    });
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
  if (!feedUrl || !isValidHttpUrl(feedUrl)) {
    res.status(400).json({
      ok: false,
      error: 'Valid RSS feed URL required (http:// or https://)'
    });
    return;
  }

  try {
    const upstreamRes = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MyLifeReader/1.0; +https://mylife.app)',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*'
      }
    });

    if (!upstreamRes.ok) {
      res.status(upstreamRes.status).json({
        ok: false,
        error: `Feed source returned status ${upstreamRes.status}`,
        feedUrl
      });
      return;
    }

    const xml = await upstreamRes.text();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(xml);
  } catch (err: any) {
    res.status(502).json({
      ok: false,
      error: `Failed to fetch RSS feed: ${err.message || 'Network error'}`,
      feedUrl
    });
  }
});

/**
 * Website Metadata & OpenGraph Scraper (/api/proxy/metadata)
 */
app.get('/api/proxy/metadata', async (req: Request, res: Response): Promise<void> => {
  const targetUrl = req.query.url as string;
  if (!targetUrl || !isValidHttpUrl(targetUrl)) {
    res.status(400).json({ ok: false, error: 'Valid URL parameter required.' });
    return;
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 MyLifeBot/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!upstream.ok) {
      res.status(upstream.status).json({ ok: false, status: upstream.status, error: 'Target URL unreachable' });
      return;
    }

    const html = await upstream.text();
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

// Vite middleware & Static Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MyLife Server] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
