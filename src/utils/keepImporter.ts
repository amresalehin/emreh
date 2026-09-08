import JSZip from 'jszip';
import { KeepNote, KeepChecklistItem } from '../types';
import { NoteObject, NoteBlock } from '../types/notes';
import { deterministicId } from './idGenerator';

export const KEEP_COLOR_MAP: Record<string, string> = {
  DEFAULT: 'default',
  WHITE: 'default',
  RED: 'coral',
  ORANGE: 'peach',
  YELLOW: 'sand',
  GREEN: 'mint',
  TEAL: 'sage',
  BLUE: 'fog',
  CERULEAN: 'fog',
  DARK_BLUE: 'storm',
  PURPLE: 'dusk',
  PINK: 'blossom',
  BROWN: 'clay',
  GRAY: 'clay'
};

export function normalizeKeepColor(rawColor?: string): string {
  if (!rawColor) return 'default';
  const upper = rawColor.toUpperCase();
  return KEEP_COLOR_MAP[upper] || rawColor.toLowerCase() || 'default';
}

export function parseKeepJsonObject(jsonObj: any, fileName?: string): KeepNote | null {
  if (!jsonObj || typeof jsonObj !== 'object') return null;

  // Google Keep JSON structure
  const title = (jsonObj.title || jsonObj.name || fileName?.replace(/\.json$/i, '') || '').trim();
  const textContent = jsonObj.textContent || jsonObj.text || jsonObj.content || jsonObj.body || '';

  // Checklist items
  const checklistItems: KeepChecklistItem[] = [];
  if (Array.isArray(jsonObj.listContent)) {
    jsonObj.listContent.forEach((item: any, idx: number) => {
      const text = item.text || item.content || '';
      if (text) {
        checklistItems.push({
          id: `item_${idx}_${Date.now()}`,
          text: String(text).trim(),
          completed: Boolean(item.isChecked || item.completed)
        });
      }
    });
  } else if (Array.isArray(jsonObj.checklistItems)) {
    jsonObj.checklistItems.forEach((item: any, idx: number) => {
      checklistItems.push({
        id: item.id || `item_${idx}_${Date.now()}`,
        text: String(item.text || item.content || '').trim(),
        completed: Boolean(item.completed || item.isChecked)
      });
    });
  }

  // Labels / Tags
  const labels: string[] = [];
  if (Array.isArray(jsonObj.labels)) {
    jsonObj.labels.forEach((l: any) => {
      const name = typeof l === 'string' ? l : l?.name || l?.label;
      if (name && !labels.includes(name)) labels.push(String(name).trim());
    });
  } else if (Array.isArray(jsonObj.tags)) {
    jsonObj.tags.forEach((t: any) => {
      const name = typeof t === 'string' ? t : t?.name;
      if (name && !labels.includes(name)) labels.push(String(name).trim());
    });
  }

  // Timestamps (Google Keep uses userEditedTimestampUsec / createdTimestampUsec in microseconds)
  let createdAt = new Date().toISOString();
  if (jsonObj.createdTimestampUsec) {
    const ms = Math.floor(Number(jsonObj.createdTimestampUsec) / 1000);
    if (!isNaN(ms)) createdAt = new Date(ms).toISOString();
  } else if (jsonObj.createdAt) {
    createdAt = new Date(jsonObj.createdAt).toISOString();
  }

  let updatedAt = createdAt;
  if (jsonObj.userEditedTimestampUsec) {
    const ms = Math.floor(Number(jsonObj.userEditedTimestampUsec) / 1000);
    if (!isNaN(ms)) updatedAt = new Date(ms).toISOString();
  } else if (jsonObj.updatedAt) {
    updatedAt = new Date(jsonObj.updatedAt).toISOString();
  }

  const isPinned = Boolean(jsonObj.isPinned || jsonObj.pinned);
  const isArchived = Boolean(jsonObj.isArchived || jsonObj.archived);
  const isTrashed = Boolean(jsonObj.isTrashed || jsonObj.trashed);
  const color = normalizeKeepColor(jsonObj.color);

  // Check if note has audio transcription
  let hasAudio = false;
  if (Array.isArray(jsonObj.attachments)) {
    hasAudio = jsonObj.attachments.some(
      (att: any) => att.mimetype?.includes('audio') || att.type === 'audio'
    );
  }

  // Check empty note
  if (!title && !textContent && checklistItems.length === 0) {
    return null;
  }

  return {
    id: jsonObj.id || deterministicId('keep', title, createdAt),
    title: title || 'Untitled Note',
    content: textContent,
    color,
    labels,
    isPinned,
    isArchived,
    isTrashed,
    isChecklist: checklistItems.length > 0,
    checklistItems,
    hasAudio,
    createdAt,
    updatedAt
  };
}

