import {
  DEFAULT_SETTINGS,
  MAX_TITLE_LENGTH,
  STORAGE_KEYS,
} from '/src/config.js';

function validateText(value) {
  if (value.length > MAX_TITLE_LENGTH) {
    throw new Error('Max length exceeded.');
  }
}

export default class SettingsStore {
  async getSettings() {
    const values = await browser.storage.local.get({
      [STORAGE_KEYS.profileTitle]: DEFAULT_SETTINGS.profileTitle,
      [STORAGE_KEYS.profileSeparator]: DEFAULT_SETTINGS.profileSeparator,
      [STORAGE_KEYS.openingTag]: DEFAULT_SETTINGS.openingTag,
      [STORAGE_KEYS.closingTag]: DEFAULT_SETTINGS.closingTag,
    });

    return {
      profileTitle: values[STORAGE_KEYS.profileTitle],
      profileSeparator: values[STORAGE_KEYS.profileSeparator],
      openingTag: values[STORAGE_KEYS.openingTag],
      closingTag: values[STORAGE_KEYS.closingTag],
    };
  }

  async saveProfile(profileTitle, profileSeparator) {
    validateText(profileTitle);
    validateText(profileSeparator);

    await browser.storage.local.set({
      [STORAGE_KEYS.profileTitle]: profileTitle,
      [STORAGE_KEYS.profileSeparator]: profileSeparator,
    });
  }

  async saveTags(openingTag, closingTag) {
    validateText(openingTag);
    validateText(closingTag);

    await browser.storage.local.set({
      [STORAGE_KEYS.openingTag]: openingTag,
      [STORAGE_KEYS.closingTag]: closingTag,
    });
  }
}
