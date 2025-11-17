import type { Plugin } from '@/plugins/types';
import { ContentScriptContext } from "wxt/utils/content-script-context";

export const imageSpyPlugin: Plugin = {
    meta: {
        id: 'image-spy',
        name: 'Image Spy',
        description: '페이지의 모든 이미지와 SVG를 쉽게 다운로드',
        drawIcon: draw,
        category: "utility",
        version: '0.0.1',
        author: 'Seungwoo Kim',
        tier: 'free',

        shortcuts: [
            {
                id: 'toggle',
                name: 'Toggle Image Spy',
                description: 'Show or hide image asset panel',
                key: ['Cmd', 'Shift', 'M'],
                enabled: true,
            }
        ],

        settingOptions: [
            {
                id: 'showImages',
                name: 'Show Images',
                description: 'img 태그 표시',
                type: 'boolean',
                defaultValue: true,
            },
            {
                id: 'showSVG',
                name: 'Show SVG',
                description: 'SVG 요소 표시',
                type: 'boolean',
                defaultValue: true,
            },
            {
                id: 'showBackgroundImages',
                name: 'Show Background Images',
                description: 'CSS background-image 표시',
                type: 'boolean',
                defaultValue: true,
            },
            {
                id: 'minSize',
                name: 'Minimum Size (px)',
                description: '최소 이미지 크기 (작은 아이콘 제외)',
                type: 'number',
                defaultValue: 50,
            }
        ]
    },

    defaultSettings: {
        showImages: true,
        showSVG: true,
        showBackgroundImages: true,
        minSize: 50,
    },

    matches: ['<all_urls>'],
    runAt: "document_idle",

    execute: run,

    cleanup: () => {
        console.log('🖼️ Image Spy deactivated!');
        const panel = document.getElementById('image-spy-panel');
        panel?.remove();

        showToast({
            message: 'Image Spy Disabled',
            type: 'info'
        });
    }
}

function draw(div: HTMLDivElement) {
    div.style.background = 'var(--plugin-image-spy, #8b5cf6)';
    div.className = 'plugin-icon';
    div.innerHTML = `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="18" height="18" rx="2" stroke="white" stroke-width="2"/>
    <circle cx="8.5" cy="8.5" r="1.5" fill="white"/>
    <path d="M3 15L8 10L12 14L16 10L21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15Z" fill="white"/>
</svg>
`;
    return div;
}

interface Asset {
    type: 'img' | 'svg' | 'background';
    url: string;
    element: Element;
    width: number;
    height: number;
    filename: string;
}

