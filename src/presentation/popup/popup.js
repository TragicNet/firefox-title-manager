import FirefoxTitleManager from '/src/FirefoxTitleManager.js';

const manager = new FirefoxTitleManager();
const form = document.querySelector('#window-titler-form');
const titleInput = document.querySelector('#user-window-title-input');
const settingsButton = document.querySelector('#btn-settings');

async function getCurrentWindowId() {
  const currentWindow = await browser.windows.getCurrent();
  return currentWindow.id;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  await manager.saveWindowTitle(await getCurrentWindowId(), titleInput.value);
  window.close();
});

window.addEventListener('load', async () => {
  titleInput.value = await manager.getWindowTitle(await getCurrentWindowId());
  titleInput.select();
});

settingsButton.addEventListener('click', () => browser.runtime.openOptionsPage());
