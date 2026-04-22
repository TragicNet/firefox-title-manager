import FirefoxTitleManager from '/src/FirefoxTitleManager.js';
import { DEFAULT_SETTINGS } from '/src/config.js';

const manager = new FirefoxTitleManager();

const profileTitleInput = document.querySelector('#profile-title');
const profileSeparatorInput = document.querySelector('#profile-title-separator');
const openingTagInput = document.querySelector('#opening-tag');
const closingTagInput = document.querySelector('#closing-tag');

function applySettings(settings) {
  profileTitleInput.value = settings.profileTitle;
  profileSeparatorInput.value = settings.profileSeparator;
  openingTagInput.value = settings.openingTag;
  closingTagInput.value = settings.closingTag;
}

async function loadSettings() {
  applySettings(await manager.getSettings());
}

async function saveProfile() {
  await manager.saveProfile(profileTitleInput.value, profileSeparatorInput.value);
}

async function saveTags() {
  await manager.saveTags(openingTagInput.value, closingTagInput.value);
}

function restoreProfileDefaults() {
  profileTitleInput.value = DEFAULT_SETTINGS.profileTitle;
  profileSeparatorInput.value = DEFAULT_SETTINGS.profileSeparator;
}

function restoreTagDefaults() {
  openingTagInput.value = DEFAULT_SETTINGS.openingTag;
  closingTagInput.value = DEFAULT_SETTINGS.closingTag;
}

loadSettings();
document.querySelector('#save-profile').addEventListener('click', saveProfile);
document.querySelector('#restore-profile-defaults').addEventListener('click', restoreProfileDefaults);
document.querySelector('#save-tags').addEventListener('click', saveTags);
document.querySelector('#restore-tag-defaults').addEventListener('click', restoreTagDefaults);
