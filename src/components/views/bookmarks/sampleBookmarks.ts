import { UniversalBookmarkResult } from '../../../utils/bookmarkSyncServices';

export function getSampleBookmarksResult(): UniversalBookmarkResult {
  return {
    items: [],
    notes: {},
    tags: {},
    snapshots: {},
    count: 0,
    service: 'Bookmarks',
    collections: []
  };
}
