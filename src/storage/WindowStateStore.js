import {
  MAX_TITLE_LENGTH,
  SESSION_KEYS,
  STORAGE_KEYS,
} from '/src/config.js';

const EMPTY_STATE_STORE = {
  states: {},
};

function validateText(value) {
  if (value.length > MAX_TITLE_LENGTH) {
    throw new Error('Max length exceeded.');
  }
}

function normalizeState(state = {}) {
  return {
    userTitle: state.userTitle || '',
    updatedAt: state.updatedAt || Date.now(),
  };
}

export default class WindowStateStore {
  async getUserTitle(windowId) {
    const stateId = await this._ensureStateId(windowId);
    const store = await this._getStore();
    return (store.states[stateId] || normalizeState()).userTitle;
  }

  async saveUserTitle(windowId, userTitle) {
    validateText(userTitle);

    const stateId = await this._ensureStateId(windowId);
    const store = await this._getStore();

    await this._saveStore({
      ...store,
      states: {
        ...store.states,
        [stateId]: normalizeState({ userTitle, updatedAt: Date.now() }),
      },
    });

    await browser.sessions.setWindowValue(windowId, SESSION_KEYS.userTitle, userTitle);
  }

  async restoreWindows(windowIds) {
    await Promise.all(windowIds.map(windowId => this._ensureStateId(windowId)));
    await this._deleteUnusedStates(windowIds);
  }

  async _ensureStateId(windowId) {
    const currentStateId = await this._getExistingStateId(windowId);
    if (currentStateId) {
      return currentStateId;
    }

    const recoveredTitle = await this._getRecoverableTitle(windowId);
    const stateId = this._createStateId();
    const store = await this._getStore();

    await this._saveStore({
      ...store,
      states: {
        ...store.states,
        [stateId]: normalizeState({ userTitle: recoveredTitle, updatedAt: Date.now() }),
      },
    });

    await browser.sessions.setWindowValue(windowId, SESSION_KEYS.stateId, stateId);
    return stateId;
  }

  async _getExistingStateId(windowId) {
    const stateId = await browser.sessions.getWindowValue(windowId, SESSION_KEYS.stateId);
    if (!stateId) {
      return null;
    }

    const store = await this._getStore();
    return store.states[stateId] ? stateId : null;
  }

  async _getRecoverableTitle(windowId) {
    const sessionTitle = await browser.sessions.getWindowValue(windowId, SESSION_KEYS.userTitle);
    if (sessionTitle) {
      return sessionTitle;
    }

    const legacyFullTitle = await browser.sessions
      .getWindowValue(windowId, SESSION_KEYS.legacyFullTitle);

    if (!legacyFullTitle) {
      return '';
    }

    const legacyTitle = legacyFullTitle.substring(1, legacyFullTitle.length - 2);

    await Promise.all([
      browser.sessions.setWindowValue(windowId, SESSION_KEYS.userTitle, legacyTitle),
      browser.sessions.removeWindowValue(windowId, SESSION_KEYS.legacyFullTitle),
    ]);

    return legacyTitle;
  }

  async _deleteUnusedStates(windowIds) {
    const activeStateIds = await Promise.all(windowIds.map(windowId => this._getExistingStateId(windowId)));
    const activeStateIdSet = new Set(activeStateIds.filter(Boolean));
    const store = await this._getStore();
    const nextStates = Object.fromEntries(
      Object.entries(store.states).filter(([stateId]) => activeStateIdSet.has(stateId)),
    );

    if (Object.keys(nextStates).length === Object.keys(store.states).length) {
      return;
    }

    await this._saveStore({
      ...store,
      states: nextStates,
    });
  }

  async _getStore() {
    const values = await browser.storage.local.get({
      [STORAGE_KEYS.windowStates]: EMPTY_STATE_STORE,
    });

    return {
      states: values[STORAGE_KEYS.windowStates].states || {},
    };
  }

  async _saveStore(store) {
    await browser.storage.local.set({
      [STORAGE_KEYS.windowStates]: {
        states: store.states || {},
      },
    });
  }

  _createStateId() {
    if (globalThis.crypto && globalThis.crypto.randomUUID) {
      return globalThis.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
