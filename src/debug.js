import LogStore from '/src/storage/LogStore.js';

/* eslint-disable no-console */
const DEBUG_PREFIX = '[FTM debug]';
const logStore = new LogStore();

let isDevelopmentInstall = null;
let installTypeLookup = null;

async function resolveDevelopmentInstall() {
  if (isDevelopmentInstall !== null) {
    return isDevelopmentInstall;
  }

  if (!installTypeLookup) {
    installTypeLookup = browser.management.getSelf()
      .then(({ installType }) => {
        isDevelopmentInstall = installType === 'development';
        return isDevelopmentInstall;
      })
      .catch(() => {
        isDevelopmentInstall = false;
        return isDevelopmentInstall;
      });
  }

  return installTypeLookup;
}

export function debugLog(event, details = {}) {
  logStore.append('info', event, details);

  if (isDevelopmentInstall === false) {
    return;
  }

  if (isDevelopmentInstall === true) {
    console.log(`${DEBUG_PREFIX} ${event}`, details);
    return;
  }

  resolveDevelopmentInstall().then((enabled) => {
    if (enabled) {
      console.log(`${DEBUG_PREFIX} ${event}`, details);
    }
  });
}

export function debugError(event, error, details = {}) {
  const normalizedDetails = {
    ...details,
    message: error && error.message ? error.message : String(error),
    stack: error && error.stack ? error.stack : null,
  };

  logStore.append('error', event, normalizedDetails);

  if (isDevelopmentInstall === false) {
    return;
  }

  if (isDevelopmentInstall === true) {
    console.error(`${DEBUG_PREFIX} ${event}`, normalizedDetails);
    return;
  }

  resolveDevelopmentInstall().then((enabled) => {
    if (enabled) {
      console.error(`${DEBUG_PREFIX} ${event}`, normalizedDetails);
    }
  });
}

export function primeDebugMode() {
  resolveDevelopmentInstall();
}
