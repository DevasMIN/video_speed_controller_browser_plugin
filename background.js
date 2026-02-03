// Service worker для фоновых задач
chrome.runtime.onInstalled.addListener(() => {});

// Обработка команд с клавиатуры (если нужно)
chrome.commands.onCommand.addListener(() => {});

// Обновление badge на иконке расширения
async function updateBadge(speed) {
    try {
        if (chrome && chrome.action && chrome.action.setBadgeText) {
            const speedText = speed === 1.0 ? '' : speed.toFixed(2);
            await chrome.action.setBadgeText({ text: speedText });
            await chrome.action.setBadgeBackgroundColor({ color: '#2196F3' });
        }
    } catch (e) {
        // Игнорируем ошибки badge
    }
}

// Обработка сообщений от content script и popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'complete') {
        chrome.tabs.sendMessage(tabId, { action: 'applySavedSpeed' }, () => {
            if (chrome.runtime.lastError) {
                // Контентный скрипт ещё не готов, пропускаем
            }
        });
    }
});
