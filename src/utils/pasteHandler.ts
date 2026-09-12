import { BlockType, CalloutVariant, NoteBlock } from '../types/notes';

export interface PasteResult {
  blocks: NoteBlock[];
  detectedType: 'image' | 'html' | 'markdown' | 'spreadsheet' | 'code' | 'json' | 'url' | 'multiline' | 'plain';
  description: string;
  badge: string;
}

/**
 * Generate a unique block ID with timestamp and random suffix
 */
export function generateBlockId(prefix = 'blk'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Parses Tab-Separated Values (TSV from Excel/Google Sheets) or CSV into tableData
 */
function parseSpreadsheet(text: string): string[][] | null {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return null;

  // Check for TSV (Excel, Google Sheets clipboard format)
  if (lines[0].includes('\t')) {
    const rows = lines.map(line => line.split('\t').map(cell => cell.trim()));
    const colCount = rows[0].length;
    if (colCount >= 2 && rows.length >= 1) {
      // Pad any ragged rows to matching column count
      const normalized = rows.map(r => {
        const padded = [...r];
        while (padded.length < colCount) padded.push('');
        return padded.slice(0, colCount);
      });
      return normalized;
    }
  }

  // Check for CSV (comma-separated with consistent commas)
  if (lines.length >= 2 && lines[0].includes(',')) {
    const rows = lines.map(line => {
      // Simple CSV split handling quotes
      const cells: string[] = [];
      let inQuote = false;
      let curr = '';
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
          cells.push(curr.trim());
          curr = '';
        } else {
          curr += char;
        }
      }
      cells.push(curr.trim());
      return cells;
    });

    const colCount = rows[0].length;
    if (colCount >= 2 && rows.every(r => Math.abs(r.length - colCount) <= 1)) {
      const normalized = rows.map(r => {
        const padded = [...r];
        while (padded.length < colCount) padded.push('');
        return padded.slice(0, colCount);
      });
      return normalized;
    }
  }

  return null;
}

/**
 * Parses GFM Markdown Table
 */
function parseMarkdownTable(lines: string[]): string[][] | null {
  const tableRows: string[][] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null;
    // Skip separator line |---|---|
    if (/^\|[-:\s|]+\|$/.test(trimmed)) continue;

    const cells = trimmed
      .slice(1, -1)
      .split('|')
      .map(c => c.trim());
    tableRows.push(cells);
  }

  return tableRows.length >= 1 ? tableRows : null;
}

/**
 * Parses rich HTML markup into structured NoteBlocks
 */
