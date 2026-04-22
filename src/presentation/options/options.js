import FirefoxTitleManager from '/src/FirefoxTitleManager.js';
import { debugError, debugLog } from '/src/debug.js';
import LogStore from '/src/storage/LogStore.js';
import { DEFAULT_SETTINGS } from '/src/config.js';
import formatWindowTitle from '/src/formatWindowTitle.js';

const manager = new FirefoxTitleManager();
const logStore = new LogStore();

const profileTitleInput = document.querySelector('#profile-title');
const profileSeparatorInput = document.querySelector('#profile-title-separator');
const openingTagInput = document.querySelector('#opening-tag');
const closingTagInput = document.querySelector('#closing-tag');
const exportLogsButton = document.querySelector('#export-logs');
const clearLogsButton = document.querySelector('#clear-logs');
const statusMessage = document.querySelector('#status-message');
const titlePreview = document.querySelector('#title-preview');

let statusResetTimer = null;

function setStatus(message, tone = 'neutral') {
  statusMessage.textContent = message;
  statusMessage.dataset.tone = tone;

  clearTimeout(statusResetTimer);
  statusResetTimer = setTimeout(() => {
    statusMessage.textContent = 'Ready';
    statusMessage.dataset.tone = 'neutral';
  }, 2400);
}

function updatePreview() {
  titlePreview.textContent = formatWindowTitle({
    profileTitle: profileTitleInput.value,
    profileSeparator: profileSeparatorInput.value || DEFAULT_SETTINGS.profileSeparator,
    openingTag: openingTagInput.value,
    closingTag: closingTagInput.value,
  }, 'Window');
}

function applySettings(settings) {
  profileTitleInput.value = settings.profileTitle;
  profileSeparatorInput.value = settings.profileSeparator;
  openingTagInput.value = settings.openingTag;
  closingTagInput.value = settings.closingTag;
  updatePreview();
}

async function loadSettings() {
  applySettings(await manager.getSettings());
  setStatus('Loaded', 'success');
}

async function saveProfile() {
  await manager.saveProfile(profileTitleInput.value, profileSeparatorInput.value);
  updatePreview();
  setStatus('Profile label saved', 'success');
}

async function saveTags() {
  await manager.saveTags(openingTagInput.value, closingTagInput.value);
  updatePreview();
  setStatus('Title tags saved', 'success');
}

async function exportLogs() {
  debugLog('options.exportLogs requested');
  await logStore.exportToFile();
  setStatus('Logs exported', 'success');
}

async function clearLogs() {
  await logStore.clear();
  debugLog('options.clearLogs completed');
  setStatus('Logs cleared', 'success');
}

function restoreProfileDefaults() {
  profileTitleInput.value = DEFAULT_SETTINGS.profileTitle;
  profileSeparatorInput.value = DEFAULT_SETTINGS.profileSeparator;
  updatePreview();
  setStatus('Profile defaults restored');
}

function restoreTagDefaults() {
  openingTagInput.value = DEFAULT_SETTINGS.openingTag;
  closingTagInput.value = DEFAULT_SETTINGS.closingTag;
  updatePreview();
  setStatus('Tag defaults restored');
}

Promise.resolve(loadSettings()).catch((error) => {
  debugError('options.loadSettings failed', error);
  setStatus('Failed to load settings', 'error');
});

document.querySelector('#save-profile').addEventListener('click', async () => {
  try {
    await saveProfile();
  } catch (error) {
    debugError('options.saveProfile failed', error);
    setStatus('Failed to save profile label', 'error');
    throw error;
  }
});
document.querySelector('#restore-profile-defaults').addEventListener('click', restoreProfileDefaults);
document.querySelector('#save-tags').addEventListener('click', async () => {
  try {
    await saveTags();
  } catch (error) {
    debugError('options.saveTags failed', error);
    setStatus('Failed to save title tags', 'error');
    throw error;
  }
});
document.querySelector('#restore-tag-defaults').addEventListener('click', restoreTagDefaults);
exportLogsButton.addEventListener('click', async () => {
  try {
    await exportLogs();
  } catch (error) {
    debugError('options.exportLogs failed', error);
    setStatus('Failed to export logs', 'error');
    throw error;
  }
});
clearLogsButton.addEventListener('click', async () => {
  try {
    await clearLogs();
  } catch (error) {
    debugError('options.clearLogs failed', error);
    setStatus('Failed to clear logs', 'error');
    throw error;
  }
});

[profileTitleInput, profileSeparatorInput, openingTagInput, closingTagInput].forEach((input) => {
  input.addEventListener('input', updatePreview);
});
