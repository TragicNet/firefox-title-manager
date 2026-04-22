export const EXTENSION_NAME = 'Firefox-Title-Manager';

export const MAX_TITLE_LENGTH = 100;

export const DEFAULT_SETTINGS = {
  profileTitle: '',
  profileSeparator: ' - ',
  openingTag: '[',
  closingTag: '] ',
};

export const STORAGE_KEYS = {
  profileTitle: 'profileTitle',
  profileSeparator: 'profileTitleSeparator',
  openingTag: 'fullWindowTitleOpeningTag',
  closingTag: 'fullWindowTitleClosingTag',
  windowStates: 'windowStateStore',
  logs: 'extensionLogs',
};

export const SESSION_KEYS = {
  stateId: 'windowStateId',
  userTitle: 'userWindowTitle',
  legacyFullTitle: 'title',
};
