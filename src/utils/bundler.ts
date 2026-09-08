import { VirtualFile, ZipProject } from '../types';
import { resolveRelativePath } from './fileSystem';

/**
 * Rewrites CSS content to map relative url(...) and @import to virtual Blob URLs
 */
export function rewriteCssContent(
  cssContent: string,
  cssFilePath: string,
  files: Map<string, VirtualFile>
): string {
  // Replace url('path') or url("path") or url(path)
  return cssContent.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (match, quote, rawUrl) => {
    const trimmed = rawUrl.trim();
    if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:') || /^(?:[a-z]+:)?\/\//i.test(trimmed)) {
      return match;
    }

    const resolvedPath = resolveRelativePath(cssFilePath, trimmed);
    const targetFile = files.get(resolvedPath);

    if (targetFile?.blobUrl) {
      return `url("${targetFile.blobUrl}")`;
    }

    return match;
  });
}

/**
 * Generates the bridge client script injected into the runner sandbox iframe
 */
export function generateRuntimeBridgeScript(
  currentHtmlPath: string,
  filesManifestJson: string
): string {
  return `
<script id="__zipapp_runner_bridge__">
(function() {
  const currentPath = ${JSON.stringify(currentHtmlPath)};
  const virtualFiles = ${filesManifestJson}; // map of normalizedPath -> { blobUrl, mimeType, size }

  function normalize(p) {
    let clean = (p || '').replace(/\\\\/g, '/').replace(/^\\/+/, '');
    const segs = clean.split('/');
    const res = [];
    for (const s of segs) {
      if (!s || s === '.') continue;
      if (s === '..') res.pop();
      else res.push(s);
    }
    return res.join('/');
  }

  function resolvePath(base, rel) {
    if (/^(?:[a-z]+:)?\\/\\//i.test(rel) || rel.startsWith('data:') || rel.startsWith('blob:') || rel.startsWith('#')) {
      return rel;
    }
    const cleanRel = rel.split(/[?#]/)[0];
    if (cleanRel.startsWith('/')) {
      return normalize(cleanRel);
    }
    const parts = base.split('/');
    parts.pop();
    const comb = parts.length > 0 ? parts.join('/') + '/' + cleanRel : cleanRel;
    return normalize(comb);
  }

  function postToParent(type, payload) {
    try {
      window.parent.postMessage({
        source: 'ZIPAPP_RUNNER_FRAME',
        type: type,
        payload: payload,
      }, '*');
    } catch(e) {}
  }

  // 1. Intercept Console Logs
  const origLog = console.log;
  const origInfo = console.info;
  const origWarn = console.warn;
  const origError = console.error;
  const origTable = console.table;
  const origClear = console.clear;

  function safeSerialize(args) {
    return Array.from(args).map(arg => {
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      if (typeof arg === 'function') return '[Function: ' + (arg.name || 'anonymous') + ']';
      if (typeof arg === 'symbol') return arg.toString();
      if (arg instanceof Error) return { name: arg.name, message: arg.message, stack: arg.stack };
      if (arg instanceof HTMLElement) return '<' + arg.tagName.toLowerCase() + (arg.id ? '#' + arg.id : '') + (arg.className ? '.' + arg.className.split(' ').join('.') : '') + '>';
      if (typeof arg === 'object') {
        try {
          return JSON.parse(JSON.stringify(arg));
        } catch (e) {
          return Object.prototype.toString.call(arg);
        }
      }
      return arg;
    });
  }

  console.log = function(...args) {
    origLog.apply(console, args);
    postToParent('CONSOLE_LOG', { type: 'log', args: safeSerialize(args), timestamp: new Date().toLocaleTimeString() });
  };
  console.info = function(...args) {
    origInfo.apply(console, args);
    postToParent('CONSOLE_LOG', { type: 'info', args: safeSerialize(args), timestamp: new Date().toLocaleTimeString() });
  };
  console.warn = function(...args) {
    origWarn.apply(console, args);
    postToParent('CONSOLE_LOG', { type: 'warn', args: safeSerialize(args), timestamp: new Date().toLocaleTimeString() });
  };
  console.error = function(...args) {
    origError.apply(console, args);
    postToParent('CONSOLE_LOG', { type: 'error', args: safeSerialize(args), timestamp: new Date().toLocaleTimeString() });
  };
  console.table = function(...args) {
    origTable.apply(console, args);
    postToParent('CONSOLE_LOG', { type: 'table', args: safeSerialize(args), timestamp: new Date().toLocaleTimeString() });
  };
  console.clear = function() {
    origClear.apply(console);
    postToParent('CONSOLE_CLEAR', {});
  };

  // Window Errors
  window.addEventListener('error', function(e) {
    postToParent('CONSOLE_LOG', {
      type: 'error',
      args: [e.message + (e.filename ? ' (' + e.filename.split('/').pop() + ':' + e.lineno + ':' + e.colno + ')' : '')],
      timestamp: new Date().toLocaleTimeString()
    });
  });

  window.addEventListener('unhandledrejection', function(e) {
    postToParent('CONSOLE_LOG', {
      type: 'error',
      args: ['Unhandled Promise Rejection: ' + (e.reason ? (e.reason.message || e.reason) : 'Unknown reason')],
      timestamp: new Date().toLocaleTimeString()
    });
  });

  // 2. Intercept Fetch for Virtual Files
  const origFetch = window.fetch;
  window.fetch = async function(resource, init) {
    const startTime = performance.now();
    let url = typeof resource === 'string' ? resource : (resource ? resource.url : '');
    const method = (init && init.method) || (typeof resource === 'object' && resource.method) || 'GET';

    if (url && !/^(?:[a-z]+:)?\\/\\//i.test(url) && !url.startsWith('data:') && !url.startsWith('blob:')) {
      const vPath = resolvePath(currentPath, url);
      const fileInfo = virtualFiles[vPath];

      if (fileInfo && fileInfo.blobUrl) {
        try {
          const resp = await origFetch(fileInfo.blobUrl, init);
          const timeMs = Math.round(performance.now() - startTime);
          postToParent('NETWORK_LOG', {
            url: url,
            virtualPath: vPath,
            method: method,
            status: 200,
            statusText: 'OK (Virtual)',
            mimeType: fileInfo.mimeType || 'text/plain',
            size: fileInfo.size || 0,
            timestamp: new Date().toLocaleTimeString(),
            timeMs: timeMs
          });
          return resp;
        } catch (err) {
          // fallback
        }
      } else {
        postToParent('NETWORK_LOG', {
          url: url,
          virtualPath: vPath,
          method: method,
          status: 404,
          statusText: 'Not Found in ZIP',
          mimeType: 'text/plain',
          size: 0,
          timestamp: new Date().toLocaleTimeString(),
          timeMs: Math.round(performance.now() - startTime)
        });
      }
    }

    try {
      const resp = await origFetch.apply(window, arguments);
      postToParent('NETWORK_LOG', {
        url: url,
        virtualPath: url,
        method: method,
        status: resp.status,
        statusText: resp.statusText,
        mimeType: resp.headers.get('content-type') || '',
        size: 0,
        timestamp: new Date().toLocaleTimeString(),
        timeMs: Math.round(performance.now() - startTime)
      });
      return resp;
    } catch (err) {
      postToParent('NETWORK_LOG', {
        url: url,
        virtualPath: url,
        method: method,
        status: 0,
        statusText: 'Network Error: ' + err.message,
        mimeType: '',
        size: 0,
        timestamp: new Date().toLocaleTimeString(),
        timeMs: Math.round(performance.now() - startTime)
      });
      throw err;
    }
  };

  // 3. Intercept XMLHttpRequest for Virtual Files
  const OrigXHR = window.XMLHttpRequest;
  function VirtualXHR() {
    const xhr = new OrigXHR();
    let reqUrl = '';
    let reqMethod = 'GET';
    let startTime = 0;

    const origOpen = xhr.open;
    xhr.open = function(method, url, ...rest) {
      reqMethod = method;
      reqUrl = url;
      startTime = performance.now();

      if (url && !/^(?:[a-z]+:)?\\/\\//i.test(url) && !url.startsWith('data:') && !url.startsWith('blob:')) {
        const vPath = resolvePath(currentPath, url);
        const fileInfo = virtualFiles[vPath];
        if (fileInfo && fileInfo.blobUrl) {
          return origOpen.call(xhr, method, fileInfo.blobUrl, ...rest);
        }
      }
      return origOpen.call(xhr, method, url, ...rest);
    };

    xhr.addEventListener('loadend', function() {
      const timeMs = Math.round(performance.now() - startTime);
      postToParent('NETWORK_LOG', {
        url: reqUrl,
        virtualPath: reqUrl,
        method: reqMethod,
        status: xhr.status || 200,
        statusText: xhr.statusText || 'OK',
        mimeType: xhr.getResponseHeader('content-type') || '',
        size: xhr.response ? (xhr.response.byteLength || xhr.responseText?.length || 0) : 0,
        timestamp: new Date().toLocaleTimeString(),
        timeMs: timeMs
      });
    });

    return xhr;
  }
  VirtualXHR.prototype = OrigXHR.prototype;
  window.XMLHttpRequest = VirtualXHR;

  // 4. Intercept Local Link Clicks for in-virtual-app routing
  document.addEventListener('click', function(e) {
    const target = e.target.closest('a');
    if (target && target.getAttribute('href')) {
      const href = target.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !/^(?:[a-z]+:)?\\/\\//i.test(href) && !href.startsWith('mailto:')) {
        const vPath = resolvePath(currentPath, href);
        if (virtualFiles[vPath] && (vPath.endsWith('.html') || vPath.endsWith('.htm'))) {
          e.preventDefault();
          postToParent('NAVIGATE_TO_PAGE', { path: vPath });
        }
      }
    }
  }, true);

  // Ready signal
  postToParent('APP_READY', { path: currentPath, title: document.title });
})();
</script>
`;
}

