import test from 'node:test';
import assert from 'node:assert/strict';
import { blocksToPlainText, exportBlocksToMarkdown, extractNoteLinks, extractNoteTags } from '../src/utils/notesStorage';
import type { NoteObject, NoteBlock } from '../src/types/notes';

const nestedBlocks: NoteBlock[] = [
  { id: '1', type: 'paragraph', content: 'Read [[Project Alpha]] and [[Project Beta]] #Research #Research' },
  {
    id: '2',
    type: 'bullet',
    content: 'Top item',
    children: [
      { id: '3', type: 'todo', content: 'Nested task #Todo', checked: true },
    ],
  },
];

void test('extracts unique wiki links recursively', () => {
  assert.deepEqual(extractNoteLinks(nestedBlocks), ['Project Alpha', 'Project Beta']);
});

void test('extracts normalized unique tags recursively', () => {
  assert.deepEqual(extractNoteTags(nestedBlocks), ['research', 'todo']);
});

void test('flattens nested blocks into readable legacy text', () => {
  assert.equal(blocksToPlainText(nestedBlocks), 'Read [[Project Alpha]] and [[Project Beta]] #Research #Research\n- Top item\n- [x] Nested task #Todo');
});

void test('exports structured blocks as deterministic markdown', () => {
  const note = {
    id: 'n1',
    title: 'Research Notes',
    icon: '🧠',
    type: 'concept',
    status: 'Active',
    priority: 'High',
    tags: ['research'],
    blocks: [
      { id: 'h', type: 'h2', content: 'Findings' },
      { id: 't', type: 'todo', content: 'Verify source', checked: false },
      { id: 'c', type: 'code', content: 'const answer = 42;', language: 'ts' },
    ],
  } as unknown as NoteObject;

  const markdown = exportBlocksToMarkdown(note);
  assert.match(markdown, /^# 🧠 Research Notes/);
  assert.match(markdown, /## Findings/);
  assert.match(markdown, /- \[ \] Verify source/);
  assert.match(markdown, /```ts[\s\S]*const answer = 42;/);
});
