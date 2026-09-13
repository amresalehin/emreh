import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { dbDelete, dbDeleteMany, dbGet, dbSet, dbSetVersioned } from '../src/utils/storage';
import { loadStoredNotes, NOTES_STORAGE_KEY, persistStoredNotes } from '../src/utils/notesStorage';
import type { NoteObject } from '../src/types/notes';

class MemoryStorage {
  private data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(String(key), String(value));
  }

  removeItem(key: string): void {
    this.data.delete(String(key));
  }

  clear(): void {
    this.data.clear();
  }
}

const storage = new MemoryStorage();

function installBrowserFallback(): void {
  (globalThis as typeof globalThis & { window?: Window }).window = {
    localStorage: storage,
  } as unknown as Window;
}

function removeBrowserFallback(): void {
  delete (globalThis as typeof globalThis & { window?: Window }).window;
}

beforeEach(() => {
  storage.clear();
  installBrowserFallback();
});

afterEach(() => {
  storage.clear();
  removeBrowserFallback();
});

void test('dbSet and dbGet round-trip through localStorage when IndexedDB is unavailable', async () => {
  const value = { version: 1, items: ['alpha', 'beta'] };

  await dbSet('storage-test', value);

  assert.deepEqual(await dbGet('storage-test', null), value);
  assert.deepEqual(JSON.parse(storage.getItem('storage-test') || 'null'), value);
});

void test('dbGet migrates an existing localStorage value and removes it only after persistence succeeds', async () => {
  const value = { migrated: true, count: 3 };
  storage.setItem('migration-test', JSON.stringify(value));

  assert.deepEqual(await dbGet('migration-test', null), value);
  assert.equal(storage.getItem('migration-test'), null);
});

void test('dbSetVersioned increments versions and rejects stale expected versions', async () => {
  const first = await dbSetVersioned('versioned-value', { revision: 'one' }, 'versioned-value-version');
  assert.equal(first, 1);

  const second = await dbSetVersioned(
    'versioned-value',
    { revision: 'two' },
    'versioned-value-version',
    first
  );
  assert.equal(second, 2);
  assert.deepEqual(await dbGet('versioned-value', null), { revision: 'two' });

  await assert.rejects(
    dbSetVersioned('versioned-value', { revision: 'stale' }, 'versioned-value-version', 1),
    /Version conflict: expected 1, current is 2/
  );
  assert.deepEqual(await dbGet('versioned-value', null), { revision: 'two' });
});

void test('dbDeleteMany de-duplicates keys and removes every requested value', async () => {
  await dbSet('delete-a', { a: 1 });
  await dbSet('delete-b', { b: 2 });
  await dbSet('delete-c', { c: 3 });

  await dbDeleteMany(['delete-a', 'delete-a', '', 'delete-c']);

  assert.equal(storage.getItem('delete-a'), null);
  assert.equal(storage.getItem('delete-c'), null);
  assert.deepEqual(await dbGet('delete-b', null), { b: 2 });
});

void test('dbDelete removes a value from the fallback store', async () => {
  await dbSet('single-delete', { keep: false });
  await dbDelete('single-delete');
  assert.equal(await dbGet('single-delete', 'missing'), 'missing');
});

void test('notes persistence survives a storage-only environment', async () => {
  const note = {
    id: 'storage-note-1',
    title: 'Persistent note',
    icon: '📝',
    type: 'concept',
    status: 'Active',
    priority: 'Normal',
    tags: ['test'],
    blocks: [{ id: 'b1', type: 'paragraph', content: 'Stored content' }],
  } as unknown as NoteObject;

  await persistStoredNotes([note]);
  const loaded = await loadStoredNotes();

  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].id, note.id);
  assert.equal(loaded[0].title, note.title);
  assert.deepEqual(loaded[0].blocks, note.blocks);
  assert.equal(storage.getItem(NOTES_STORAGE_KEY) !== null, true);
});