export function parseKeepHtmlText(htmlText: string, fileName?: string): KeepNote | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');

    const titleEl = doc.querySelector('.title') || doc.querySelector('title') || doc.querySelector('h1');
    const title = (titleEl?.textContent || fileName?.replace(/\.html?$/i, '') || '').trim();

    const contentEl = doc.querySelector('.content');
    const content = (contentEl?.textContent || doc.body.textContent || '').trim();

    // Check for checklist items
    const checklistItems: KeepChecklistItem[] = [];
    const listItems = doc.querySelectorAll('li, .list-item');
    listItems.forEach((li, idx) => {
      const text = li.textContent?.trim() || '';
      const isChecked = li.classList.contains('checked') || text.startsWith('☑') || text.startsWith('[x]');
      const cleanText = text.replace(/^[☑☐\[\]x\s]+/, '').trim();
      if (cleanText) {
        checklistItems.push({
          id: `item_${idx}_${Date.now()}`,
          text: cleanText,
          completed: isChecked
        });
      }
    });

    const labels: string[] = [];
    const labelEls = doc.querySelectorAll('.label-name, .chip, .tag');
    labelEls.forEach(l => {
      const txt = l.textContent?.trim();
      if (txt && !labels.includes(txt)) labels.push(txt);
    });

    if (!title && !content && checklistItems.length === 0) return null;

    return {
      id: deterministicId('keep', title, content),
      title: title || 'Imported Note',
      content: checklistItems.length > 0 ? '' : content,
      color: 'default',
      labels,
      isPinned: false,
      isArchived: false,
      isTrashed: false,
      isChecklist: checklistItems.length > 0,
      checklistItems,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  } catch (err) {
    console.warn('Failed parsing Keep HTML:', err);
    return null;
  }
}

/**
 * Parses single or multiple files (JSON, HTML, TXT, MD, or Google Takeout ZIP) into Keep notes.
 */