async function run(ctx: ContentScriptContext) {
    console.log('🖼️ Image Spy activated!');

    showToast({
        message: 'Image Spy Activated',
        type: 'success'
    });

    // 모든 asset 수집
    const assets = collectAssets();

    // 패널 생성
    const panel = createPanel(assets, ctx);
    document.body.appendChild(panel);

    // MutationObserver로 동적으로 추가되는 이미지 감지
    const observer = new MutationObserver(() => {
        const newAssets = collectAssets();
        updatePanel(panel, newAssets);
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    ctx.onInvalidated(() => {
        observer.disconnect();
    });
}

function collectAssets(): Asset[] {
    const assets: Asset[] = [];

    // 1. img 태그 수집
    document.querySelectorAll('img').forEach((img) => {
        if (img.src && img.naturalWidth > 0 && img.naturalHeight > 0) {
            const minSize = 50; // TODO: Get from settings
            if (img.naturalWidth >= minSize || img.naturalHeight >= minSize) {
                assets.push({
                    type: 'img',
                    url: img.src,
                    element: img,
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    filename: getFilenameFromUrl(img.src)
                });
            }
        }
    });

    // 2. SVG 요소 수집
    document.querySelectorAll('svg').forEach((svg) => {
        const rect = svg.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            const minSize = 50;
            if (rect.width >= minSize || rect.height >= minSize) {
                assets.push({
                    type: 'svg',
                    url: svgToDataURL(svg),
                    element: svg,
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                    filename: 'image.svg'
                });
            }
        }
    });

    // 3. Background images 수집
    document.querySelectorAll('*').forEach((el) => {
        const style = window.getComputedStyle(el as HTMLElement);
        const bgImage = style.backgroundImage;

        if (bgImage && bgImage !== 'none' && bgImage.startsWith('url(')) {
            const url = bgImage.slice(5, -2); // url("...") -> ...
            if (url && !url.startsWith('data:')) {
                const rect = el.getBoundingClientRect();
                const minSize = 50;
                if (rect.width >= minSize || rect.height >= minSize) {
                    assets.push({
                        type: 'background',
                        url: url,
                        element: el as HTMLElement,
                        width: Math.round(rect.width),
                        height: Math.round(rect.height),
                        filename: getFilenameFromUrl(url)
                    });
                }
            }
        }
    });

    // 중복 제거 (같은 URL)
    const uniqueAssets = assets.filter((asset, index, self) =>
        index === self.findIndex((a) => a.url === asset.url)
    );

    return uniqueAssets;
}

function svgToDataURL(svg: SVGElement): string {
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
}

function getFilenameFromUrl(url: string): string {
    try {
        const urlObj = new URL(url, window.location.href);
        const pathname = urlObj.pathname;
        const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
        return filename || 'image';
    } catch {
        return 'image';
    }
}

function createPanel(assets: Asset[], ctx: ContentScriptContext): HTMLDivElement {
    const panel = document.createElement('div');
    panel.id = 'image-spy-panel';
    panel.style.cssText = `
        position: fixed;
        top: 0;
        right: 0;
        width: 400px;
        height: 100vh;
        background: rgba(255, 255, 255, 0.98);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        box-shadow: -4px 0 30px rgba(0, 0, 0, 0.1);
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        display: flex;
        flex-direction: column;
        animation: slideInRight 0.3s ease-out;
        color: #1f2937;
    `;

    panel.innerHTML = `
        <style>
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            #image-spy-panel::-webkit-scrollbar {
                width: 8px;
            }
            #image-spy-panel::-webkit-scrollbar-track {
                background: transparent;
            }
            #image-spy-panel::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 4px;
            }
            #image-spy-panel::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
            }
        </style>

        <!-- Header -->
        <div style="
            padding: 20px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            color: white;
        ">
            <div>
                <h2 style="margin: 0; font-size: 18px; font-weight: 700;">Image Spy</h2>
                <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">
                    ${assets.length} assets found
                </p>
            </div>
            <button id="image-spy-close" style="
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 8px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                transition: background 0.2s;
            ">×</button>
        </div>

        <!-- Asset List -->
        <div id="image-spy-list" style="
            flex: 1;
            overflow-y: auto;
            padding: 16px;
        ">
            ${assets.map((asset, index) => createAssetCard(asset, index)).join('')}
        </div>

        <!-- Footer -->
        <div style="
            padding: 16px;
            border-top: 1px solid #e5e7eb;
            background: #f9fafb;
            text-align: center;
        ">
            <button id="image-spy-download-all" style="
                background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: transform 0.2s;
                width: 100%;
            ">
                Download All (${assets.length})
            </button>
        </div>
    `;

    // Close button
    const closeBtn = panel.querySelector('#image-spy-close');
    closeBtn?.addEventListener('click', () => {
        panel.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => panel.remove(), 300);
    });

    // Download all button
    const downloadAllBtn = panel.querySelector('#image-spy-download-all');
    downloadAllBtn?.addEventListener('click', () => {
        assets.forEach((asset, index) => {
            setTimeout(() => downloadAsset(asset), index * 100);
        });
    });

    // Individual download buttons
    assets.forEach((asset, index) => {
        const downloadBtn = panel.querySelector(`#download-${index}`);
        downloadBtn?.addEventListener('click', () => downloadAsset(asset));
    });

    // Hover effects
    const hoverBtn = panel.querySelector('#image-spy-close') as HTMLElement;
    hoverBtn?.addEventListener('mouseenter', () => {
        hoverBtn.style.background = 'rgba(255, 255, 255, 0.3)';
    });
    hoverBtn?.addEventListener('mouseleave', () => {
        hoverBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    });

    const downloadAllBtnEl = panel.querySelector('#image-spy-download-all') as HTMLElement;
    downloadAllBtnEl?.addEventListener('mouseenter', () => {
        downloadAllBtnEl.style.transform = 'scale(1.02)';
    });
    downloadAllBtnEl?.addEventListener('mouseleave', () => {
        downloadAllBtnEl.style.transform = 'scale(1)';
    });

    return panel;
}

