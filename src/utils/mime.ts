export function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'html':
    case 'htm':
      return 'text/html; charset=UTF-8';
    case 'css':
      return 'text/css; charset=UTF-8';
    case 'js':
    case 'mjs':
      return 'application/javascript; charset=UTF-8';
    case 'ts':
      return 'application/typescript; charset=UTF-8';
    case 'jsx':
    case 'tsx':
      return 'text/jsx; charset=UTF-8';
    case 'json':
      return 'application/json; charset=UTF-8';
    case 'svg':
      return 'image/svg+xml';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'avif':
      return 'image/avif';
    case 'ico':
      return 'image/x-icon';
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'ogg':
      return 'audio/ogg';
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'woff':
      return 'font/woff';
    case 'woff2':
      return 'font/woff2';
    case 'ttf':
      return 'font/ttf';
    case 'otf':
      return 'font/otf';
    case 'md':
    case 'markdown':
    case 'txt':
      return 'text/plain; charset=UTF-8';
    case 'xml':
      return 'application/xml; charset=UTF-8';
    case 'pdf':
      return 'application/pdf';
    case 'wasm':
      return 'application/wasm';
    default:
      return 'application/octet-stream';
  }
}

export function isTextFile(filename: string, mimeType: string): boolean {
  if (mimeType.startsWith('text/')) return true;
  if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('xml')) return true;
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const textExtensions = [
    'html', 'htm', 'css', 'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx', 'json', 'jsonld',
    'svg', 'md', 'markdown', 'txt', 'xml', 'yaml', 'yml', 'env', 'conf', 'ini', 'sh'
  ];
  return textExtensions.includes(ext);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
