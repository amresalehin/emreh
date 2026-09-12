import { NoteObject, NoteBlock, NoteTemplate } from '../types/notes';
import { dbGet, dbSet } from './storage';
import { parseMarkdownToBlocks } from './pasteHandler';

export const NOTES_STORAGE_KEY = 'mylife_power_notes_v1';

export const DEFAULT_NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'tpl-daily',
    title: 'Daily Reflection & Journal',
    description: 'Structure your day with morning intention, timeline highlights, and evening gratitude.',
    icon: '☀️',
    type: 'diary',
    tags: ['daily', 'reflection', 'gratitude'],
    blocks: [
      { id: 'b-d-1', type: 'h2', content: '🎯 Daily Priorities & Focus' },
      { id: 'b-d-2', type: 'todo', content: 'Primary mission for today', checked: false },
      { id: 'b-d-3', type: 'todo', content: 'Secondary high-impact milestone', checked: false },
      { id: 'b-d-4', type: 'h2', content: '⚡ Stream of Consciousness & Notes' },
      { id: 'b-d-5', type: 'paragraph', content: 'Record thoughts, ideas, links, and breakthroughs as they happen...' },
      { id: 'b-d-6', type: 'callout', content: 'Key insight: "Small daily disciplines repeated consistently lead to exponential mastery."', calloutType: 'tip' },
      { id: 'b-d-7', type: 'h2', content: '🌿 Evening Review & Gratitude' },
      { id: 'b-d-8', type: 'bullet', content: 'What gave me the greatest energy today?' },
      { id: 'b-d-9', type: 'bullet', content: 'What could I optimize or delegate tomorrow?' }
    ]
  },
  {
    id: 'tpl-project',
    title: 'Project Roadmap & Spec',
    description: 'Anytype-style project management object with milestones, architecture, and team todos.',
    icon: '🚀',
    type: 'project',
    tags: ['project', 'roadmap', 'engineering'],
    blocks: [
      { id: 'b-p-1', type: 'callout', content: 'Project Goal: Deliver transformative value with precision architecture and frictionless UX.', calloutType: 'info' },
      { id: 'b-p-2', type: 'h2', content: '📋 Milestone Matrix' },
      {
        id: 'b-p-3',
        type: 'table',
        content: 'Milestones',
        tableData: [
          ['Milestone', 'Owner', 'Deadline', 'Status'],
          ['Discovery & Archetypes', 'Core Team', 'Week 1', 'Completed'],
          ['Core Engine Architecture', 'Lead Dev', 'Week 2', 'In Progress'],
          ['Graph & Backlink Engine', 'Data Arch', 'Week 3', 'Pending'],
          ['Production Release', 'Product', 'Week 4', 'Planned']
        ]
      },
      { id: 'b-p-4', type: 'h2', content: '🛠️ Action Items' },
      { id: 'b-p-5', type: 'todo', content: 'Review and refine data schema', checked: true },
      { id: 'b-p-6', type: 'todo', content: 'Benchmark graph layout performance', checked: false },
      { id: 'b-p-7', type: 'todo', content: 'Configure bidirectional sync tests', checked: false }
    ]
  },
  {
    id: 'tpl-zettel',
    title: 'Atomic Zettelkasten Concept',
    description: 'Single-idea knowledge node optimized for bi-directional linking and graph synthesis.',
    icon: '💡',
    type: 'concept',
    tags: ['pkm', 'zettelkasten', 'mentalmodel'],
    blocks: [
      { id: 'b-z-1', type: 'callout', content: 'Core Thesis: A single atomic concept expressed in your own words, freely connected to other ideas.', calloutType: 'quote' },
      { id: 'b-z-2', type: 'paragraph', content: 'State the premise clearly and concisely. Reference [[SiYuan & Anytype Power Workspace]] for system design.' },
      { id: 'b-z-3', type: 'h3', content: '🔗 Interconnected Relations' },
      { id: 'b-z-4', type: 'bullet', content: 'Contrasting principle: [[Second Brain Architecture]]' },
      { id: 'b-z-5', type: 'bullet', content: 'Practical application: [[Personal Knowledge Management]]' }
    ]
  },
  {
    id: 'tpl-meeting',
    title: 'Executive Meeting & Strategy',
    description: 'Capture attendees, core discussion points, decisions made, and follow-up commitments.',
    icon: '🤝',
    type: 'meeting',
    tags: ['meeting', 'strategy', 'action'],
    blocks: [
      { id: 'b-m-1', type: 'paragraph', content: '📅 **Date:** Today | **Attendees:** Core Stakeholders' },
      { id: 'b-m-2', type: 'h2', content: '🎯 Agenda & Strategic Context' },
      { id: 'b-m-3', type: 'bullet', content: 'Review current sprint metrics and delivery timeline.' },
      { id: 'b-m-4', type: 'bullet', content: 'Address architectural dependencies and unlock next steps.' },
      { id: 'b-m-5', type: 'h2', content: '✅ Action Items & Owners' },
      { id: 'b-m-6', type: 'todo', content: 'Publish technical RFC document', checked: false },
      { id: 'b-m-7', type: 'todo', content: 'Schedule deep-dive architecture workshop', checked: false }
    ]
  }
];

