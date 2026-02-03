// Popup script для управления настройками расширения

const enableToggle = document.getElementById('enableToggle');
const statusText = document.getElementById('statusText');
const resetBtn = document.getElementById('resetBtn');

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
    showNotification(isEnabled ? 'Расширение включено' : 'Расширение выключено');
  });
});

// Обработчик кнопки сброса
resetBtn.addEventListener('click', () => {
  chrome.storage.local.clear(() => {
    enableToggle.checked = true;
    updateStatusText(true);
    showNotification('Настройки сброшены');
  });
});

// Обновление текста статуса
function updateStatusText(isEnabled) {
  statusText.textContent = isEnabled ? 'Включено' : 'Выключено';
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
