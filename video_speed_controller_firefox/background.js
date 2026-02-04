// Полифил для совместимости Firefox и Chrome
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Service worker для фоновых задач
browserAPI.runtime.onInstalled.addListener(() => {});

// Обработка команд с клавиатуры (если нужно)
if (browserAPI.commands) {
    browserAPI.commands.onCommand.addListener(() => {});
}

// Обновление badge на иконке расширения (стандартный Firefox badge)
async function updateBadge(speed) {
    try {
        if (!browserAPI.browserAction) return;
        
        const speedText = speed === 1.0 ? '' : speed.toFixed(1);
        await browserAPI.browserAction.setBadgeText({ text: speedText });
        await browserAPI.browserAction.setBadgeBackgroundColor({ color: '#2196F3' });
        
        if (browserAPI.browserAction.setBadgeTextColor) {
            await browserAPI.browserAction.setBadgeTextColor({ color: '#000000' });
        }
    } catch (e) {
        // Игнорируем ошибки badge
    }
}

// Обработка сообщений от content script и popup
browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        if (request.action === 'updateBadge') {
            updateBadge(request.speed);
            sendResponse({ success: true });
        }
    } catch (error) {
        // Игнорируем ошибки
    }
    return true;
});

browserAPI.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'complete') {
        browserAPI.tabs.sendMessage(tabId, { action: 'applySavedSpeed' })
            .catch(() => {
                // Контентный скрипт ещё не готов, пропускаем
            });
    }
});