export const INITIAL_SEED_NOTES: NoteObject[] = [];

export async function loadStoredNotes(): Promise<NoteObject[]> {
  const DUMMY_IDS = new Set(['note-welcome-guide', 'note-project-pegasus', 'note-second-brain']);
  try {
    const stored = await dbGet<NoteObject[] | null>(NOTES_STORAGE_KEY, null);
    if (stored !== null && Array.isArray(stored)) {
      const filtered = stored.filter((n) => !DUMMY_IDS.has(n.id));
      return filtered;
    }
  } catch (err) {
    console.warn('Failed to load notes from storage:', err);
  }
  return [];
}

export async function persistStoredNotes(notes: NoteObject[]): Promise<void> {
  try {
    await dbSet(NOTES_STORAGE_KEY, notes);
  } catch (err) {
    console.warn('Failed to persist notes:', err);
  }
}

/**
 * Extracts all [[Note Title]] references from blocks.
 */
export function extractNoteLinks(blocks: NoteBlock[]): string[] {
  const links: string[] = [];
  const regex = /\[\[(.*?)\]\]/g;

  const traverse = (blockList: NoteBlock[]) => {
    for (const b of blockList) {
      if (b.content) {
        let match;
        while ((match = regex.exec(b.content)) !== null) {
          const title = match[1].trim();
          if (title && !links.includes(title)) {
            links.push(title);
          }
        }
      }
      if (b.children && b.children.length > 0) {
        traverse(b.children);
      }
    }
  };

  traverse(blocks);
  return links;
}

/**
 * Extracts all #tag items from blocks.
 */
export function extractNoteTags(blocks: NoteBlock[]): string[] {
  const tags: string[] = [];
  const regex = /#([a-zA-Z0-9_\-]+)/g;

  const traverse = (blockList: NoteBlock[]) => {
    for (const b of blockList) {
      if (b.content) {
        let match;
        while ((match = regex.exec(b.content)) !== null) {
          const tag = match[1].toLowerCase().trim();
          if (tag && !tags.includes(tag)) {
            tags.push(tag);
          }
        }
      }
      if (b.children && b.children.length > 0) {
        traverse(b.children);
      }
    }
  };

  traverse(blocks);
  return tags;
}

/**
 * Converts blocks to clean Markdown string.
 */
