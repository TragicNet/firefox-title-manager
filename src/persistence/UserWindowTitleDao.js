import StorageInputValidator from './StorageInputValidator.js';
import WindowStateDao from './WindowStateDao.js';

const sessionStorageNames = {
  windowStateId: 'windowStateId',
  userWindowTitle: 'userWindowTitle',
  legacyFullWindowTitle: 'title',
};

class UserWindowTitleDao {
  constructor() {
    this._storageInputValidator = new StorageInputValidator();
    this._windowStateDao = new WindowStateDao();
  }

  async getUserWindowTitle(windowId) {
    const windowState = await this._getWindowState(windowId);
    return windowState.userWindowTitle;
  }

  async saveUserWindowTitle(currentWindowId, userWindowTitle) {
    this._storageInputValidator.validate(userWindowTitle);

    const windowStateId = await this._ensureWindowStateId(currentWindowId);

    await Promise.all([
      this._windowStateDao.saveState(windowStateId, {
        userWindowTitle,
        updatedAt: Date.now(),
      }),
      browser.sessions
        .setWindowValue(currentWindowId, sessionStorageNames.userWindowTitle, userWindowTitle),
    ]);
  }

  async ensureWindowState(windowId) {
    await this._getWindowState(windowId);
  }

  async pruneStatesForOpenWindows(windowIds) {
    const allStateIds = await this._windowStateDao.getAllStateIds();
    const activeStateIds = await Promise.all(windowIds.map(windowId => this._getAssignedWindowStateId(windowId)));
    const stateIdsToDelete = allStateIds.filter(stateId => !activeStateIds.includes(stateId));

    await Promise.all(stateIdsToDelete.map(stateId => this._windowStateDao.deleteState(stateId)));
  }

  async _getWindowState(windowId) {
    const windowStateId = await this._ensureWindowStateId(windowId);
    const windowState = await this._windowStateDao.getState(windowStateId);

    return windowState || {
      userWindowTitle: '',
      updatedAt: Date.now(),
    };
  }

  async _ensureWindowStateId(windowId) {
    const existingStateId = await this._getAssignedWindowStateId(windowId);
    if (existingStateId) {
      return existingStateId;
    }

    const recoveredUserWindowTitle = await this._getRecoverableUserWindowTitle(windowId);
    const windowStateId = await this._windowStateDao.createState({
      userWindowTitle: recoveredUserWindowTitle,
      updatedAt: Date.now(),
    });

    await browser.sessions.setWindowValue(windowId, sessionStorageNames.windowStateId, windowStateId);
    return windowStateId;
  }

  async _getAssignedWindowStateId(windowId) {
    const windowStateId = await browser.sessions
      .getWindowValue(windowId, sessionStorageNames.windowStateId);

    if (!windowStateId) {
      return null;
    }

    const state = await this._windowStateDao.getState(windowStateId);
    return state ? windowStateId : null;
  }

  async _getRecoverableUserWindowTitle(windowId) {
    const recoveredUserWindowTitle = await browser.sessions
      .getWindowValue(windowId, sessionStorageNames.userWindowTitle);
    if (recoveredUserWindowTitle) {
      return recoveredUserWindowTitle;
    }

    return this._migrateLegacyWindowTitle(windowId);
  }

  async _migrateLegacyWindowTitle(windowId) {
    const fullWindowTitle = await browser.sessions
      .getWindowValue(windowId, sessionStorageNames.legacyFullWindowTitle);
    if (!fullWindowTitle) {
      return '';
    }

    const userWindowTitle = this._convertToUserWindowTitle(fullWindowTitle);

    await Promise.all([
      browser.sessions
        .setWindowValue(windowId, sessionStorageNames.userWindowTitle, userWindowTitle),
      browser.sessions
        .removeWindowValue(windowId, sessionStorageNames.legacyFullWindowTitle),
    ]);

    return userWindowTitle;
  }

  _convertToUserWindowTitle(fullWindowTitle) {
    // '[myWindowTitle] ' => 'myWindowTitle'
    return fullWindowTitle.substring(1, fullWindowTitle.length - 2);
  }
}

export default UserWindowTitleDao;
