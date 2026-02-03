// YouTube Autoplay Blocker
// Блокирует автоматическое воспроизведение при переключении на вкладку

let isExtensionEnabled = true;
let wasTabVisible = document.visibilityState === 'visible';

// Загружаем настройки
chrome.storage.local.get(['enabled'], (result) => {
  isExtensionEnabled = result.enabled !== false; // По умолчанию включено
});

// Слушаем изменения настроек
chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) {
    isExtensionEnabled = changes.enabled.newValue;
  }
});

// Функция для остановки всех видео на странице
function pauseAllVideos() {
  if (!isExtensionEnabled) return;

  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    if (!video.paused) {
      video.pause();
      console.log('[YouTube Autoplay Blocker] Видео остановлено');
    }
  });
}

// Отслеживаем изменение видимости вкладки
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !wasTabVisible) {
    // Вкладка стала видимой - даём небольшую задержку и останавливаем видео
    setTimeout(pauseAllVideos, 100);
    setTimeout(pauseAllVideos, 300);
    setTimeout(pauseAllVideos, 500);
  }
  wasTabVisible = document.visibilityState === 'visible';
});

// Перехватываем попытки автоматического воспроизведения
const originalPlay = HTMLMediaElement.prototype.play;
HTMLMediaElement.prototype.play = function() {
  if (!isExtensionEnabled) {
    return originalPlay.apply(this, arguments);
  }

  // Проверяем, было ли вызвано воспроизведение при переключении на вкладку
  if (document.visibilityState === 'visible' && !wasTabVisible) {
    console.log('[YouTube Autoplay Blocker] Автовоспроизведение заблокировано');
    return Promise.resolve();
  }

  return originalPlay.apply(this, arguments);
};

// MutationObserver для отслеживания новых видео элементов
const observer = new MutationObserver((mutations) => {
  if (!isExtensionEnabled) return;

  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeName === 'VIDEO') {
        // Блокируем autoplay атрибут
        if (node.hasAttribute('autoplay')) {
          node.removeAttribute('autoplay');
          console.log('[YouTube Autoplay Blocker] Autoplay атрибут удалён');
        }

        // Слушаем событие play
        node.addEventListener('play', (e) => {
          if (document.visibilityState === 'visible' && !wasTabVisible) {
            e.target.pause();
            console.log('[YouTube Autoplay Blocker] Play событие заблокировано');
          }
        }, { once: true });
      }
    });
  });
});

// Запускаем observer
observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});

// Обрабатываем существующие видео
function processExistingVideos() {
  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    if (video.hasAttribute('autoplay')) {
      video.removeAttribute('autoplay');
    }
  });
}

// Запускаем при загрузке страницы
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', processExistingVideos);
} else {
  processExistingVideos();
}

console.log('[YouTube Autoplay Blocker] Расширение загружено');
