// Полифил для совместимости Firefox и Chrome
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Поиск всех видео элементов на странице
function findVideos() {
    return document.querySelectorAll('video');
}

let currentTargetSpeed = 1.0;

function getStorageKeysForCurrentPage() {
    try {
        const url = new URL(window.location.href);
        return {
            tabKey: `speed_tab_${url.href}`,
            domainKey: `speed_domain_${url.hostname}`,
            allKey: 'speed_all'
        };
    } catch (error) {
        return {
            tabKey: null,
            domainKey: null,
            allKey: 'speed_all'
        };
    }
}

function getStorageKeyForScope(scope) {
    const { tabKey, domainKey } = getStorageKeysForCurrentPage();
    switch (scope) {
        case 'tab':
            return tabKey || 'speed_all';
        case 'domain':
            return domainKey || 'speed_all';
        case 'all':
            return 'speed_all';
        default:
            return tabKey || domainKey || 'speed_all';
    }
}

async function loadSavedSpeedForCurrentPage(callback) {
    try {
        if (!browserAPI || !browserAPI.storage || !browserAPI.storage.local) {
            return;
        }

        const { tabKey, domainKey, allKey } = getStorageKeysForCurrentPage();
        const keys = [];
        if (tabKey) keys.push(tabKey);
        if (domainKey) keys.push(domainKey);
        keys.push(allKey);

        const result = await browserAPI.storage.local.get(keys);

        if (tabKey && typeof result[tabKey] === 'number') {
            callback(result[tabKey], 'tab');
            return;
        }

        if (domainKey && typeof result[domainKey] === 'number') {
            callback(result[domainKey], 'domain');
            return;
        }

        if (typeof result[allKey] === 'number') {
            callback(result[allKey], 'all');
            return;
        }

        callback(undefined, undefined);
    } catch (error) {
        // Игнорируем ошибки storage
    }
}

async function setPlaybackSpeed(speed, scope) {
    
    const video = document.querySelector('video');
    
    if (!video) {
        console.warn('⚠️ Видео не найдено');
        return;
    }

    try {
        video.playbackRate = speed;
    } catch (e) {
        console.error('❌ Ошибка установки скорости:', e);
        return;
    }
    
    currentTargetSpeed = speed;
    try {
        if (browserAPI && browserAPI.storage && browserAPI.storage.local) {
            const { tabKey, domainKey, allKey } = getStorageKeysForCurrentPage();
            const storageKey = getStorageKeyForScope(scope);

            if (storageKey) {
                // Сохраняем скорость для выбранной области
                await browserAPI.storage.local.set({ [storageKey]: speed });

                // Очищаем остальные области, чтобы не было конфликтов при загрузке
                const keysToRemove = [];

                if (storageKey === tabKey) {
                    if (domainKey) keysToRemove.push(domainKey);
                    keysToRemove.push(allKey);
                } else if (storageKey === domainKey) {
                    if (tabKey) keysToRemove.push(tabKey);
                    keysToRemove.push(allKey);
                } else if (storageKey === allKey) {
                    if (tabKey) keysToRemove.push(tabKey);
                    if (domainKey) keysToRemove.push(domainKey);
                }

                if (keysToRemove.length > 0) {
                    await browserAPI.storage.local.remove(keysToRemove);
                }
            }
        }
    } catch (storeError) {
        // Игнорируем ошибки storage
    }
    
    // Отправляем сообщение в background для обновления badge
    // Используем setTimeout чтобы избежать ошибок "Extension context invalidated"
    setTimeout(() => {
        try {
            if (browserAPI && browserAPI.runtime && browserAPI.runtime.sendMessage) {
                browserAPI.runtime.sendMessage({
                    action: 'updateBadge',
                    speed: speed
                }).catch(() => {
                    // Игнорируем ошибки
                });
            }
        } catch (e) {
            // Игнорируем ошибки
        }
    }, 0);
}

// Получение информации о видео
function getVideoInfo() {
    const videos = findVideos();
    if (videos.length === 0) {
        return { playing: false, currentTime: 0, currentSpeed: 1.0 };
    }
    
    const video = videos[0]; // Берем первое видео
    return {
        playing: !video.paused,
        currentTime: video.currentTime,
        currentSpeed: video.playbackRate || 1.0
    };
}

function applyStoredSpeedFromStorage() {
    loadSavedSpeedForCurrentPage((savedSpeed, savedScope) => {
        if (typeof savedSpeed === 'number') {
            waitForVideoToApply(savedSpeed, savedScope);
        }
    });
}

function waitForVideoToApply(speed, scope, attempts = 0) {
    const video = document.querySelector('video');
    if (video) {
        setPlaybackSpeed(speed, scope || 'tab');
        return;
    }

    if (attempts >= 10) {
        return;
    }

    setTimeout(() => waitForVideoToApply(speed, scope, attempts + 1), 350);
}

