import mammoth from 'mammoth';
import { DocumentAttachment } from '../types/notes';

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
      htmlExtract = result.value;
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
