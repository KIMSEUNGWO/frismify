import type { Plugin } from '@/plugins/types';
import {ContentScriptContext} from "wxt/utils/content-script-context";


export const cssSpyPlugin: Plugin = {
    meta: {
        id: 'css-spy',
        name: 'CSS SPY',
        description: 'Inspect element styles',
        drawIcon: draw,
        category: "inspector",
        version: '0.0.1',
        author: 'Seungwoo Kim',

        shortcut: {
            windows: 'Ctrl+Shift+L',
            mac: 'Command+Shift+L',
            description: 'CSS Spy 토글',
        },
    },

    defaultSettings: {
        showPosition: true,
        showColors: true,
        showDimensions: true,
        tooltipOpacity: 0.9,
    },

    matches: ['<all_urls>'],
    runAt: "document_idle",

    execute: run,

    cleanup: () => {
        console.log('🔍 CSS Spy deactivated!');

        const tooltip = document.getElementById('css-spy-tooltip');
        tooltip?.remove();

        const highlight = document.getElementById('css-spy-highlight');
        highlight?.remove();
    }

}

function draw(div: HTMLDivElement) {
    div.style.background = 'var(--plugin-css-spy)';
    div.className = 'plugin-icon';
    div.innerHTML = `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3C15.8995 3 18.8955 5.22679 20.8545 7.31641C21.8429 8.37071 22.5978 9.42095 23.1055 10.207C23.3599 10.601 23.5537 10.9317 23.6855 11.166C23.7514 11.2831 23.8021 11.3767 23.8369 11.4424C23.8543 11.4752 23.8684 11.501 23.8779 11.5195C23.8826 11.5287 23.8859 11.5365 23.8887 11.542C23.8901 11.5447 23.8917 11.547 23.8926 11.5488L23.8936 11.5508L23.8945 11.5518C23.8945 11.5518 23.8944 11.5528 23 12C23.8944 12.4472 23.8945 12.4482 23.8945 12.4482L23.8936 12.4492L23.8926 12.4512C23.8917 12.453 23.8901 12.4553 23.8887 12.458C23.8859 12.4635 23.8826 12.4713 23.8779 12.4805C23.8684 12.499 23.8543 12.5248 23.8369 12.5576C23.8021 12.6233 23.7514 12.7169 23.6855 12.834C23.5537 13.0683 23.3599 13.399 23.1055 13.793C22.5978 14.579 21.8429 15.6293 20.8545 16.6836C18.8955 18.7732 15.8995 21 12 21C8.10049 21 5.10453 18.7732 3.14551 16.6836C2.15712 15.6293 1.40223 14.579 0.894531 13.793C0.640113 13.399 0.446272 13.0683 0.314453 12.834C0.248565 12.7169 0.19787 12.6233 0.163086 12.5576C0.145728 12.5248 0.131604 12.499 0.12207 12.4805C0.117351 12.4713 0.114114 12.4635 0.111328 12.458C0.109931 12.4553 0.108325 12.453 0.107422 12.4512L0.106445 12.4492L0.105469 12.4482C0.105469 12.4482 0.105573 12.4472 1 12C0.105573 11.5528 0.105469 11.5518 0.105469 11.5518L0.106445 11.5508L0.107422 11.5488C0.108325 11.547 0.109931 11.5447 0.111328 11.542C0.114114 11.5365 0.117351 11.5287 0.12207 11.5195C0.131604 11.501 0.145728 11.4752 0.163086 11.4424C0.19787 11.3767 0.248565 11.2831 0.314453 11.166C0.446272 10.9317 0.640113 10.601 0.894531 10.207C1.40223 9.42095 2.15712 8.37071 3.14551 7.31641C5.10453 5.22679 8.10049 3 12 3ZM12 5C8.8996 5 6.39546 6.77327 4.60449 8.68359C3.71812 9.62906 3.03524 10.5791 2.57422 11.293C2.39497 11.5705 2.25081 11.8113 2.1416 12C2.25081 12.1887 2.39497 12.4295 2.57422 12.707C3.03524 13.4209 3.71812 14.3709 4.60449 15.3164C6.39546 17.2267 8.8996 19 12 19C15.1004 19 17.6045 17.2267 19.3955 15.3164C20.2819 14.3709 20.9648 13.4209 21.4258 12.707C21.6049 12.4297 21.7482 12.1887 21.8574 12C21.7482 11.8113 21.6049 11.5703 21.4258 11.293C20.9648 10.5791 20.2819 9.62906 19.3955 8.68359C17.6045 6.77327 15.1004 5 12 5ZM1 12L0.105469 12.4482L-0.118164 12L0.105469 11.5518L1 12ZM24.1182 12L23.8945 12.4482L23 12L23.8945 11.5518L24.1182 12Z" fill="white"/>
    <path d="M14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14C13.1046 14 14 13.1046 14 12ZM16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12Z" fill="white"/>
</svg>
`;
    return div;
}

