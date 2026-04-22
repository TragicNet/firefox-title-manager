const DB_NAME = 'firefox-title-manager';
const DB_VERSION = 1;
const LOG_STORE_NAME = 'logs';
const META_STORE_NAME = 'meta';
const META_LAST_PRUNED_KEY = 'lastPrunedAt';
const MAX_LOG_ENTRIES = 50000;
const MAX_LOG_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const PRUNE_INTERVAL_MS = 5 * 60 * 1000;

function normalizeLogEntry(entry = {}) {
  return {
    timestamp: entry.timestamp || new Date().toISOString(),
    level: entry.level || 'info',
    event: entry.event || 'unknown',
    details: entry.details || {},
  };
}

function sanitizeDetails(details = {}) {
  try {
    return JSON.parse(JSON.stringify(details));
  } catch (error) {
    return {
      serializationError: error.message,
      fallback: String(details),
    };
  }
}

function formatDateSegment(value) {
  return `${value}`.padStart(2, '0');
}

function requestAsPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionAsPromise(transaction) {
  return new Promise((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve(), { once: true });
    transaction.addEventListener('error', () => reject(transaction.error), { once: true });
    transaction.addEventListener('abort', () => reject(transaction.error), { once: true });
  });
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(LOG_STORE_NAME)) {
        const logStore = db.createObjectStore(LOG_STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
        logStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains(META_STORE_NAME)) {
        db.createObjectStore(META_STORE_NAME, {
          keyPath: 'key',
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function createLogFilename(now = new Date()) {
  const year = now.getFullYear();
  const month = formatDateSegment(now.getMonth() + 1);
  const day = formatDateSegment(now.getDate());
  const hours = formatDateSegment(now.getHours());
  const minutes = formatDateSegment(now.getMinutes());
  const seconds = formatDateSegment(now.getSeconds());

  return `firefox-title-manager-${year}${month}${day}-${hours}${minutes}${seconds}.log`;
}

export function formatLogEntries(entries = []) {
  return entries.map((entry) => {
    const details = Object.keys(entry.details || {}).length
      ? ` ${JSON.stringify(entry.details)}`
      : '';
    return `[${entry.timestamp}] ${entry.level.toUpperCase()} ${entry.event}${details}`;
  }).join('\n');
}

export default class LogStore {
  constructor() {
    this.dbPromise = openDatabase();
    this.writeQueue = Promise.resolve();
  }

  async append(level, event, details = {}) {
    const entry = normalizeLogEntry({
      level,
      event,
      details: sanitizeDetails(details),
    });

    this.writeQueue = this.writeQueue.then(async () => {
      const db = await this.dbPromise;
      const transaction = db.transaction([LOG_STORE_NAME], 'readwrite');
      transaction.objectStore(LOG_STORE_NAME).add(entry);
      await transactionAsPromise(transaction);
      await this._pruneIfNeeded(db);
    });

    return this.writeQueue;
  }

  async getEntries() {
    const db = await this.dbPromise;
    const transaction = db.transaction([LOG_STORE_NAME], 'readonly');
    const entries = await requestAsPromise(transaction.objectStore(LOG_STORE_NAME).getAll());
    await transactionAsPromise(transaction);

    return entries.map(({ id, ...entry }) => entry);
  }

  async clear() {
    const db = await this.dbPromise;
    const transaction = db.transaction([LOG_STORE_NAME, META_STORE_NAME], 'readwrite');
    transaction.objectStore(LOG_STORE_NAME).clear();
    transaction.objectStore(META_STORE_NAME).put({
      key: META_LAST_PRUNED_KEY,
      value: Date.now(),
    });
    await transactionAsPromise(transaction);
  }

  async exportToFile() {
    const entries = await this.getEntries();
    const contents = formatLogEntries(entries);
    const blob = new Blob([contents], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    try {
      await browser.downloads.download({
        url,
        filename: createLogFilename(),
        saveAs: true,
        conflictAction: 'uniquify',
      });
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  async _pruneIfNeeded(db) {
    const now = Date.now();
    const lastPrunedAt = await this._getLastPrunedAt(db);

    if (lastPrunedAt && now - lastPrunedAt < PRUNE_INTERVAL_MS) {
      return;
    }

    await this._prune(db, now);
  }

  async _getLastPrunedAt(db) {
    const transaction = db.transaction([META_STORE_NAME], 'readonly');
    const record = await requestAsPromise(
      transaction.objectStore(META_STORE_NAME).get(META_LAST_PRUNED_KEY),
    );
    await transactionAsPromise(transaction);
    return record ? record.value : null;
  }

  async _prune(db, now) {
    const cutoffTimestamp = new Date(now - MAX_LOG_AGE_MS).toISOString();
    const transaction = db.transaction([LOG_STORE_NAME, META_STORE_NAME], 'readwrite');
    const logStore = transaction.objectStore(LOG_STORE_NAME);
    const timestampIndex = logStore.index('timestamp');

    await this._deleteOlderThan(timestampIndex, cutoffTimestamp);

    const allKeys = await requestAsPromise(logStore.getAllKeys());
    if (allKeys.length > MAX_LOG_ENTRIES) {
      allKeys
        .slice(0, allKeys.length - MAX_LOG_ENTRIES)
        .forEach((key) => {
          logStore.delete(key);
        });
    }

    transaction.objectStore(META_STORE_NAME).put({
      key: META_LAST_PRUNED_KEY,
      value: now,
    });
    await transactionAsPromise(transaction);
  }

  async _deleteOlderThan(timestampIndex, cutoffTimestamp) {
    await new Promise((resolve, reject) => {
      const range = IDBKeyRange.upperBound(cutoffTimestamp, true);
      const request = timestampIndex.openKeyCursor(range);

      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve();
          return;
        }

        cursor.delete();
        cursor.continue();
      };

      request.onerror = () => reject(request.error);
    });
  }
}
