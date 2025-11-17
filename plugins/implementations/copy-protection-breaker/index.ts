import type { Plugin } from '../../../types';
import { PluginManager } from '../../../core';

// 전역 상태 관리
let isActive = false;
let cleanupFunctions: (() => void)[] = [];

export const copyProtectionBreakerPlugin: Plugin = {
    // === 메타데이터 ===
    id: 'copy-protection-breaker',
    name: 'Copy Protection Breaker',
    description: '우클릭, 텍스트 선택, 복사 차단을 해제합니다',
    category: "utility",
    version: '1.0.0',
    tier: 'free',

    // 아이콘
    icon: draw,

    // === 설정 스키마 ===
    settings: {
        blockContextMenu: {
            type: 'boolean',
            label: 'Enable Right Click',
            description: '우클릭 차단 해제',
            defaultValue: true,
        },
        blockSelectStart: {
            type: 'boolean',
            label: 'Enable Text Selection',
            description: '텍스트 선택 차단 해제',
            defaultValue: true,
        },
        blockCopy: {
            type: 'boolean',
            label: 'Enable Copy/Cut',
            description: '복사/잘라내기 차단 해제',
            defaultValue: true,
        },
        blockKeyboard: {
            type: 'boolean',
            label: 'Enable F12/DevTools',
            description: 'F12 및 개발자도구 단축키 차단 해제',
            defaultValue: true,
        },
    },

    // === 단축키 ===
    shortcuts: {
        toggle: {
            name: 'Toggle Copy Protection Breaker',
            description: 'Toggle copy protection breaker on/off',
            keys: ['Cmd', 'Shift', 'Y'],
            handler: async (event, ctx) => {
                if (!isActive) {
                    // 활성화
                    console.log('🔓 Copy Protection Breaker activated!');
                    isActive = true;
                    activateProtection(ctx);

                    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
                    showToastModal({
                        status: 'activated',
                        shortcut: isMac ? '⌘⇧C' : 'Ctrl+Shift+C',
                        features: []
                    });
                } else {
                    // 비활성화
                    console.log('🔒 Copy Protection Breaker deactivated!');
                    isActive = false;
                    deactivateProtection();

                    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
                    showToastModal({
                        status: 'deactivated',
                        shortcut: isMac ? '⌘⇧C' : 'Ctrl+Shift+C',
                        features: []
                    });
                }
            },
        }
    },

    // === 실행 설정 ===
    matches: ['<all_urls>'],
    runAt: "document_idle",

    // === 라이프사이클 ===
    onActivate: async (ctx) => {
        console.log('✅ Copy Protection Breaker plugin loaded');
        // 자동으로 활성화하지 않고 단축키로만 토글
        isActive = false;
        cleanupFunctions = [];
    },

    onCleanup: () => {
        console.log('🧹 Copy Protection Breaker plugin cleaned up');
        if (isActive) {
            deactivateProtection();
        }
        isActive = false;
        cleanupFunctions = [];
    }
}

// 보호 활성화 함수
function activateProtection(ctx: any) {
    // 이벤트 차단 해제 함수
    const forceEnable = (e: Event) => {
        e.stopPropagation();
        e.stopImmediatePropagation();
        return true;
    };

    // 이벤트 리스너를 capture phase에 등록
    const events = ['contextmenu', 'selectstart', 'copy', 'cut', 'paste', 'mousedown', 'mouseup', 'keydown', 'keyup', 'dragstart'];
    events.forEach(eventName => {
        document.addEventListener(eventName, forceEnable, true);
        window.addEventListener(eventName, forceEnable, true);
        document.body?.addEventListener(eventName, forceEnable, true);
        document.documentElement?.addEventListener(eventName, forceEnable, true);
    });

    // 모든 요소의 인라인 이벤트 핸들러 제거
    const removeInlineHandlers = (element: HTMLElement) => {
        const handlers = ['ondragstart', 'onselectstart', 'oncontextmenu', 'oncopy', 'oncut', 'onpaste', 'onmousedown', 'onmouseup'];
        handlers.forEach(handler => {
            try {
                if ((element as any)[handler]) {
                    (element as any)[handler] = null;
                }
            } catch (e) {
                // 읽기 전용 속성은 무시
            }
        });
    };

    // 모든 기존 요소 처리
    document.querySelectorAll('*').forEach(el => removeInlineHandlers(el as HTMLElement));
    removeInlineHandlers(document.body);
    removeInlineHandlers(document.documentElement);

    // 동적으로 추가되는 요소 감지
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) {
                    removeInlineHandlers(node as HTMLElement);
                }
            });
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    cleanupFunctions.push(() => observer.disconnect());

    // CSS로 텍스트 선택 강제 활성화
    const style = document.createElement('style');
    style.id = 'copy-protection-breaker-style';
    style.textContent = `
        * {
            user-select: auto !important;
            -webkit-user-select: auto !important;
            -moz-user-select: auto !important;
            -ms-user-select: auto !important;
        }
    `;
    document.head.appendChild(style);

    cleanupFunctions.push(() => {
        const styleElement = document.getElementById('copy-protection-breaker-style');
        styleElement?.remove();
    });

    // 이벤트 리스너 제거 함수 저장
    cleanupFunctions.push(() => {
        events.forEach(eventName => {
            document.removeEventListener(eventName, forceEnable, true);
            window.removeEventListener(eventName, forceEnable, true);
            document.body?.removeEventListener(eventName, forceEnable, true);
            document.documentElement?.removeEventListener(eventName, forceEnable, true);
        });
    });
}

