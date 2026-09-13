import mammoth from 'mammoth';
import { DocumentAttachment } from '../types/notes';

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

  const safeUrl = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      const url = new URL(trimmed, window.location.origin);
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
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

    for (const attr of Array.from(element.attributes)) {
      const name = attr.name.toLowerCase();
      const keep =
        (tag === 'A' && (name === 'href' || name === 'title')) ||
        ((tag === 'TD' || tag === 'TH') && (name === 'colspan' || name === 'rowspan'));
      if (!keep) element.removeAttribute(attr.name);
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
  } else if (lowerName.endsWith('.docx') || mimeType.includes('wordprocessingml') || mimeType.includes('msword')) {
    fileType = 'docx';
  } else if (lowerName.endsWith('.txt') || lowerName.endsWith('.md') || mimeType.startsWith('text/')) {
    fileType = 'text';
  } else if (mimeType.startsWith('image/')) {
    fileType = 'image';
  }

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
