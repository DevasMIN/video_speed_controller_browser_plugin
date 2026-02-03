// YouTube Autoplay Blocker
// Блокирует автоматическое воспроизведение при переключении на вкладку

let isExtensionEnabled = true;
let wasTabVisible = document.visibilityState === 'visible';
let videosPlayingBeforeHide = new Set(); // Храним видео, которые играли до скрытия вкладки

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

// Функция для остановки только автоматически запущенных видео
function pauseAutoplayedVideos() {
  if (!isExtensionEnabled) return;

  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    // Останавливаем только если видео играет И его не было в списке играющих до скрытия вкладки
    if (!video.paused && !videosPlayingBeforeHide.has(video)) {
      video.pause();
      console.log('[YouTube Autoplay Blocker] Автовоспроизведение заблокировано');
    }
  });
  
  // Очищаем список после проверки
  videosPlayingBeforeHide.clear();
}

// Отслеживаем изменение видимости вкладки
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    // Вкладка скрывается - сохраняем какие видео сейчас играют
    videosPlayingBeforeHide.clear();
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      if (!video.paused) {
        videosPlayingBeforeHide.add(video);
        console.log('[YouTube Autoplay Blocker] Запомнили играющее видео');
      }
    });
  } else if (document.visibilityState === 'visible' && !wasTabVisible) {
    // Вкладка стала видимой - даём небольшую задержку и останавливаем только автоматически запущенные видео
    setTimeout(pauseAutoplayedVideos, 100);
    setTimeout(pauseAutoplayedVideos, 300);
    setTimeout(pauseAutoplayedVideos, 500);
  }
  wasTabVisible = document.visibilityState === 'visible';
});

// Перехватываем попытки автоматического воспроизведения
const originalPlay = HTMLMediaElement.prototype.play;
let justBecameVisible = false;
let visibilityTimer = null;

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !wasTabVisible) {
    justBecameVisible = true;
    // Сбрасываем флаг через 1 секунду
    clearTimeout(visibilityTimer);
    visibilityTimer = setTimeout(() => {
      justBecameVisible = false;
    }, 1000);
  }
}, true);

HTMLMediaElement.prototype.play = function() {
  if (!isExtensionEnabled) {
    return originalPlay.apply(this, arguments);
  }

  // Проверяем, было ли вызвано воспроизведение сразу после переключения на вкладку
  // И это видео НЕ было в списке играющих до скрытия
  if (justBecameVisible && !videosPlayingBeforeHide.has(this)) {
    console.log('[YouTube Autoplay Blocker] Play() заблокирован');
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
