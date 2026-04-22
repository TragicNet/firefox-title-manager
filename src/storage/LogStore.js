import { STORAGE_KEYS } from '/src/config.js';

const EMPTY_LOG_STORE = {
  entries: [],
};

const MAX_LOG_ENTRIES = 500;

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
    this.writeQueue = Promise.resolve();
  }

  async append(level, event, details = {}) {
    const entry = normalizeLogEntry({
      level,
      event,
      details: sanitizeDetails(details),
    });

    this.writeQueue = this.writeQueue.then(async () => {
      const store = await this._getStore();
      const entries = [...store.entries, entry].slice(-MAX_LOG_ENTRIES);
      await browser.storage.local.set({
        [STORAGE_KEYS.logs]: { entries },
      });
    });

    return this.writeQueue;
  }

  async getEntries() {
    const store = await this._getStore();
    return store.entries;
  }

  async clear() {
    await browser.storage.local.set({
      [STORAGE_KEYS.logs]: EMPTY_LOG_STORE,
    });
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

  async _getStore() {
    const values = await browser.storage.local.get({
      [STORAGE_KEYS.logs]: EMPTY_LOG_STORE,
    });

    return {
      entries: values[STORAGE_KEYS.logs].entries || [],
    };
  }
}
