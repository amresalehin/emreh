/**
 * Typed error classes for Emreh's storage layer.
 * These allow callers to distinguish between different failure modes
 * and respond appropriately (e.g., show UI warnings, retry, or degrade gracefully).
 */

export class StorageError extends Error {
  constructor(message: string, public readonly key: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'StorageError';
  }
}

export class StorageWriteError extends StorageError {
  constructor(key: string, cause?: unknown) {
    super(`Failed to write key "${key}" to storage`, key, cause);
    this.name = 'StorageWriteError';
  }
}

export class StorageReadError extends StorageError {
  constructor(key: string, cause?: unknown) {
    super(`Failed to read key "${key}" from storage`, key, cause);
    this.name = 'StorageReadError';
  }
}

export class StorageDeleteError extends StorageError {
  constructor(key: string, cause?: unknown) {
    super(`Failed to delete key "${key}" from storage`, key, cause);
    this.name = 'StorageDeleteError';
  }
}

export class StorageQuotaError extends StorageWriteError {
  constructor(key: string, cause?: unknown) {
    super(key, cause);
    this.name = 'StorageQuotaError';
    this.message = `Storage quota exceeded writing key "${key}"`;
  }
}

export class StorageUnavailableError extends StorageError {
  constructor(cause?: unknown) {
    super('IndexedDB is not available in this environment', '', cause);
    this.name = 'StorageUnavailableError';
  }
}