function parseHtmlToBlocks(html: string): NoteBlock[] {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const body = doc.body;

    const blocks: NoteBlock[] = [];

    function processNode(node: Node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const txt = (node.textContent || '').trim();
        if (txt) {
          blocks.push({
            id: generateBlockId(),
            type: 'paragraph',
            content: txt
          });
        }
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      // Check for headings
      if (tag === 'h1') {
        blocks.push({ id: generateBlockId(), type: 'h1', content: el.textContent?.trim() || '' });
        return;
      }
      if (tag === 'h2') {
        blocks.push({ id: generateBlockId(), type: 'h2', content: el.textContent?.trim() || '' });
        return;
      }
      if (tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') {
        blocks.push({ id: generateBlockId(), type: 'h3', content: el.textContent?.trim() || '' });
        return;
      }

      // Check for table
      if (tag === 'table') {
        const rows: string[][] = [];
        const trs = el.querySelectorAll('tr');
        trs.forEach(tr => {
          const cells: string[] = [];
          tr.querySelectorAll('th, td').forEach(td => {
            cells.push(td.textContent?.trim() || '');
          });
          if (cells.length > 0) rows.push(cells);
        });

        if (rows.length > 0) {
          const maxCols = Math.max(...rows.map(r => r.length));
          const normalized = rows.map(r => {
            const copy = [...r];
            while (copy.length < maxCols) copy.push('');
            return copy;
          });
          blocks.push({
            id: generateBlockId(),
            type: 'table',
            content: 'Pasted Table',
            tableData: normalized
          });
          return;
        }
      }

      // Check for code blocks
      if (tag === 'pre') {
        const codeEl = el.querySelector('code') || el;
        const codeText = codeEl.textContent || '';
        const langMatch = codeEl.className.match(/language-([a-zA-Z0-9_-]+)/);
        const language = langMatch ? langMatch[1] : 'typescript';
        blocks.push({
          id: generateBlockId(),
          type: 'code',
          content: codeText.trim(),
          language
        });
        return;
      }

      // Check for lists
      if (tag === 'ul' || tag === 'ol') {
        const isOrdered = tag === 'ol';
        const lis = el.querySelectorAll(':scope > li');
        lis.forEach(li => {
          const checkbox = li.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
          const content = li.textContent?.trim() || '';
          if (checkbox) {
            blocks.push({
              id: generateBlockId(),
              type: 'todo',
              content,
              checked: checkbox.checked
            });
          } else if (isOrdered) {
            blocks.push({
              id: generateBlockId(),
              type: 'numbered',
              content
            });
          } else {
            blocks.push({
              id: generateBlockId(),
              type: 'bullet',
              content
            });
          }
        });
        return;
      }

      // Check for blockquote
      if (tag === 'blockquote') {
        const quoteText = el.textContent?.trim() || '';
        if (/^\[!(TIP|NOTE|WARNING|INFO|QUOTE)\]/i.test(quoteText)) {
          const match = quoteText.match(/^\[!(TIP|NOTE|WARNING|INFO|QUOTE)\]\s*(.*)$/i);
          const cType = (match?.[1]?.toLowerCase() || 'info') as CalloutVariant;
          blocks.push({
            id: generateBlockId(),
            type: 'callout',
            calloutType: cType,
            content: match?.[2] || quoteText
          });
        } else {
          blocks.push({
            id: generateBlockId(),
            type: 'quote',
            content: quoteText
          });
        }
        return;
      }

      // Check for images
      if (tag === 'img') {
        const src = (el as HTMLImageElement).src;
        const alt = (el as HTMLImageElement).alt || 'Pasted image';
        if (src) {
          blocks.push({
            id: generateBlockId(),
            type: 'image',
            content: src,
            imageData: {
              url: src,
              caption: alt,
              alt
            }
          });
        }
        return;
      }

      // Check for horizontal divider
      if (tag === 'hr') {
        blocks.push({
          id: generateBlockId(),
          type: 'divider',
          content: ''
        });
        return;
      }

      // Check for paragraph or generic div
      if (tag === 'p' || tag === 'div' || tag === 'section' || tag === 'article') {
        // If it only contains text or inline tags:
        const hasBlockChildren = Array.from(el.children).some(c =>
          ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'pre', 'ul', 'ol', 'blockquote', 'hr'].includes(
            c.tagName.toLowerCase()
          )
        );

        if (!hasBlockChildren) {
          const txt = el.textContent?.trim();
          if (txt) {
            blocks.push({
              id: generateBlockId(),
              type: 'paragraph',
              content: txt
            });
          }
          return;
        }

        // Has block children: traverse children
        Array.from(el.childNodes).forEach(child => processNode(child));
        return;
      }

      // Default: traverse child nodes
      Array.from(el.childNodes).forEach(child => processNode(child));
    }

    Array.from(body.childNodes).forEach(node => processNode(node));

    return blocks.length > 0 ? blocks : [];
  } catch (err) {
    console.warn('HTML parse failed, falling back to markdown/plain:', err);
    return [];
  }
}

/**
 * Checks whether text contains explicit Markdown syntax
 */
