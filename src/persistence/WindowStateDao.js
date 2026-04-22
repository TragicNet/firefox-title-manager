const localStorageNames = {
  windowStateStore: 'windowStateStore',
};

const defaultWindowStateStore = {
  states: {},
};

export default class WindowStateDao {
  async getState(stateId) {
    const store = await this._getStore();
    return store.states[stateId] || null;
  }

  async createState(initialState = {}) {
    const store = await this._getStore();
    const stateId = this._generateStateId();
    const nextStore = {
      ...store,
      states: {
        ...store.states,
        [stateId]: this._normalizeState(initialState),
      },
    };

    await this._saveStore(nextStore);
    return stateId;
  }

  async saveState(stateId, state) {
    const store = await this._getStore();
    const nextStore = {
      ...store,
      states: {
        ...store.states,
        [stateId]: this._normalizeState(state),
      },
    };

    await this._saveStore(nextStore);
  }

  async deleteState(stateId) {
    const store = await this._getStore();
    if (!store.states[stateId]) {
      return;
    }

    const nextStates = { ...store.states };
    delete nextStates[stateId];

    await this._saveStore({
      ...store,
      states: nextStates,
    });
  }

  async getAllStateIds() {
    const store = await this._getStore();
    return Object.keys(store.states);
  }

  async _getStore() {
    const storageObject = await browser.storage.local.get({
      [localStorageNames.windowStateStore]: defaultWindowStateStore,
    });

    return this._normalizeStore(storageObject[localStorageNames.windowStateStore]);
  }

  async _saveStore(store) {
    await browser.storage.local.set({
      [localStorageNames.windowStateStore]: this._normalizeStore(store),
    });
  }

  _normalizeStore(store = defaultWindowStateStore) {
    return {
      states: store.states || {},
    };
  }

  _normalizeState(state = {}) {
    return {
      userWindowTitle: state.userWindowTitle || '',
      updatedAt: state.updatedAt || Date.now(),
    };
  }

  _generateStateId() {
    if (globalThis.crypto && globalThis.crypto.randomUUID) {
      return globalThis.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