// Обработка сообщений от popup
try {
    browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
        try {
            if (request.action === 'setSpeed') {
                setPlaybackSpeed(request.speed, request.scope);
                const videoInfo = getVideoInfo();
                // Отправляем сообщение для обновления badge
                try {
                    browserAPI.runtime.sendMessage({
                        action: 'updateBadge',
                        speed: request.speed
                    }).catch(() => {});
                } catch (e) {
                    // Игнорируем ошибки
                }
                sendResponse({ success: true, currentSpeed: videoInfo.currentSpeed });
            } else if (request.action === 'getVideoInfo') {
                sendResponse(getVideoInfo());
            } else if (request.action === 'getCurrentSpeed') {
                const videos = findVideos();
                const currentSpeed = videos.length > 0 ? videos[0].playbackRate : 1.0;
                sendResponse({ currentSpeed: currentSpeed });
            } else if (request.action === 'applySavedSpeed') {
                applyStoredSpeedFromStorage();
                sendResponse({ success: true });
            }
        } catch (error) {
            // Игнорируем ошибки "Extension context invalidated"
            if (error.message && error.message.includes('Extension context invalidated')) {
                return false;
            }
            console.error('Ошибка обработки сообщения:', error);
        }
        
        return true;
    });
} catch (error) {
    // Игнорируем ошибки при установке слушателя
    if (error.message && error.message.includes('Extension context invalidated')) {
        // Расширение было перезагружено, это нормально
    }
}

// Применяем сохранённую скорость при загрузке страницы
applyStoredSpeedFromStorage();
document.addEventListener('DOMContentLoaded', applyStoredSpeedFromStorage);

function watchSpaNavigation() {
    let lastUrl = location.href;

    const handleNavigation = () => {
        const currentUrl = location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            applyStoredSpeedFromStorage();
        }
    };

    const wrapHistoryMethod = (method) => {
        const original = history[method];
        history[method] = function (...args) {
            const returnValue = original.apply(this, args);
            handleNavigation();
            return returnValue;
        };
    };

    wrapHistoryMethod('pushState');
    wrapHistoryMethod('replaceState');

    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('yt-navigate-finish', handleNavigation);
}

watchSpaNavigation();

// Обработка горячих клавиш
let shortcutHandler = null;
let presetsCache = null;
let enabledCache = true;

// Загружаем настройки при загрузке
async function loadShortcutSettings() {
    try {
        if (!browserAPI || !browserAPI.storage || !browserAPI.storage.sync) {
            return;
        }
        
        const result = await browserAPI.storage.sync.get(['presets', 'enabled']);
        if (result) {
            presetsCache = result.presets || [];
            enabledCache = result.enabled !== false;
        }
    } catch (error) {
        // Игнорируем ошибки "Extension context invalidated"
        const errorMsg = error.message || error.toString() || '';
        if (!errorMsg.includes('Extension context invalidated')) {
            console.error('Ошибка загрузки настроек:', error);
        }
    }
}

// Слушаем изменения в storage
try {
    if (browserAPI && browserAPI.storage && browserAPI.storage.onChanged) {
        browserAPI.storage.onChanged.addListener((changes, areaName) => {
            try {
                if (areaName === 'sync') {
                    if (changes.presets) {
                        presetsCache = changes.presets.newValue || [];
                    }
                    if (changes.enabled) {
                        enabledCache = changes.enabled.newValue !== false;
                    }
                }
            } catch (error) {
                // Игнорируем ошибки
            }
        });
    }
} catch (error) {
    // Игнорируем ошибки при установке слушателя
}

function setupShortcutHandler() {
    if (shortcutHandler) {
        document.removeEventListener('keydown', shortcutHandler, true);
    }
    
    shortcutHandler = (e) => {
        // Проверяем, что не в поле ввода
        const target = e.target;
        if (target.tagName === 'INPUT' || 
            target.tagName === 'TEXTAREA' || 
            target.isContentEditable ||
            target.closest('input') ||
            target.closest('textarea')) {
            return;
        }
        
        const keys = [];
        if (e.ctrlKey) keys.push('Ctrl');
        if (e.altKey) keys.push('Alt');
        if (e.shiftKey) keys.push('Shift');
        if (e.metaKey) keys.push('Meta');
        
        if (e.key && !['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
            let key = e.key;
            // Обработка специальных клавиш
            if (key === ' ') key = 'Space';
            else if (key.length === 1) key = key.toUpperCase();
            keys.push(key);
        }
        
        if (keys.length === 0) return;
        
        const shortcut = keys.join('+');
        
        // Используем кэш для быстрой проверки
        if (!enabledCache) return;
        
        const preset = presetsCache.find(p => p.shortcut && p.shortcut === shortcut);
        
        if (preset) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            setPlaybackSpeed(preset.speed / 100, 'tab');
            
            // Уведомляем popup об изменении (если открыт)
            try {
                if (browserAPI && browserAPI.runtime && browserAPI.runtime.sendMessage) {
                    browserAPI.runtime.sendMessage({
                        action: 'speedChanged',
                        speed: preset.speed / 100
                    }).catch(() => {});
                }
            } catch (err) {
                // Игнорируем ошибки
            }
            
            return false;
        }
    };
    
    document.addEventListener('keydown', shortcutHandler, true);
}

// Загружаем настройки и настраиваем обработчик
try {
    loadShortcutSettings();
    
    // Настраиваем обработчик горячих клавиш
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupShortcutHandler);
    } else {
        setupShortcutHandler();
    }
} catch (error) {
    // Игнорируем ошибки при инициализации
    const errorMsg = error.message || error.toString() || '';
    if (!errorMsg.includes('Extension context invalidated')) {
        console.error('Ошибка инициализации:', error);
    }
}

