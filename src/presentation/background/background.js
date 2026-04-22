import FirefoxTitleManager from '/src/FirefoxTitleManager.js';
import { debugError, debugLog, primeDebugMode } from '/src/debug.js';

const manager = new FirefoxTitleManager();
let restorePromise = null;
let refreshTimer = null;

async function restoreSession() {
  debugLog('restoreSession requested', {
    restoreInFlight: Boolean(restorePromise),
  });

  if (!restorePromise) {
    debugLog('restoreSession started');
    restorePromise = manager.restoreSession()
      .then(() => {
        debugLog('restoreSession completed');
      })
      .catch((error) => {
        debugError('restoreSession failed', error);
        throw error;
      })
      .finally(() => {
        debugLog('restoreSession cleared');
        restorePromise = null;
      });
  }

  await restorePromise;
}

function scheduleRestore() {
  debugLog('scheduleRestore');
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    debugLog('restore timer fired');
    restoreSession();
  }, 100);
}

// Needs to listen in case the user restores windows by clicking the restore button in the session
// manager window.
// http://kb.mozillazine.org/Browser.sessionstore.max_resumed_crashes
//
// There doesn't seem to be an appropriate event firing after the session is restored so resorting
// to this one instead.
browser.tabs.onCreated.addListener((tab) => {
  debugLog('tabs.onCreated', {
    tabId: tab.id,
    windowId: tab.windowId,
    discarded: tab.discarded,
    pendingUrl: tab.pendingUrl,
    url: tab.url,
  });
  scheduleRestore();
});

browser.windows.onCreated.addListener((window) => {
  debugLog('windows.onCreated', {
    windowId: window.id,
    type: window.type,
    incognito: window.incognito,
    focused: window.focused,
  });
  scheduleRestore();
});

browser.windows.onRemoved.addListener((windowId) => {
  debugLog('windows.onRemoved', {
    windowId,
  });
});

browser.runtime.onMessage.addListener((message) => {
  if (message && message.type === 'ftm:debug') {
    debugLog(message.event || 'runtime message', message.details || {});
  }
});

window.addEventListener('error', (event) => {
  debugError('window.error', event.error || new Error(event.message), {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason instanceof Error
    ? event.reason
    : new Error(String(event.reason));
  debugError('window.unhandledrejection', error);
});

primeDebugMode();
debugLog('background initialized');
restoreSession();