export function hasMarkdownSyntax(text: string): boolean {
  if (!text) return false;
  // Headings: # Heading, ## Heading, ### Heading, #### Heading, etc.
  if (/^#{1,6}(\s+.*)?$/m.test(text)) return true;
  // Checklists: - [ ], - [x], [ ], [x], * [ ]
  if (/^([-*+]\s+)?\[[ xX]\]/m.test(text)) return true;
  // Bullets: - item, * item, + item
  if (/^[-*+]\s+/m.test(text)) return true;
  // Numbered: 1. item, 2. item, 1) item
  if (/^\d+[\.\)]\s+/m.test(text)) return true;
  // Blockquotes or callouts: > quote, > [!TIP]
  if (/^>\s*/m.test(text)) return true;
  // Dividers: ---, ***, ___
  if (/^(\-{3,}|\*{3,}|_{3,})\s*$/m.test(text)) return true;
  // Fenced code: ```ts
  if (/^```/m.test(text)) return true;
  // Markdown tables: | col | col |
  if (/^\|.*\|.*\|/m.test(text) || /^\|[-:\s|]+\|/m.test(text)) return true;
  // Images: ![alt](url)
  if (/!\[.*?\]\(.*?\)/.test(text)) return true;
  // Wikilinks: [[Note Title]]
  if (/\[\[.*?\]\]/.test(text)) return true;
  return false;
}

/**
 * Robust Multi-Line Markdown Parser to NoteBlock array
 */
export function parseMarkdownToBlocks(text: string): NoteBlock[] {
  if (!text || !text.trim()) {
    return [{ id: generateBlockId('p'), type: 'paragraph', content: '' }];
  }

  const lines = text.split(/\r?\n/);
  const blocks: NoteBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Fenced Code Blocks (```typescript ... ```)
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim() || 'typescript';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing ```
      blocks.push({
        id: generateBlockId('code'),
        type: 'code',
        content: codeLines.join('\n'),
        language: lang
      });
      continue;
    }

    // 2. GFM Tables (| Col 1 | Col 2 |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const tableData = parseMarkdownTable(tableLines);
      if (tableData) {
        blocks.push({
          id: generateBlockId('tbl'),
          type: 'table',
          content: 'Table',
          tableData
        });
        continue;
      }
    }

    // 3. Skip standalone blank lines between blocks
    if (!trimmed) {
      i++;
      continue;
    }

    // 4. Headings: # (H1), ## (H2), ### (H3), #### - ###### (H3)
    const headingMatch = trimmed.match(/^(#{1,6})\s*(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = (headingMatch[2] || '').trim();
      const type: BlockType = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3';
      blocks.push({ id: generateBlockId('h'), type, content });
      i++;
      continue;
    }

    // 5. Checklist / Todos (- [ ], - [x], [ ], [x])
    const todoMatch = trimmed.match(/^([-*+]\s+)?\[([ xX])\]\s*(.*)$/);
    if (todoMatch) {
      const checked = todoMatch[2].toLowerCase() === 'x';
      const content = (todoMatch[3] || '').trim();
      blocks.push({ id: generateBlockId('todo'), type: 'todo', content, checked });
      i++;
      continue;
    }

    // 6. Bullet lists (- item, * item, + item)
    const bulletMatch = trimmed.match(/^[-*+]\s+(.*)$/);
    if (bulletMatch) {
      blocks.push({ id: generateBlockId('bullet'), type: 'bullet', content: bulletMatch[1].trim() });
      i++;
      continue;
    }

    // 7. Numbered lists (1. item, 2. item, 1) item)
    const numMatch = trimmed.match(/^\d+[\.\)]\s+(.*)$/);
    if (numMatch) {
      blocks.push({ id: generateBlockId('num'), type: 'numbered', content: numMatch[1].trim() });
      i++;
      continue;
    }

    // 8. Callout: > [!TIP] or > [!INFO] or > [!WARNING] or > [!QUOTE]
    if (/^>\s*\[!(TIP|NOTE|WARNING|INFO|QUOTE|SUCCESS|IMPORTANT|CAUTION)\]/i.test(trimmed)) {
      const match = trimmed.match(/^>\s*\[!(TIP|NOTE|WARNING|INFO|QUOTE|SUCCESS|IMPORTANT|CAUTION)\]\s*(.*)$/i);
      const tag = (match?.[1] || 'info').toLowerCase();
      let cType: CalloutVariant = 'info';
      if (tag === 'tip' || tag === 'success') cType = 'tip';
      else if (tag === 'warning' || tag === 'caution') cType = 'warning';
      else if (tag === 'quote') cType = 'quote';
      else cType = 'info';

      let calloutContent = match?.[2] || '';
      i++;
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        calloutContent += (calloutContent ? '\n' : '') + lines[i].trim().replace(/^>\s*/, '');
        i++;
      }
      blocks.push({
        id: generateBlockId('callout'),
        type: 'callout',
        calloutType: cType,
        content: calloutContent
      });
      continue;
    }

    // 9. Standard Quotes (> quote line)
    if (trimmed.startsWith('>')) {
      let quoteContent = trimmed.replace(/^>\s*/, '');
      i++;
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteContent += '\n' + lines[i].trim().replace(/^>\s*/, '');
        i++;
      }
      blocks.push({ id: generateBlockId('quote'), type: 'quote', content: quoteContent });
      continue;
    }

    // 10. Horizontal rule / divider (---, ***, ___)
    if (/^(\-{3,}|\*{3,}|_{3,})\s*$/.test(trimmed)) {
      blocks.push({ id: generateBlockId('hr'), type: 'divider', content: '' });
      i++;
      continue;
    }

    // 11. Images: ![alt](url)
    const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      const alt = imgMatch[1];
      const url = imgMatch[2];
      blocks.push({
        id: generateBlockId('img'),
        type: 'image',
        content: url,
        imageData: { url, caption: alt, alt }
      });
      i++;
      continue;
    }

    // 12. Flashcards: **Q:** question \n *A:* answer
    if (trimmed.startsWith('**Q:') || trimmed.startsWith('Q:')) {
      const qText = trimmed.replace(/^(\*\*Q:\*\*|Q:)\s*/, '');
      let aText = '';
      if (i + 1 < lines.length && (lines[i + 1].trim().startsWith('*A:') || lines[i + 1].trim().startsWith('A:'))) {
        aText = lines[i + 1].trim().replace(/^(\*A:\*|A:)\s*/, '');
        i++;
      }
      blocks.push({
        id: generateBlockId('fc'),
        type: 'flashcard',
        content: qText,
        flashcardAnswer: aText
      });
      i++;
      continue;
    }

    // 13. Standard Paragraph
    blocks.push({ id: generateBlockId('p'), type: 'paragraph', content: line });
    i++;
  }

  return blocks.length > 0 ? blocks : [{ id: generateBlockId('p'), type: 'paragraph', content: '' }];
}