function createAssetCard(asset: Asset, index: number): string {
    const typeIcon = asset.type === 'img' ? '🖼️' : asset.type === 'svg' ? '📐' : '🎨';

    return `
        <div style="
            background: white;
            border-radius: 12px;
            padding: 12px;
            margin-bottom: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
            transition: transform 0.2s, box-shadow 0.2s;
            cursor: pointer;
        " onmouseenter="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0, 0, 0, 0.1)'" onmouseleave="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0, 0, 0, 0.05)'">
            <div style="display: flex; gap: 12px; align-items: center;">
                <!-- Thumbnail -->
                <div style="
                    width: 80px;
                    height: 80px;
                    border-radius: 8px;
                    overflow: hidden;
                    background: #f3f4f6;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                ">
                    ${asset.type === 'svg'
                        ? `<img src="${asset.url}" style="width: 100%; height: 100%; object-fit: contain;" />`
                        : `<img src="${asset.url}" style="width: 100%; height: 100%; object-fit: cover;" />`
                    }
                </div>

                <!-- Info -->
                <div style="flex: 1; min-width: 0;">
                    <div style="
                        font-size: 12px;
                        color: #6b7280;
                        margin-bottom: 4px;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                    ">
                        <span>${typeIcon}</span>
                        <span style="text-transform: uppercase; font-weight: 600;">${asset.type}</span>
                    </div>
                    <div style="
                        font-size: 13px;
                        font-weight: 600;
                        color: #1f2937;
                        margin-bottom: 4px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    ">${asset.filename}</div>
                    <div style="
                        font-size: 12px;
                        color: #9ca3af;
                    ">${asset.width} × ${asset.height}px</div>
                </div>

                <!-- Download Button -->
                <button id="download-${index}" style="
                    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                    border: none;
                    color: white;
                    width: 36px;
                    height: 36px;
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.2s;
                    flex-shrink: 0;
                " onmouseenter="this.style.transform='scale(1.1)'" onmouseleave="this.style.transform='scale(1)'">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                </button>
            </div>
        </div>
    `;
}

function updatePanel(panel: HTMLDivElement, assets: Asset[]) {
    const list = panel.querySelector('#image-spy-list');
    const header = panel.querySelector('h2 + p');

    if (list) {
        list.innerHTML = assets.map((asset, index) => createAssetCard(asset, index)).join('');

        // Re-attach event listeners
        assets.forEach((asset, index) => {
            const downloadBtn = panel.querySelector(`#download-${index}`);
            downloadBtn?.addEventListener('click', () => downloadAsset(asset));
        });
    }

    if (header) {
        header.textContent = `${assets.length} assets found`;
    }
}

function downloadAsset(asset: Asset) {
    const link = document.createElement('a');
    link.href = asset.url;
    link.download = asset.filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast({
        message: `Downloading ${asset.filename}`,
        type: 'success'
    });
}

// Toast notification
interface ToastOptions {
    message: string;
    type: 'success' | 'error' | 'info';
}

function showToast(options: ToastOptions) {
    const existingToast = document.getElementById('image-spy-toast');
    if (existingToast) {
        existingToast.remove();
    }

    const colors = {
        success: 'rgba(16, 185, 129, 0.95)',
        error: 'rgba(239, 68, 68, 0.95)',
        info: 'rgba(107, 114, 128, 0.95)'
    };

    const toast = document.createElement('div');
    toast.id = 'image-spy-toast';
    toast.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        background: ${colors[options.type]};
        backdrop-filter: blur(12px);
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        font-size: 14px;
        font-weight: 500;
        z-index: 2147483648;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        animation: slideInRight 0.3s ease-out;
        cursor: pointer;
    `;

    toast.textContent = options.message;
    toast.addEventListener('click', () => {
        toast.style.animation = 'slideOutRight 0.2s ease-out';
        setTimeout(() => toast.remove(), 200);
    });

    document.body.appendChild(toast);

    setTimeout(() => {
        if (document.body.contains(toast)) {
            toast.style.animation = 'slideOutRight 0.2s ease-out';
            setTimeout(() => toast.remove(), 200);
        }
    }, 3000);
}
