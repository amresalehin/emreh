export type BlockType =
  | 'paragraph'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'todo'
  | 'bullet'
  | 'numbered'
  | 'toggle'
  | 'callout'
  | 'quote'
  | 'code'
  | 'table'
  | 'math'
  | 'divider'
  | 'timeline_embed'
  | 'flashcard'
  | 'document'
  | 'image';

export type CalloutVariant = 'info' | 'tip' | 'warning' | 'success' | 'quote';

export type DocumentViewMode = 'inline_card' | 'embedded' | 'fullscreen';

export interface ImageAttachment {
  url: string;
  name?: string;
  caption?: string;
  alt?: string;
  width?: 'small' | 'medium' | 'wide' | 'full';
  align?: 'left' | 'center' | 'right';
  size?: number;
}

export interface DocumentAttachment {
  name: string;
  size: number;
  mimeType: string;
  fileType: 'pdf' | 'docx' | 'text' | 'image' | 'generic';
  dataUrl?: string; // base64 or blob URL
  textExtract?: string; // extracted text or markdown representation
  htmlExtract?: string; // converted html for docx
  pageCount?: number;
  viewMode?: DocumentViewMode;
}

export interface NoteBlock {
  id: string;
  type: BlockType;
  content: string;
  align?: 'left' | 'center' | 'right' | 'justify';
  checked?: boolean;
  collapsed?: boolean;
  children?: NoteBlock[];
  calloutType?: CalloutVariant;
  language?: string;
  tableData?: string[][]; // row x col
  mathFormula?: string;
  documentData?: DocumentAttachment;
  imageData?: ImageAttachment;
  timelineRef?: {
    type: 'spotify' | 'youtube' | 'maps' | 'browser';
    id: string;
    title: string;
    subtitle?: string;
    extra?: string;
  };
  flashcardAnswer?: string;
  srsData?: {
    interval: number; // in days
    easeFactor: number;
    repetitions: number;
    nextReview: string; // ISO string
    state: 'new' | 'learning' | 'review';
  };
}

export type ObjectType =
  | 'note'
  | 'diary'
  | 'project'
  | 'task'
  | 'concept'
  | 'meeting'
  | 'resource'
  | 'book';

export type ObjectStatus = 'Backlog' | 'To Do' | 'In Progress' | 'In Review' | 'Done' | 'Archived';
export type ObjectPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface NoteRelation {
  id: string;
  targetNoteId: string;
  relationType: 'relates_to' | 'parent_of' | 'child_of' | 'references' | 'inspired_by' | 'depends_on';
}

export interface NoteObject {
  id: string;
  title: string;
  type: ObjectType;
  icon?: string;
  cover?: string;
  dateKey?: string; // YYYY-MM-DD for daily notes
  createdAt: string;
  updatedAt: string;
  status?: ObjectStatus;
  priority?: ObjectPriority;
  tags: string[];
  rating?: number; // 1-5
  relations?: NoteRelation[];
  blocks: NoteBlock[];
  favorite?: boolean;
  isPinned?: boolean;
  customProperties?: Record<string, string | number | boolean>;
}

export type NotesSubView = 'document' | 'database' | 'kanban' | 'graph' | 'daily' | 'srs';

export interface GraphNode {
  id: string;
  title: string;
  type: ObjectType | 'tag';
  icon: string;
  degree: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  tags?: string[];
}

export interface GraphLink {
  source: string;
  target: string;
  type?: string;
}

export interface NoteTemplate {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: ObjectType;
  tags: string[];
  blocks: NoteBlock[];
}