/**
 * Reads File as base64 Data URL
 */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Master Paste Handler: Inspects clipboard data, detects content type,
 * and converts to structured NoteBlocks.
 */
export async function processClipboardPaste(clipboardData: DataTransfer): Promise<PasteResult | null> {
  // 1. Check for Image Files (from screenshots, file explorer, or copied image)
  const items = clipboardData.items;
  const imageFiles: File[] = [];

  if (items) {
    for (let j = 0; j < items.length; j++) {
      const item = items[j];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
  }

  if (imageFiles.length === 0 && clipboardData.files) {
    for (let j = 0; j < clipboardData.files.length; j++) {
      const f = clipboardData.files[j];
      if (f.type.startsWith('image/')) {
        imageFiles.push(f);
      }
    }
  }

  if (imageFiles.length > 0) {
    const imgBlocks: NoteBlock[] = [];
    for (const f of imageFiles) {
      try {
        const dataUrl = await readFileAsDataUrl(f);
        imgBlocks.push({
          id: generateBlockId('img'),
          type: 'image',
          content: dataUrl,
          imageData: {
            url: dataUrl,
            name: f.name,
            caption: f.name || 'Pasted Image',
            size: f.size
          }
        });
      } catch (err) {
        console.warn('Failed to read pasted image file:', err);
      }
    }

    if (imgBlocks.length > 0) {
      return {
        blocks: imgBlocks,
        detectedType: 'image',
        description: `${imgBlocks.length} image${imgBlocks.length > 1 ? 's' : ''} pasted`,
        badge: 'Image'
      };
    }
  }

  const plainText = clipboardData.getData('text/plain') || '';
  const htmlText = clipboardData.getData('text/html') || '';

  // 2. HIGHEST PRIORITY: Check for explicit Markdown syntax in plainText
  // This guarantees that any Markdown text with # headings, - lists, checklists, etc.
  // is immediately converted into individual blocks rather than captured by code/html/single-object logic.
  if (plainText && hasMarkdownSyntax(plainText)) {
    const parsedBlocks = parseMarkdownToBlocks(plainText);
    if (parsedBlocks.length > 0) {
      // Summarize block types for toast
      const typeCounts: Record<string, number> = {};
      parsedBlocks.forEach(b => {
        typeCounts[b.type] = (typeCounts[b.type] || 0) + 1;
      });
      const parts: string[] = [];
      if (typeCounts['h1']) parts.push(`${typeCounts['h1']} H1`);
      if (typeCounts['h2']) parts.push(`${typeCounts['h2']} H2`);
      if (typeCounts['h3']) parts.push(`${typeCounts['h3']} H3`);
      if (typeCounts['todo']) parts.push(`${typeCounts['todo']} todos`);
      if (typeCounts['bullet']) parts.push(`${typeCounts['bullet']} bullets`);
      if (typeCounts['numbered']) parts.push(`${typeCounts['numbered']} numbered`);
      if (typeCounts['quote']) parts.push(`${typeCounts['quote']} quotes`);
      if (typeCounts['callout']) parts.push(`${typeCounts['callout']} callouts`);
      if (typeCounts['table']) parts.push(`${typeCounts['table']} tables`);
      if (typeCounts['code']) parts.push(`${typeCounts['code']} code blocks`);
      if (typeCounts['paragraph']) parts.push(`${typeCounts['paragraph']} paragraphs`);

      const summary = parts.length > 0 ? parts.slice(0, 3).join(', ') : 'Markdown';

      return {
        blocks: parsedBlocks,
        detectedType: 'markdown',
        description: `Imported ${parsedBlocks.length} block${parsedBlocks.length > 1 ? 's' : ''} (${summary})`,
        badge: 'Markdown'
      };
    }
  }

  // 3. Check for Tab-Separated Values (TSV) from Excel / Google Sheets or CSV
  if (plainText && (plainText.includes('\t') || plainText.includes(','))) {
    const tableData = parseSpreadsheet(plainText);
    if (tableData && tableData.length >= 1 && tableData[0].length >= 2) {
      const tableBlock: NoteBlock = {
        id: generateBlockId('tbl'),
        type: 'table',
        content: `Table (${tableData.length} rows × ${tableData[0].length} cols)`,
        tableData
      };
      return {
        blocks: [tableBlock],
        detectedType: 'spreadsheet',
        description: `Spreadsheet table (${tableData.length} rows × ${tableData[0].length} cols)`,
        badge: 'Table'
      };
    }
  }

  // 4. Check for Rich HTML (from Google Docs, Word, Web pages)
  if (htmlText) {
    // Verify if it contains structural tags rather than bare text
    const hasRichTags = /<(h[1-6]|table|ul|ol|blockquote|pre|img|hr|p\s+class)/i.test(htmlText);
    if (hasRichTags) {
      const parsedBlocks = parseHtmlToBlocks(htmlText);
      if (parsedBlocks.length > 0) {
        return {
          blocks: parsedBlocks,
          detectedType: 'html',
          description: `Rich document (${parsedBlocks.length} blocks)`,
          badge: 'Rich Text'
        };
      }
    }
  }

  // 5. Check for JSON code (strictly valid JSON with object or array structure)
  if (plainText) {
    const trimmed = plainText.trim();
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'object' && parsed !== null) {
          const pretty = JSON.stringify(parsed, null, 2);
          const codeBlock: NoteBlock = {
            id: generateBlockId('json'),
            type: 'code',
            content: pretty,
            language: 'json'
          };
          return {
            blocks: [codeBlock],
            detectedType: 'json',
            description: 'Formatted JSON object',
            badge: 'JSON'
          };
        }
      } catch {
        // Not valid JSON, continue to other detectors
      }
    }
  }

  // 6. Check for Programming Code snippet (requires explicit keywords and syntax)
  if (plainText && plainText.includes('\n')) {
    const trimmed = plainText.trim();
    const isCode =
      /\b(import\s+[\w*{}\s,]+\s+from\s+['"]|export\s+(default|const|function|class)|const\s+\w+\s*=|let\s+\w+\s*=|function\s+\w+\s*\(|class\s+\w+\s*\{|def\s+\w+\s*\(|SELECT\s+[\w*,\s]+\s+FROM)\b/m.test(trimmed);

    if (isCode && trimmed.split('\n').length >= 3) {
      let lang = 'typescript';
      if (/\bdef\b|\bprint\(|\bimport sys\b/.test(trimmed)) lang = 'python';
      else if (/\bSELECT\b|\bFROM\b|\bWHERE\b/i.test(trimmed)) lang = 'sql';
      else if (/<[a-z][\s\S]*>/i.test(trimmed)) lang = 'html';

      const codeBlock: NoteBlock = {
        id: generateBlockId('code'),
        type: 'code',
        content: trimmed,
        language: lang
      };
      return {
        blocks: [codeBlock],
        detectedType: 'code',
        description: `Code snippet (${lang})`,
        badge: lang.toUpperCase()
      };
    }
  }

  // 7. Check for URL (single line)
  if (plainText) {
    const trimmed = plainText.trim();
    if (/^https?:\/\/[^\s]+$/i.test(trimmed)) {
      // Check for direct image URL
      if (/\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(trimmed)) {
        const imgBlock: NoteBlock = {
          id: generateBlockId('img'),
          type: 'image',
          content: trimmed,
          imageData: {
            url: trimmed,
            caption: 'Web Image'
          }
        };
        return {
          blocks: [imgBlock],
          detectedType: 'url',
          description: 'Web image URL converted to preview',
          badge: 'Image Link'
        };
      }

      // Check for YouTube URL
      if (/youtube\.com\/watch\?v=|youtu\.be\//i.test(trimmed)) {
        const ytBlock: NoteBlock = {
          id: generateBlockId('yt'),
          type: 'callout',
          calloutType: 'info',
          content: `▶️ **YouTube Video:** [${trimmed}](${trimmed})`
        };
        return {
          blocks: [ytBlock],
          detectedType: 'url',
          description: 'YouTube link bookmark',
          badge: 'Video Link'
        };
      }
    }
  }

  // 8. Multi-line plain text: break into separate paragraph blocks cleanly
  if (plainText && plainText.includes('\n')) {
    const rawLines = plainText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (rawLines.length > 1) {
      const paraBlocks: NoteBlock[] = rawLines.map(l => ({
        id: generateBlockId('p'),
        type: 'paragraph',
        content: l
      }));
      return {
        blocks: paraBlocks,
        detectedType: 'multiline',
        description: `Text (${paraBlocks.length} paragraphs)`,
        badge: 'Text'
      };
    }
  }

  // 9. Single-line plain text:
  if (plainText && plainText.trim()) {
    return {
      blocks: [
        {
          id: generateBlockId('p'),
          type: 'paragraph',
          content: plainText
        }
      ],
      detectedType: 'plain',
      description: 'Plain text',
      badge: 'Text'
    };
  }

  return null;
}
