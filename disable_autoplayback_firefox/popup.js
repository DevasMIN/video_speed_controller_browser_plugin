// Popup script для управления настройками расширения

const enableToggle = document.getElementById('enableToggle');
const statusText = document.getElementById('statusText');
const langButtons = document.querySelectorAll('.lang-btn');

let currentMessages = null; // null = use chrome.i18n

// Загрузить переводы из _locales/{locale}/messages.json
async function loadLocale(locale) {
  try {
    const url = chrome.runtime.getURL(`_locales/${locale}/messages.json`);
    const res = await fetch(url);
    const json = await res.json();
    const messages = {};
    for (const [key, obj] of Object.entries(json)) {
      if (obj && obj.message) messages[key] = obj.message;
    }
    return messages;
  } catch (e) {
    return null;
  }
}

// Применить переводы (из messages или chrome.i18n)
function applyI18n(messages = null) {
  currentMessages = messages;
  const getMsg = (key) => {
    if (messages && messages[key]) return messages[key];
    return chrome.i18n.getMessage(key) || '';
  };

  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const text = getMsg(key);
    if (text) element.textContent = text;
  });

  document.querySelectorAll('[data-i18n-title]').forEach(element => {
    const key = element.getAttribute('data-i18n-title');
    const text = getMsg(key);
    if (text) element.title = text;
  });

  updateStatusText(enableToggle.checked);
  setActiveLangButton();
}

function setActiveLangButton() {
  chrome.storage.local.get(['preferredLocale'], (result) => {
    const locale = result.preferredLocale || 'ru';
    langButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === locale);
    });
  });
}

// Инициализация: загрузить выбранный язык и применить
async function initI18n() {
  const result = await new Promise((resolve) => {
    chrome.storage.local.get(['preferredLocale'], resolve);
  });
  const locale = result.preferredLocale || 'ru';
  const messages = await loadLocale(locale);
  applyI18n(messages);
}

// Обработчики переключателя языка
langButtons.forEach((btn) => {
  btn.addEventListener('click', async () => {
    const lang = btn.getAttribute('data-lang');
    await new Promise((resolve) => {
      chrome.storage.local.set({ preferredLocale: lang }, resolve);
    });
    const messages = await loadLocale(lang);
    applyI18n(messages);
  });
});

// Загружаем переводы при открытии popup
initI18n();

// Загружаем текущее состояние расширения
chrome.storage.local.get(['enabled'], (result) => {
  const isEnabled = result.enabled !== false;
  enableToggle.checked = isEnabled;
  updateStatusText(isEnabled);
});

enableToggle.addEventListener('change', (e) => {
  const isEnabled = e.target.checked;
  chrome.storage.local.set({ enabled: isEnabled }, () => {
    updateStatusText(isEnabled);
    const key = isEnabled ? 'notificationEnabled' : 'notificationDisabled';
    const message = currentMessages ? currentMessages[key] : chrome.i18n.getMessage(key);
    showNotification(message);
  });
});

function updateStatusText(isEnabled) {
  const key = isEnabled ? 'statusEnabled' : 'statusDisabled';
  const text = currentMessages ? currentMessages[key] : chrome.i18n.getMessage(key);
  if (statusText) {
    statusText.textContent = text;
    statusText.style.color = isEnabled ? '#b9f6ca' : '#ffcdd2';
    statusText.style.textShadow = '0 1px 2px rgba(0,0,0,0.6)';
  }
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 12px;
    z-index: 1000;
    animation: slideDown 0.3s ease-out;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.animation = 'slideUp 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

const style = document.createElement('style');
style.textContent = `
  @keyframes slideDown {
    from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
    to { transform: translateX(-50%) translateY(0); opacity: 1; }
  }
  @keyframes slideUp {
    from { transform: translateX(-50%) translateY(0); opacity: 1; }
    to { transform: translateX(-50%) translateY(-20px); opacity: 0; }
  }
`;
document.head.appendChild(style);
