import FirefoxTitleManager from '/src/FirefoxTitleManager.js';

const manager = new FirefoxTitleManager();
let restorePromise = null;
let refreshTimer = null;

function scheduleRestore() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    restoreSession();
  }, 100);
}

async function restoreSession() {
  if (!restorePromise) {
    restorePromise = manager.restoreSession()
      .finally(() => {
        restorePromise = null;
      });
  }

  await restorePromise;
}

// Needs to listen in case the user restores windows by clicking the restore button in the session
// manager window.
// http://kb.mozillazine.org/Browser.sessionstore.max_resumed_crashes
//
// There doesn't seem to be an appropriate event firing after the session is restored so resorting
// to this one instead.
browser.tabs.onCreated.addListener(() => {
  scheduleRestore();
});

browser.windows.onCreated.addListener(() => {
  scheduleRestore();
});

restoreSession();
