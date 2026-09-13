import type { Plugin } from 'vite';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

/**
 * Helper to parse JSON body from incoming Node.js IncomingMessage
 */
async function parseJsonBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk: any) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

/**
 * Vite plugin for Box Cloud OAuth and API proxy.
 * OAuth client credentials are server-side only; the browser may provide the
 * authorization code and redirect URI, but never a client secret.
 */
export function boxVitePlugin(): Plugin {
  return {
    name: 'vite-box-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        if (!url.startsWith('/api/box/')) return next();

        const parsedUrl = new URL(url, 'http://localhost');
        const pathname = parsedUrl.pathname;

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE, PUT');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        try {
          if (pathname === '/api/box/config' && req.method === 'GET') {
            const clientId = (process.env.BOX_CLIENT_ID || '').trim();
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({
              configured: Boolean(clientId && process.env.BOX_CLIENT_SECRET),
              clientId
            }));
            return;
          }

          if (pathname === '/api/box/oauth/token' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const { code, redirectUri } = body;
            const clientId = (process.env.BOX_CLIENT_ID || '').trim();
            const clientSecret = (process.env.BOX_CLIENT_SECRET || '').trim();

            if (!code) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing authorization code' }));
              return;
            }

            if (!clientId || !clientSecret) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Box OAuth is not configured on the server' }));
              return;
            }

            const formData = new URLSearchParams();
            formData.append('grant_type', 'authorization_code');
            formData.append('code', code);
            formData.append('client_id', clientId);
            formData.append('client_secret', clientSecret);
            if (redirectUri) formData.append('redirect_uri', redirectUri);

            const boxRes = await fetch('https://api.box.com/oauth2/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: formData.toString()
            });

            const boxData = await boxRes.json();
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = boxRes.status;
            res.end(JSON.stringify(boxData));
            return;
          }

          if (pathname === '/api/box/oauth/refresh' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const { refreshToken } = body;
            const clientId = (process.env.BOX_CLIENT_ID || '').trim();
            const clientSecret = (process.env.BOX_CLIENT_SECRET || '').trim();

            if (!refreshToken) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing refresh token' }));
              return;
            }

            if (!clientId || !clientSecret) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Box OAuth is not configured on the server' }));
              return;
            }

            const formData = new URLSearchParams();
            formData.append('grant_type', 'refresh_token');
            formData.append('refresh_token', refreshToken);
            formData.append('client_id', clientId);
            formData.append('client_secret', clientSecret);

            const boxRes = await fetch('https://api.box.com/oauth2/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: formData.toString()
            });

            const boxData = await boxRes.json();
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = boxRes.status;
            res.end(JSON.stringify(boxData));
            return;
          }

          if (pathname === '/api/box/proxy') {
            const authHeader = req.headers['authorization'];
            const endpoint = parsedUrl.searchParams.get('endpoint') || '';

            if (!endpoint || !endpoint.startsWith('/2.0/')) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid Box API endpoint' }));
              return;
            }

            if (!authHeader || typeof authHeader !== 'string') {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 401;
              res.end(JSON.stringify({ error: 'Missing Box Authorization header' }));
              return;
            }

            const targetUrl = `https://api.box.com${endpoint}`;
            const headers: Record<string, string> = {
              Authorization: authHeader,
              Accept: 'application/json'
            };
            if (req.headers['content-type']) headers['Content-Type'] = String(req.headers['content-type']);

            let fetchBody: string | undefined;
            if (['POST', 'PUT', 'PATCH'].includes(req.method || '')) {
              const body = await parseJsonBody(req);
              fetchBody = JSON.stringify(body);
            }

            const boxRes = await fetch(targetUrl, {
              method: req.method,
              headers,
              body: fetchBody
            });

            const resText = await boxRes.text();
            res.setHeader('Content-Type', boxRes.headers.get('content-type') || 'application/json');
            res.statusCode = boxRes.status;
            res.end(resText);
            return;
          }

          next();
        } catch (err: any) {
          console.error('[Box API Plugin Error]:', err);
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err?.message || 'Internal Box Plugin Error' }));
        }
      });
    }
  };
}
