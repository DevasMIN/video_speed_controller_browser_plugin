// YouTube Autoplay Blocker
// Блокирует автоматическое воспроизведение при переключении на вкладку

let isExtensionEnabled = true;
let wasTabVisible = document.visibilityState === 'visible';
const videoStates = new WeakMap(); // Храним состояние каждого видео

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

// Помечаем все видео перед скрытием вкладки
function markPlayingVideos() {
  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    const wasPlaying = !video.paused;
    videoStates.set(video, { wasPlayingBeforeHide: wasPlaying });
    if (wasPlaying) {
      console.log('[YouTube Autoplay Blocker] Запомнили играющее видео');
    }
  });
}

// Останавливаем только автоматически запущенные видео
function pauseAutoplayedVideos() {
  if (!isExtensionEnabled) return;

  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    if (!video.paused) {
      const state = videoStates.get(video);
      // Останавливаем только если видео НЕ играло до скрытия вкладки
      if (!state || !state.wasPlayingBeforeHide) {
        video.pause();
        console.log('[YouTube Autoplay Blocker] Автовоспроизведение заблокировано');
      } else {
        console.log('[YouTube Autoplay Blocker] Видео продолжает играть (играло до скрытия)');
      }
    }
  });
}

// Отслеживаем изменение видимости вкладки
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    // Вкладка скрывается - запоминаем состояние всех видео
    markPlayingVideos();
  } else if (document.visibilityState === 'visible' && !wasTabVisible) {
    // Вкладка стала видимой - даём задержку для проверки автовоспроизведения
    setTimeout(pauseAutoplayedVideos, 100);
    setTimeout(pauseAutoplayedVideos, 300);
    setTimeout(pauseAutoplayedVideos, 500);
  }
  wasTabVisible = document.visibilityState === 'visible';
});

// Обрабатываем добавленные видео элементы
function processVideo(video) {
  // Инициализируем состояние для нового видео
  if (!videoStates.has(video)) {
    videoStates.set(video, { wasPlayingBeforeHide: false });
    
    // Сбрасываем состояние при загрузке нового видео в тот же элемент
    video.addEventListener('loadstart', () => {
      videoStates.set(video, { wasPlayingBeforeHide: false });
      console.log('[YouTube Autoplay Blocker] Сброшено состояние для нового видео');
    });
  }
  
  // Удаляем autoplay атрибут
  if (video.hasAttribute('autoplay')) {
    video.removeAttribute('autoplay');
    console.log('[YouTube Autoplay Blocker] Autoplay атрибут удалён');
  }
}

// MutationObserver для отслеживания новых видео элементов
const observer = new MutationObserver((mutations) => {
  if (!isExtensionEnabled) return;

  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeName === 'VIDEO') {
        processVideo(node);
      } else if (node.querySelectorAll) {
        // Обрабатываем вложенные видео
        node.querySelectorAll('video').forEach(processVideo);
      }
    });
  });
});

// Запускаем observer
observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});

// Обрабатываем существующие видео при загрузке
function processExistingVideos() {
  const videos = document.querySelectorAll('video');
  videos.forEach(processVideo);
}

// Запускаем при загрузке страницы
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', processExistingVideos);
} else {
  processExistingVideos();
}

console.log('[YouTube Autoplay Blocker] Расширение загружено');
