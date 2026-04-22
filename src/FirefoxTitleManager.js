import SettingsStore from '/src/storage/SettingsStore.js';
import WindowStateStore from '/src/storage/WindowStateStore.js';
import { debugLog } from '/src/debug.js';
import formatWindowTitle from '/src/formatWindowTitle.js';

export default class FirefoxTitleManager {
  constructor() {
    this.settingsStore = new SettingsStore();
    this.windowStateStore = new WindowStateStore();
  }

  async saveProfile(profileTitle, profileSeparator) {
    debugLog('saveProfile', {
      profileTitle,
      profileSeparator,
    });
    await this.settingsStore.saveProfile(profileTitle, profileSeparator);
    await this.refreshAllWindows();
  }

  async saveTags(openingTag, closingTag) {
    debugLog('saveTags', {
      openingTag,
      closingTag,
    });
    await this.settingsStore.saveTags(openingTag, closingTag);
    await this.refreshAllWindows();
  }

  async saveWindowTitle(windowId, userTitle) {
    debugLog('saveWindowTitle', {
      windowId,
      userTitle,
    });
    await this.windowStateStore.saveUserTitle(windowId, userTitle);
    await this.refreshWindow(windowId);
  }

  async getWindowTitle(windowId) {
    return this.windowStateStore.getUserTitle(windowId);
  }

  async getSettings() {
    return this.settingsStore.getSettings();
  }

  async restoreSession() {
    const windows = await browser.windows.getAll();
    const windowIds = windows.map(({ id }) => id);

    debugLog('restoreSession', {
      windowIds,
    });
    await this.windowStateStore.restoreWindows(windowIds);
    await this.refreshAllWindows(windows);
  }

  async refreshAllWindows(windows = null) {
    const [availableWindows, settings] = await Promise.all([
      windows ? Promise.resolve(windows) : browser.windows.getAll(),
      this.settingsStore.getSettings(),
    ]);

    debugLog('refreshAllWindows', {
      windowIds: availableWindows.map(({ id }) => id),
      settings,
    });
    await Promise.all(availableWindows.map(({ id }) => this.refreshWindow(id, settings)));
  }

  async refreshWindow(windowId, settings = null) {
    const [resolvedSettings, userTitle] = await Promise.all([
      settings ? Promise.resolve(settings) : this.settingsStore.getSettings(),
      this.windowStateStore.getUserTitle(windowId),
    ]);

    const titlePreface = formatWindowTitle(resolvedSettings, userTitle);
    debugLog('refreshWindow', {
      windowId,
      userTitle,
      titlePreface,
      settings: resolvedSettings,
    });
    await browser.windows.update(windowId, {
      titlePreface,
    });
  }
}
