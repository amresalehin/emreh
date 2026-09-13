import mammoth from 'mammoth';
import { DocumentAttachment } from '../types/notes';

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Mammoth intentionally does not sanitize generated HTML. Convert the result
 * into a tightly controlled subset before it can reach a dangerouslySetInnerHTML
 * sink. This protects both newly imported and re-rendered DOCX content from
 * javascript: URLs, event-handler attributes, active embeds, and other HTML that
 * should never execute inside the application origin.
 */
export function sanitizeDocumentHtml(input: string): string {
  if (!input) return '';

  const parser = new DOMParser();
  const source = parser.parseFromString(`<div>${input}</div>`, 'text/html');
  const root = source.body.firstElementChild;
  if (!root) return '';

  const allowedTags = new Set([
    'A', 'B', 'BR', 'BLOCKQUOTE', 'CODE', 'DEL', 'EM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'I', 'LI', 'OL', 'P', 'PRE', 'S', 'SPAN', 'STRONG', 'SUB', 'SUP', 'TABLE', 'TBODY', 'TD',
    'TFOOT', 'TH', 'THEAD', 'TR', 'U', 'UL'
  ]);

  const safeUrl = (value: string, allowDataImage = false): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      const url = new URL(trimmed, window.location.origin);
      if (url.protocol === 'http:' || url.protocol === 'https:') return url.toString();
      if (allowDataImage && url.protocol === 'data:' && /^data:image\/(?:png|jpeg|gif|webp);/i.test(trimmed)) return trimmed;
      return null;
    } catch {
      return null;
    }
  };

  const walker = source.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  const elements: Element[] = [];
  let node = walker.nextNode();
  while (node) {
    elements.push(node as Element);
    node = walker.nextNode();
  }

  for (const element of elements) {
    const tag = element.tagName.toUpperCase();
    if (!allowedTags.has(tag)) {
      element.replaceWith(source.createTextNode(element.textContent || ''));
      continue;
    }

    const attrs = Array.from(element.attributes);
    for (const attr of attrs) {
      const name = attr.name.toLowerCase();
      const value = attr.value;
      const keep =
        (tag === 'A' && (name === 'href' || name === 'title')) ||
        ((tag === 'IMG') && (name === 'src' || name === 'alt' || name === 'title')) ||
        ((tag === 'TD' || tag === 'TH') && (name === 'colspan' || name === 'rowspan'));

      if (!keep || name.startsWith('on') || name === 'style' || name === 'srcdoc') {
        element.removeAttribute(attr.name);
      }
    }

    if (tag === 'A') {
      const href = element.getAttribute('href');
      const safe = href ? safeUrl(href) : null;
      if (safe) {
        element.setAttribute('href', safe);
        element.setAttribute('target', '_blank');
        element.setAttribute('rel', 'noopener noreferrer nofollow');
      } else {
        element.removeAttribute('href');
        element.removeAttribute('target');
        element.removeAttribute('rel');
      }
    }

    // IMG is not emitted by Mammoth by default unless an image converter is
    // configured. Handle it defensively in case that changes or older data is loaded.
    if (tag === 'IMG') {
      const src = element.getAttribute('src');
      const safe = src ? safeUrl(src, true) : null;
      if (!safe) element.remove();
      else element.setAttribute('src', safe);
    }
  }

  return root.innerHTML;
}

export async function processUploadedDocument(file: File): Promise<DocumentAttachment> {
  const fileName = file.name;
  const lowerName = fileName.toLowerCase();
  const mimeType = file.type || 'application/octet-stream';
  const size = file.size;

  let fileType: DocumentAttachment['fileType'] = 'generic';
  if (lowerName.endsWith('.pdf') || mimeType === 'application/pdf') {
    fileType = 'pdf';
  } else if (
    lowerName.endsWith('.docx') ||
    mimeType.includes('wordprocessingml') ||
    mimeType.includes('msword')
  ) {
    fileType = 'docx';
  } else if (
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.md') ||
    mimeType.startsWith('text/')
  ) {
    fileType = 'text';
  } else if (mimeType.startsWith('image/')) {
    fileType = 'image';
  }

  // Convert file to Data URL for reliable in-memory persistence and offline preview
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });

  let htmlExtract: string | undefined;
  let textExtract: string | undefined;

  if (fileType === 'docx') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      htmlExtract = sanitizeDocumentHtml(result.value);
      const textResult = await mammoth.extractRawText({ arrayBuffer });
      textExtract = textResult.value;
    } catch (err) {
      console.warn('Mammoth docx parsing failed, falling back:', err);
    }
  } else if (fileType === 'text') {
    try {
      textExtract = await file.text();
    } catch (err) {
      console.warn('Text reading failed:', err);
    }
  }

  return {
    name: fileName,
    size,
    mimeType,
    fileType,
    dataUrl,
    htmlExtract,
    textExtract,
    viewMode: fileType === 'pdf' || fileType === 'docx' ? 'embedded' : 'inline_card'
  };
}