export async function parseKeepFiles(
  files: File[],
  onProgress?: (percent: number, msg: string) => void
): Promise<KeepNote[]> {
  const parsedNotes: KeepNote[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const nameLower = file.name.toLowerCase();

    if (onProgress) {
      onProgress(Math.round((i / files.length) * 100), `Reading ${file.name}...`);
    }

    if (nameLower.endsWith('.zip')) {
      try {
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(file);
        const entries: { path: string; file: JSZip.JSZipObject }[] = [];

        loadedZip.forEach((relPath, entry) => {
          if (!entry.dir) {
            const p = relPath.toLowerCase();
            if (p.endsWith('.json') || p.endsWith('.html') || p.endsWith('.htm') || p.endsWith('.txt')) {
              entries.push({ path: relPath, file: entry });
            }
          }
        });

        for (let j = 0; j < entries.length; j++) {
          const item = entries[j];
          const text = await item.file.async('text');
          const pLower = item.path.toLowerCase();
          const baseName = item.path.split('/').pop() || '';

          if (pLower.endsWith('.json')) {
            try {
              const json = JSON.parse(text);
              if (Array.isArray(json)) {
                json.forEach(sub => {
                  const n = parseKeepJsonObject(sub, baseName);
                  if (n) parsedNotes.push(n);
                });
              } else {
                const n = parseKeepJsonObject(json, baseName);
                if (n) parsedNotes.push(n);
              }
            } catch {
              // Ignore invalid JSON in zip
            }
          } else if (pLower.endsWith('.html') || pLower.endsWith('.htm')) {
            const n = parseKeepHtmlText(text, baseName);
            if (n) parsedNotes.push(n);
          } else if (pLower.endsWith('.txt')) {
            const title = baseName.replace(/\.txt$/i, '');
            if (text.trim() || title) {
              parsedNotes.push({
                id: `keep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                title: title || 'Note',
                content: text,
                color: 'default',
                labels: [],
                isPinned: false,
                isArchived: false,
                isTrashed: false,
                isChecklist: false,
                checklistItems: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
            }
          }
        }
      } catch (err) {
        console.error('Error unzipping Keep file:', err);
      }
    } else if (nameLower.endsWith('.json')) {
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        if (Array.isArray(json)) {
          json.forEach(sub => {
            const n = parseKeepJsonObject(sub, file.name);
            if (n) parsedNotes.push(n);
          });
        } else {
          const n = parseKeepJsonObject(json, file.name);
          if (n) parsedNotes.push(n);
        }
      } catch (err) {
        console.warn(`Error parsing ${file.name}:`, err);
      }
    } else if (nameLower.endsWith('.html') || nameLower.endsWith('.htm')) {
      try {
        const text = await file.text();
        const n = parseKeepHtmlText(text, file.name);
        if (n) parsedNotes.push(n);
      } catch (err) {
        console.warn(`Error parsing ${file.name}:`, err);
      }
    } else if (nameLower.endsWith('.txt') || nameLower.endsWith('.md')) {
      try {
        const text = await file.text();
        const title = file.name.replace(/\.(txt|md)$/i, '');
        parsedNotes.push({
          id: `keep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          title: title || 'Imported Note',
          content: text,
          color: 'default',
          labels: [],
          isPinned: false,
          isArchived: false,
          isTrashed: false,
          isChecklist: false,
          checklistItems: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn(`Error parsing ${file.name}:`, err);
      }
    }
  }

  if (onProgress) onProgress(100, 'Keep import complete');
  return parsedNotes;
}

/**
 * Converts a Google Keep note model into a rich NoteObject for the Notes workspace.
 */
export function keepNoteToNoteObject(keepNote: KeepNote): NoteObject {
  const blocks: NoteBlock[] = [];

  if (keepNote.isChecklist && keepNote.checklistItems && keepNote.checklistItems.length > 0) {
    keepNote.checklistItems.forEach((item, idx) => {
      blocks.push({
        id: `blk-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'todo',
        content: item.text,
        checked: Boolean(item.completed)
      });
    });
  } else if (keepNote.content && keepNote.content.trim()) {
    const lines = keepNote.content.split('\n');
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      const blkId = `blk-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;
      if (!trimmed) {
        blocks.push({
          id: blkId,
          type: 'paragraph',
          content: ''
        });
      } else if (trimmed.startsWith('# ')) {
        blocks.push({
          id: blkId,
          type: 'h1',
          content: trimmed.replace(/^#\s+/, '')
        });
      } else if (trimmed.startsWith('## ')) {
        blocks.push({
          id: blkId,
          type: 'h2',
          content: trimmed.replace(/^##\s+/, '')
        });
      } else if (trimmed.startsWith('### ')) {
        blocks.push({
          id: blkId,
          type: 'h3',
          content: trimmed.replace(/^###\s+/, '')
        });
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        blocks.push({
          id: blkId,
          type: 'bullet',
          content: trimmed.replace(/^[-*]\s+/, '')
        });
      } else if (/^\d+\.\s+/.test(trimmed)) {
        blocks.push({
          id: blkId,
          type: 'numbered',
          content: trimmed.replace(/^\d+\.\s+/, '')
        });
      } else {
        blocks.push({
          id: blkId,
          type: 'paragraph',
          content: line
        });
      }
    });
  }

  if (blocks.length === 0) {
    blocks.push({
      id: `blk-${Date.now()}-1`,
      type: 'paragraph',
      content: ''
    });
  }

  // Tags: prepend 'google-keep' and include existing labels
  const rawTags = ['google-keep', ...(keepNote.labels || [])];
  const tags = Array.from(new Set(rawTags.map(t => t.trim()).filter(Boolean)));

  // Derive date key if note title or createdAt has YYYY-MM-DD
  let dateKey: string | undefined = undefined;
  const dateMatch = (keepNote.title || '').match(/\b(\d{4}-\d{2}-\d{2})\b/) || (keepNote.createdAt || '').match(/^(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    dateKey = dateMatch[1];
  }

  return {
    id: `note-keep-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    title: keepNote.title || (keepNote.isChecklist ? 'Keep Checklist' : 'Keep Note'),
    type: keepNote.isChecklist ? 'task' : 'note',
    icon: keepNote.isChecklist ? '☑️' : '💡',
    dateKey,
    createdAt: keepNote.createdAt || new Date().toISOString(),
    updatedAt: keepNote.updatedAt || new Date().toISOString(),
    status: keepNote.isArchived ? 'Archived' : 'To Do',
    priority: 'Medium',
    tags,
    isPinned: Boolean(keepNote.isPinned),
    favorite: Boolean(keepNote.isPinned),
    blocks
  };
}

/**
 * Parses files directly into NoteObjects for the Notes view.
 */
export async function parseKeepFilesToNoteObjects(
  files: File[],
  onProgress?: (percent: number, message: string) => void
): Promise<NoteObject[]> {
  const keepNotes = await parseKeepFiles(files, onProgress);
  return keepNotes.map(keepNoteToNoteObject);
}