export function exportBlocksToMarkdown(note: NoteObject): string {
  const lines: string[] = [];
  lines.push(`# ${note.icon} ${note.title}\n`);
  lines.push(`> Type: **${note.type}** | Status: **${note.status || 'Active'}** | Priority: **${note.priority || 'Normal'}**`);
  if (note.tags && note.tags.length > 0) {
    lines.push(`> Tags: ${note.tags.map(t => `#${t}`).join(' ')}`);
  }
  lines.push('\n---\n');

  const renderBlock = (b: NoteBlock, indent = 0) => {
    const pad = '  '.repeat(indent);
    switch (b.type) {
      case 'h1':
        lines.push(`\n# ${b.content}\n`);
        break;
      case 'h2':
        lines.push(`\n## ${b.content}\n`);
        break;
      case 'h3':
        lines.push(`\n### ${b.content}\n`);
        break;
      case 'todo':
        lines.push(`${pad}- [${b.checked ? 'x' : ' '}] ${b.content}`);
        break;
      case 'bullet':
        lines.push(`${pad}- ${b.content}`);
        break;
      case 'numbered':
        lines.push(`${pad}1. ${b.content}`);
        break;
      case 'quote':
        lines.push(`${pad}> ${b.content}`);
        break;
      case 'callout':
        lines.push(`\n> [!${(b.calloutType || 'info').toUpperCase()}]\n> ${b.content}\n`);
        break;
      case 'code':
        lines.push(`\n\`\`\`${b.language || ''}\n${b.content}\n\`\`\`\n`);
        break;
      case 'divider':
        lines.push('\n---\n');
        break;
      case 'table':
        if (b.tableData && b.tableData.length > 0) {
          const header = b.tableData[0];
          lines.push(`| ${header.join(' | ')} |`);
          lines.push(`| ${header.map(() => '---').join(' | ')} |`);
          for (let r = 1; r < b.tableData.length; r++) {
            lines.push(`| ${b.tableData[r].join(' | ')} |`);
          }
          lines.push('');
        }
        break;
      case 'flashcard':
        lines.push(`\n**Q: ${b.content}**\n*A: ${b.flashcardAnswer || ''}*\n`);
        break;
      case 'timeline_embed':
        lines.push(`\n> 🎵 **[${b.timelineRef?.type?.toUpperCase() || 'TIMELINE'}]** ${b.timelineRef?.title || b.content}\n`);
        break;
      case 'document':
        lines.push(`\n📎 **[${b.documentData?.name || b.content || 'Document'}]** (${(b.documentData?.fileType || 'file').toUpperCase()})\n`);
        break;
      case 'image':
        lines.push(`\n![${b.imageData?.caption || b.content || 'Image'}](${b.imageData?.url || b.content})\n`);
        break;
      case 'paragraph':
      default:
        lines.push(`${pad}${b.content}`);
        break;
    }

    if (b.children && b.children.length > 0) {
      b.children.forEach(c => renderBlock(c, indent + 1));
    }
  };

  note.blocks.forEach(b => renderBlock(b));
  return lines.join('\n');
}

/**
 * Converts flat text or markdown into structured blocks.
 */
export function textToBlocks(text: string): NoteBlock[] {
  if (!text || !text.trim()) {
    return [{ id: `blk-${Date.now()}-1`, type: 'paragraph', content: '' }];
  }
  return parseMarkdownToBlocks(text);
}

/**
 * Converts structured blocks into a readable plain string for legacy dailyNotesMap compatibility.
 */
export function blocksToPlainText(blocks: NoteBlock[]): string {
  const result: string[] = [];
  const traverse = (bList: NoteBlock[]) => {
    for (const b of bList) {
      if (b.type === 'h1') result.push(`# ${b.content}`);
      else if (b.type === 'h2') result.push(`## ${b.content}`);
      else if (b.type === 'h3') result.push(`### ${b.content}`);
      else if (b.type === 'todo') result.push(`- [${b.checked ? 'x' : ' '}] ${b.content}`);
      else if (b.type === 'bullet') result.push(`- ${b.content}`);
      else if (b.type === 'numbered') result.push(`1. ${b.content}`);
      else if (b.type === 'quote') result.push(`> ${b.content}`);
      else if (b.type === 'divider') result.push('---');
      else if (b.type === 'callout') result.push(`> ${b.content}`);
      else if (b.content) result.push(b.content);

      if (b.children && b.children.length > 0) {
        traverse(b.children);
      }
    }
  };
  traverse(blocks);
  return result.join('\n');
}
