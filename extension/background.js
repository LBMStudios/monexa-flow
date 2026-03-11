chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openDashboard') {
        const url = chrome.runtime.getURL('analytics/dashboard.html');
        chrome.tabs.create({ url });
    } else if (request.action === 'focusItauTab') {
        chrome.tabs.query({}, (tabs) => {
            const itauTabs = tabs.filter(t => t.url && (t.url.includes('itau.com.uy') || t.url.includes('itaulink.com.uy')));
            if (itauTabs.length > 0) {
                chrome.tabs.update(itauTabs[0].id, { active: true });
                chrome.windows.update(itauTabs[0].windowId, { focused: true });
            } else {
                console.warn("[Monexa] No se encontró ninguna pestaña de Itaú abierta.");
            }
        });
    }
});
