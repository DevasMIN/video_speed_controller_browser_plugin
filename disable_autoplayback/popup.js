// Popup script для управления настройками расширения

const enableToggle = document.getElementById('enableToggle');
const statusText = document.getElementById('statusText');

// Функция для применения переводов
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const message = chrome.i18n.getMessage(key);
    if (message) {
      element.textContent = message;
    }
  });
}

// Применяем переводы при загрузке
applyI18n();

// Загружаем текущее состояние
chrome.storage.local.get(['enabled'], (result) => {
  const isEnabled = result.enabled !== false; // По умолчанию включено
  enableToggle.checked = isEnabled;
  updateStatusText(isEnabled);
});

// Обработчик переключателя
enableToggle.addEventListener('change', (e) => {
  const isEnabled = e.target.checked;
  chrome.storage.local.set({ enabled: isEnabled }, () => {
    updateStatusText(isEnabled);
    const message = isEnabled 
      ? chrome.i18n.getMessage('notificationEnabled') 
      : chrome.i18n.getMessage('notificationDisabled');
    showNotification(message);
  });
});

// Обновление текста статуса
function updateStatusText(isEnabled) {
  const key = isEnabled ? 'statusEnabled' : 'statusDisabled';
  statusText.textContent = chrome.i18n.getMessage(key);
  statusText.style.color = isEnabled ? '#4CAF50' : '#ff6b6b';
}

// Показать уведомление
function showNotification(message) {
  // Создаем временное уведомление
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

// Добавляем стили для анимации
const style = document.createElement('style');
style.textContent = `
  @keyframes slideDown {
    from {
      transform: translateX(-50%) translateY(-20px);
      opacity: 0;
    }
    to {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
  }
  
  @keyframes slideUp {
    from {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
    to {
      transform: translateX(-50%) translateY(-20px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