async function run(ctx: ContentScriptContext) {
    console.log('🔍 CSS Spy activated!');

    let tooltip: HTMLDivElement | null = null;
    let isActive = true;

    // 툴팁 생성
    const createTooltip = () => {
        tooltip = document.createElement('div');
        tooltip.id = 'css-spy-tooltip';
        tooltip.style.cssText = `
        position: fixed;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 12px;
        z-index: 2147483647;
        pointer-events: none;
        display: none;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        max-width: 300px;
        line-height: 1.5;
      `;
        document.body.appendChild(tooltip);
    };

    // 요소 하이라이트
    let highlightOverlay: HTMLDivElement | null = null;
    const createHighlight = () => {
        highlightOverlay = document.createElement('div');
        highlightOverlay.id = 'css-spy-highlight';
        highlightOverlay.style.cssText = `
        position: absolute;
        border: 2px solid #3b82f6;
        background: rgba(59, 130, 246, 0.1);
        pointer-events: none;
        z-index: 2147483646;
        display: none;
      `;
        document.body.appendChild(highlightOverlay);
    };

    const updateHighlight = (element: HTMLElement) => {
        if (!highlightOverlay) return;

        const rect = element.getBoundingClientRect();
        highlightOverlay.style.display = 'block';
        highlightOverlay.style.left = `${rect.left + window.scrollX}px`;
        highlightOverlay.style.top = `${rect.top + window.scrollY}px`;
        highlightOverlay.style.width = `${rect.width}px`;
        highlightOverlay.style.height = `${rect.height}px`;
    };

    const handleMouseOver = (e: MouseEvent) => {
        if (!isActive || !tooltip) return;

        const target = e.target as HTMLElement;
        if (target.id === 'css-spy-tooltip' || target.id === 'css-spy-highlight') return;

        const styles = window.getComputedStyle(target);
        const rect = target.getBoundingClientRect();

        // 태그 이름과 클래스
        const tagName = target.tagName.toLowerCase();
        const className = target.className ? `.${target.className.split(' ').join('.')}` : '';
        const selector = `${tagName}${className}`;

        tooltip.innerHTML = `
        <div style="color: #60a5fa; font-weight: bold; margin-bottom: 8px;">
          ${selector}
        </div>
        <div style="display: grid; grid-template-columns: 100px 1fr; gap: 4px;">
          <span style="color: #9ca3af;">Size:</span>
          <span>${Math.round(rect.width)}×${Math.round(rect.height)}px</span>
          
          <span style="color: #9ca3af;">Position:</span>
          <span>x:${Math.round(rect.left)}, y:${Math.round(rect.top)}</span>
          
          <span style="color: #9ca3af;">Color:</span>
          <span>${styles.color}</span>
          
          <span style="color: #9ca3af;">Background:</span>
          <span>${styles.backgroundColor}</span>
          
          <span style="color: #9ca3af;">Font:</span>
          <span>${styles.fontSize} ${styles.fontWeight}</span>
          
          <span style="color: #9ca3af;">Padding:</span>
          <span>${styles.padding}</span>
          
          <span style="color: #9ca3af;">Margin:</span>
          <span>${styles.margin}</span>
        </div>
      `;

        tooltip.style.display = 'block';

        // 툴팁 위치 조정 (화면 밖으로 나가지 않도록)
        const tooltipRect = tooltip.getBoundingClientRect();
        let left = e.clientX + 15;
        let top = e.clientY + 15;

        if (left + tooltipRect.width > window.innerWidth) {
            left = e.clientX - tooltipRect.width - 15;
        }
        if (top + tooltipRect.height > window.innerHeight) {
            top = e.clientY - tooltipRect.height - 15;
        }

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;

        updateHighlight(target);
    };

    const handleMouseOut = () => {
        if (tooltip) {
            tooltip.style.display = 'none';
        }
        if (highlightOverlay) {
            highlightOverlay.style.display = 'none';
        }
    };

    // ESC 키로 일시 중지/재개
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            isActive = !isActive;
            if (!isActive) {
                handleMouseOut();
            }
            console.log(`🔍 CSS Spy ${isActive ? 'resumed' : 'paused'}`);
        }
    };

    createTooltip();
    createHighlight();
    ctx.addEventListener(document, 'mouseover', handleMouseOver);
    ctx.addEventListener(document, 'mouseout', handleMouseOut);
    ctx.addEventListener(document, 'keydown', handleKeyDown);
}