/**
 * Transforms an HTML document by resolving all internal relative references to Blob URLs
 * and injecting the runtime bridge script.
 */
export function buildVirtualAppDocument(
  project: ZipProject,
  entryPath: string
): string {
  const entryFile = project.files.get(entryPath);
  if (!entryFile) {
    return `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;color:#ef4444;">
      <h2>Entry point not found: ${entryPath}</h2>
      <p>Please select a valid HTML file from the file explorer.</p>
    </body></html>`;
  }

  let rawHtml = entryFile.content || '';

  // Build lightweight virtual files dictionary for runtime fetch/xhr resolution
  const manifestMap: Record<string, { blobUrl: string; mimeType: string; size: number }> = {};
  for (const [path, file] of project.files.entries()) {
    if (file.blobUrl) {
      manifestMap[path] = {
        blobUrl: file.blobUrl,
        mimeType: file.mimeType,
        size: file.size,
      };
    }
  }
  const manifestJson = JSON.stringify(manifestMap);

  // 1. Transform <link rel="stylesheet" ... href="...">
  rawHtml = rawHtml.replace(/<link\s+([^>]*?)href=(["'])(.*?)\2([^>]*?)>/gi, (fullMatch, pre, quote, href, post) => {
    const isStylesheet = /rel=(["'])(?:.*?\s+)?stylesheet(?:\s+.*?)?\1/i.test(fullMatch);
    if (!isStylesheet) {
      // Icon or other resource
      const resolved = resolveRelativePath(entryPath, href);
      const target = project.files.get(resolved);
      if (target?.blobUrl) {
        return `<link ${pre}href="${target.blobUrl}"${post}>`;
      }
      return fullMatch;
    }

    const resolved = resolveRelativePath(entryPath, href);
    const target = project.files.get(resolved);

    if (target && target.content !== undefined) {
      // Rewrite any internal url() in this CSS
      const transformedCss = rewriteCssContent(target.content, resolved, project.files);
      return `<style data-original-href="${resolved}">\n/* Inlined from ${resolved} */\n${transformedCss}\n</style>`;
    } else if (target?.blobUrl) {
      return `<link ${pre}href="${target.blobUrl}"${post}>`;
    }

    return fullMatch;
  });

  // 2. Transform <script ... src="...">
  rawHtml = rawHtml.replace(/<script\s+([^>]*?)src=(["'])(.*?)\2([^>]*?)>/gi, (fullMatch, pre, quote, src, post) => {
    const trimmed = src.trim();
    if (/^(?:[a-z]+:)?\/\//i.test(trimmed) || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
      return fullMatch;
    }

    const resolved = resolveRelativePath(entryPath, trimmed);
    const target = project.files.get(resolved);

    if (target?.blobUrl) {
      return `<script ${pre}src="${target.blobUrl}"${post}>`;
    }

    return fullMatch;
  });

  // 3. Transform media elements (<img src>, <audio src>, <video src>, <source src>, <embed src>, <iframe src>)
  rawHtml = rawHtml.replace(/<(img|audio|video|source|embed|track)\s+([^>]*?)src=(["'])(.*?)\3([^>]*?)>/gi, (fullMatch, tag, pre, quote, src, post) => {
    const trimmed = src.trim();
    if (/^(?:[a-z]+:)?\/\//i.test(trimmed) || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
      return fullMatch;
    }

    const resolved = resolveRelativePath(entryPath, trimmed);
    const target = project.files.get(resolved);

    if (target?.blobUrl) {
      return `<${tag} ${pre}src="${target.blobUrl}"${post}>`;
    }

    return fullMatch;
  });

  // 4. Transform inline <style> tags url(...)
  rawHtml = rawHtml.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (fullMatch, attrs, cssBody) => {
    const transformedCss = rewriteCssContent(cssBody, entryPath, project.files);
    return `<style${attrs}>${transformedCss}</style>`;
  });

  // 5. Transform inline style="..." attributes
  rawHtml = rawHtml.replace(/style=(["'])(.*?)\1/gi, (fullMatch, quote, styleContent) => {
    const transformed = rewriteCssContent(styleContent, entryPath, project.files);
    return `style=${quote}${transformed}${quote}`;
  });

  // 6. Inject the runtime bridge script right after <head> or at the top of document
  const bridgeScript = generateRuntimeBridgeScript(entryPath, manifestJson);

  if (/<head\b[^>]*>/i.test(rawHtml)) {
    rawHtml = rawHtml.replace(/<head\b[^>]*>/i, `$&${bridgeScript}`);
  } else if (/<html\b[^>]*>/i.test(rawHtml)) {
    rawHtml = rawHtml.replace(/<html\b[^>]*>/i, `$&<head>${bridgeScript}</head>`);
  } else {
    rawHtml = `${bridgeScript}\n${rawHtml}`;
  }

  return rawHtml;
}