// 보호 비활성화 함수
function deactivateProtection() {
    // 모든 cleanup 함수 실행
    cleanupFunctions.forEach(cleanup => cleanup());
    cleanupFunctions = [];

    // CSS 복원
    if (document.body) {
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
    }
    if (document.documentElement) {
        document.documentElement.style.userSelect = '';
    }
}

function draw(div: HTMLDivElement) {
    div.style.background = 'var(--plugin-copy-protection-breaker, #10b981)';
    div.className = 'plugin-icon';
    div.innerHTML = `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 4V16C8 17.1046 8.89543 18 10 18H18C19.1046 18 20 17.1046 20 16V7.24162C20 6.7034 19.7831 6.18789 19.3982 5.81161L16.1566 2.62007C15.7823 2.25379 15.2723 2.04608 14.7417 2.04608H10C8.89543 2.04608 8 2.94151 8 4.04608Z" stroke="white" stroke-width="2"/>
    <path d="M16 18V20C16 21.1046 15.1046 22 14 22H6C4.89543 22 4 21.1046 4 20V9C4 7.89543 4.89543 7 6 7H8" stroke="white" stroke-width="2"/>
    <path d="M14 2V5C14 6.10457 14.8954 7 16 7H20" stroke="white" stroke-width="2" stroke-linecap="round"/>
    <circle cx="14" cy="11" r="3" stroke="white" stroke-width="2"/>
    <path d="M16 11L15 12L13 10" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;
}


// Toast Modal 표시 함수
interface ToastModalOptions {
    status: 'activated' | 'deactivated';
    shortcut: string;
    features: string[];
}

function showToastModal(options: ToastModalOptions) {
    const { status } = options;

    // 기존 Toast가 있으면 제거
    const existingToast = document.getElementById('cpb-toast-modal');
    if (existingToast) {
        existingToast.remove();
    }

    const isActivated = status === 'activated';

    // Toast Modal 생성 - 깔끔하고 모던한 디자인
    const toast = document.createElement('div');
    toast.id = 'cpb-toast-modal';
    toast.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        background: ${isActivated ? 'rgba(16, 185, 129, 0.95)' : 'rgba(107, 114, 128, 0.95)'};
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        font-size: 14px;
        font-weight: 500;
        z-index: 2147483647;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1);
        animation: cpbSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 280px;
        cursor: pointer;
        transition: transform 0.2s, opacity 0.2s;
    `;

    // 간결한 내용
    toast.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            ${isActivated
                ? '<path d="M8 11V7a4 4 0 0 1 8 0v4M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z"/><path d="M12 17v0"/>'
                : '<path d="M8 11V7a4 4 0 0 1 8 0M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z"/>'
            }
        </svg>
        <div style="flex: 1;">
            <div style="font-weight: 600; margin-bottom: 2px;">
                ${isActivated ? 'Copy Protection Disabled' : 'Copy Protection Enabled'}
            </div>
            <div style="font-size: 12px; opacity: 0.9;">
                ${isActivated ? 'You can now copy and select text' : 'Protection is back on'}
            </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
    `;

    // 애니메이션 스타일 추가
    if (!document.getElementById('cpb-toast-styles')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'cpb-toast-styles';
        styleSheet.textContent = `
            @keyframes cpbSlideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes cpbSlideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(styleSheet);
    }

    document.body.appendChild(toast);

    // 닫기 함수
    const closeToast = () => {
        toast.style.animation = 'cpbSlideOut 0.2s ease-out';
        setTimeout(() => {
            toast.remove();
        }, 200);
    };

    // 호버 효과
    toast.addEventListener('mouseenter', () => {
        toast.style.transform = 'scale(1.02)';
    });
    toast.addEventListener('mouseleave', () => {
        toast.style.transform = 'scale(1)';
    });

    // 클릭하면 닫기
    toast.addEventListener('click', closeToast);

    // 자동 제거 (3초)
    setTimeout(() => {
        if (document.body.contains(toast)) {
            closeToast();
        }
    }, 3000);
}
