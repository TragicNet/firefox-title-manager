import WindowTitleDao from '/src/persistence/UserWindowTitleDao.js';
import ProfileTitleDao from '/src/persistence/ProfileTitleDao.js';
import FullWindowTitleComputer from '/src/model/FullWindowTitleComputer.js';
import FullWindowTitleTagDao from '/src/persistence/FullWindowTitleTagDao.js';

export default class WindowTitler {
  constructor() {
    this._titleComputer = new FullWindowTitleComputer();
    this._windowTitleDao = new WindowTitleDao();
    this._profileTitleDao = new ProfileTitleDao();
    this._fullWindowTitleTagDao = new FullWindowTitleTagDao();
  }

  async saveProfileTitleAndRefreshPresentation(profileTitle, profileTitleSeparator = null) {
    const saveOperations = [this._profileTitleDao.saveProfileTitle(profileTitle)];
    if (profileTitleSeparator !== null) {
      saveOperations.push(this._profileTitleDao.saveProfileTitleSeparator(profileTitleSeparator));
    }

    await Promise.all(saveOperations);
    await this.refreshPresentationForAllWindows();
  }

  async saveFullWindowTitleTagsAndRefreshPresentation(openingTag, closingTag) {
    await Promise.all([
      this._fullWindowTitleTagDao.saveOpeningTag(openingTag),
      this._fullWindowTitleTagDao.saveClosingTag(closingTag),
    ]);
    await this.refreshPresentationForAllWindows();
  }

  async saveUserWindowTitleAndRefreshPresentation(windowId, userWindowTitle) {
    await this._windowTitleDao.saveUserWindowTitle(windowId, userWindowTitle);
    await this._refreshPresentationForWindow(windowId);
  }

  async restoreStateForAllWindows() {
    const windows = await browser.windows.getAll();

    await Promise.all(windows.map(({ id }) => this._windowTitleDao.ensureWindowState(id)));
    await this._windowTitleDao.pruneStatesForOpenWindows(windows.map(({ id }) => id));
    await this.refreshPresentationForAllWindows();
  }

  async refreshPresentationForAllWindows() {
    const [windows, sharedTitleParts] = await Promise.all([
      browser.windows.getAll(),
      this._getSharedTitleParts(),
    ]);

    await Promise.all(
      windows.map(({ id }) => this._refreshPresentationForWindow(id, sharedTitleParts)),
    );
  }

  async _refreshPresentationForWindow(windowId, sharedTitleParts = null) {
    const {
      profileTitle,
      profileTitleSeparator,
      fullWindowTitleOpeningTag,
      fullWindowTitleClosingTag,
    } = sharedTitleParts || await this._getSharedTitleParts();
    const userWindowTitle = await this._windowTitleDao.getUserWindowTitle(windowId);
    const fullWindowTitle = await this._titleComputer.computeFullWindowTitle(profileTitle,
      profileTitleSeparator, userWindowTitle, fullWindowTitleOpeningTag, fullWindowTitleClosingTag);

    await browser.windows.update(windowId, { titlePreface: fullWindowTitle });
  }

  async _getSharedTitleParts() {
    const [
      profileTitle,
      profileTitleSeparator,
      fullWindowTitleOpeningTag,
      fullWindowTitleClosingTag,
    ] = await Promise.all([
      this._profileTitleDao.getProfileTitle(),
      this._profileTitleDao.getProfileTitleSeparator(),
      this._fullWindowTitleTagDao.getOpeningTag(),
      this._fullWindowTitleTagDao.getClosingTag(),
    ]);

    return {
      profileTitle,
      profileTitleSeparator,
      fullWindowTitleOpeningTag,
      fullWindowTitleClosingTag,
    };
  }
}
