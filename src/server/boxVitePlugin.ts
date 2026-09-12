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
 * Vite plugin for Box Cloud OAuth and API proxy
 */
export function boxVitePlugin(): Plugin {
  return {
    name: 'vite-box-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';

        // Only intercept /api/box/* routes
        if (!url.startsWith('/api/box/')) {
          return next();
        }

        const parsedUrl = new URL(url, 'http://localhost');
        const pathname = parsedUrl.pathname;

        // Set standard CORS and JSON headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE, PUT');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        try {
          // 1. GET /api/box/config
          if (pathname === '/api/box/config' && req.method === 'GET') {
            const clientId = process.env.BOX_CLIENT_ID || '';
            const hasSecret = Boolean(process.env.BOX_CLIENT_SECRET);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                configured: Boolean(clientId),
                clientId: clientId ? clientId.trim() : '',
                hasSecret
              })
            );
            return;
          }

          // 2. POST /api/box/oauth/token (Exchange Code for Access & Refresh Token)
          if (pathname === '/api/box/oauth/token' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const { code, redirectUri, clientId, clientSecret } = body;

            const effectiveClientId = (clientId || process.env.BOX_CLIENT_ID || '').trim();
            const effectiveClientSecret = (clientSecret || process.env.BOX_CLIENT_SECRET || '').trim();

            if (!code) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing authorization code' }));
              return;
            }

            if (!effectiveClientId) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 400;
              res.end(
                JSON.stringify({
                  error: 'BOX_CLIENT_ID is not configured in environment or provided in request'
                })
              );
              return;
            }

            if (!effectiveClientSecret) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 400;
              res.end(
                JSON.stringify({
                  error: 'BOX_CLIENT_SECRET is not configured in environment or provided in request'
                })
              );
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
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: formData.toString()
            });

            const boxData = await boxRes.json();
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = boxRes.status;
            res.end(JSON.stringify(boxData));
            return;
          }

          // 3. POST /api/box/oauth/refresh (Refresh Access Token)
          if (pathname === '/api/box/oauth/refresh' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const { refreshToken, clientId, clientSecret } = body;

            const effectiveClientId = (clientId || process.env.BOX_CLIENT_ID || '').trim();
            const effectiveClientSecret = (clientSecret || process.env.BOX_CLIENT_SECRET || '').trim();

            if (!refreshToken) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing refresh token' }));
              return;
            }

            const formData = new URLSearchParams();
            formData.append('grant_type', 'refresh_token');
            formData.append('refresh_token', refreshToken);
            formData.append('client_id', effectiveClientId);
            formData.append('client_secret', effectiveClientSecret);

            const boxRes = await fetch('https://api.box.com/oauth2/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: formData.toString()
            });

            const boxData = await boxRes.json();
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = boxRes.status;
            res.end(JSON.stringify(boxData));
            return;
          }

          // 4. API Proxy for Box API (handles CORS seamlessly)
          // /api/box/proxy?endpoint=/2.0/users/me
          if (pathname.startsWith('/api/box/proxy')) {
            const authHeader = req.headers['authorization'];
            const endpoint = parsedUrl.searchParams.get('endpoint') || '';

            if (!endpoint) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing Box API endpoint query param' }));
              return;
            }

            const targetUrl = `https://api.box.com${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
            const headers: Record<string, string> = {};
            if (authHeader) headers['Authorization'] = authHeader as string;
            if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'] as string;

            let fetchBody: any = undefined;
            if (['POST', 'PUT', 'PATCH'].includes(req.method || '')) {
              fetchBody = await parseJsonBody(req);
            }

            const boxRes = await fetch(targetUrl, {
              method: req.method,
              headers,
              body: fetchBody ? JSON.stringify(fetchBody) : undefined
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
          res.end(JSON.stringify({ error: err.message || 'Internal Box Plugin Error' }));
        }
      });
    }
  };
}
