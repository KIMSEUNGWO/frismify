import {browser} from "wxt/browser";


export const openSettings = (tab? : 'dashboard' | 'tools' | 'shortcuts') => {
    if (!tab) {
        browser.runtime.openOptionsPage();
    } else {
        const optionsUrl = browser.runtime.getURL(`/options.html#/${tab}`);
        browser.tabs.create({ url: optionsUrl });
    }
};