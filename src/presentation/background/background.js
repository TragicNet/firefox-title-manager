import WindowTitler from '/src/WindowTitler.js';

const windowTitler = new WindowTitler();
let pendingRefreshTimeoutId = null;

function scheduleWindowRefresh() {
  if (pendingRefreshTimeoutId !== null) {
    clearTimeout(pendingRefreshTimeoutId);
  }

  pendingRefreshTimeoutId = setTimeout(async () => {
    pendingRefreshTimeoutId = null;
    await windowTitler.refreshPresentationForAllWindows();
  }, 100);
}

// Needs to listen in case the user restores windows by clicking the restore button in the session
// manager window.
// http://kb.mozillazine.org/Browser.sessionstore.max_resumed_crashes
//
// There doesn't seem to be an appropriate event firing after the session is restored so resorting
// to this one instead.
browser.tabs.onCreated.addListener(() => {
  scheduleWindowRefresh();
});

// Needs to run if the session is restored automatically, without the session manager window.
scheduleWindowRefresh();
