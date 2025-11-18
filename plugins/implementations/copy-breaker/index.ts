import type { Plugin } from '../../../types';

// 전역 상태 관리
let cleanupFunctions: (() => void)[] = [];

export const copyProtectionBreakerPlugin: Plugin = {
    // === 메타데이터 ===
    id: 'copy-breaker',
    name: 'Copy Breaker',
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

    // === 실행 설정 ===
    matches: ['<all_urls>'],
    runAt: "document_idle",

    // === 플러그인 실행 (토글) ===
    onExecute: {
        execute: async (ctx) => {
            // 활성화
            console.log('🔓 Copy Protection Breaker activated!');
            activateProtection(ctx);

            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            showToastModal({
                status: 'activated',
                shortcut: isMac ? '⌘⇧Y' : 'Ctrl+Shift+Y',
                features: []
            });
        },
        shortcut: ['Cmd', 'Shift', 'Y'],
    },

    // === 라이프사이클 ===
    onActivate: async (ctx) => {
        console.log('✅ Copy Protection Breaker plugin loaded');
        cleanupFunctions = [];
    },

    onCleanup: () => {
        console.log('🧹 Copy Protection Breaker plugin cleaned up');
        deactivateProtection();
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
    style.id = 'copy-breaker-style';
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
        const styleElement = document.getElementById('copy-breaker-style');
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
    div.style.background = 'var(--plugin-copy-breaker)';
    div.className += ' plugin-icon';
    div.innerHTML = `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M2 3.5C2 2.67157 2.67157 2 3.5 2H20.5C21.3284 2 22 2.67157 22 3.5V5H2V3.5Z" fill="white"/>
<path d="M5.5 3.75C5.5 4.16421 5.16421 4.5 4.75 4.5C4.33579 4.5 4 4.16421 4 3.75C4 3.33579 4.33579 3 4.75 3C5.16421 3 5.5 3.33579 5.5 3.75Z" fill="#EC484B"/>
<path d="M8 3.75C8 4.16421 7.66421 4.5 7.25 4.5C6.83579 4.5 6.5 4.16421 6.5 3.75C6.5 3.33579 6.83579 3 7.25 3C7.66421 3 8 3.33579 8 3.75Z" fill="#FB923C"/>
<path d="M10.5 3.75C10.5 4.16421 10.1642 4.5 9.75 4.5C9.33579 4.5 9 4.16421 9 3.75C9 3.33579 9.33579 3 9.75 3C10.1642 3 10.5 3.33579 10.5 3.75Z" fill="#22C55E"/>
<path d="M22 20C22 21.1046 21.1046 22 20 22H4C2.89543 22 2 21.1046 2 20V5H22V20ZM4.5 6.59375C3.94772 6.59375 3.5 7.04147 3.5 7.59375V19.4062C3.5 19.9585 3.94772 20.4062 4.5 20.4062H19.5C20.0523 20.4062 20.5 19.9585 20.5 19.4062V7.59375C20.5 7.04147 20.0523 6.59375 19.5 6.59375H4.5ZM12 9.33301C12.4545 9.33301 12.8821 9.45469 13.25 9.66797C13.2996 9.69394 13.3434 9.73012 13.3789 9.77344C13.4145 9.81694 13.4414 9.8679 13.457 9.92188C13.4726 9.97573 13.4775 10.0322 13.4707 10.0879C13.4639 10.1436 13.446 10.1975 13.418 10.2461C13.3898 10.2947 13.3516 10.3374 13.3066 10.3711C13.2618 10.4047 13.2107 10.429 13.1562 10.4424C13.1017 10.4558 13.0447 10.4574 12.9893 10.4482C12.9338 10.4391 12.8804 10.4198 12.833 10.3896C12.5797 10.2434 12.2925 10.166 12 10.166C11.7074 10.1661 11.4194 10.2433 11.166 10.3896C10.9128 10.536 10.7028 10.7466 10.5566 11C10.4105 11.2534 10.3329 11.5405 10.333 11.833L14.917 11.834C15.1379 11.8341 15.3497 11.9219 15.5059 12.0781C15.662 12.2344 15.75 12.4461 15.75 12.667V16.834C15.7499 17.0549 15.6621 17.2666 15.5059 17.4229C15.3497 17.5791 15.1379 17.6669 14.917 17.667H9.08301C8.86211 17.6669 8.65034 17.5791 8.49414 17.4229C8.33794 17.2666 8.25006 17.0549 8.25 16.834V12.667C8.25 12.446 8.33786 12.2334 8.49414 12.0771C8.65033 11.921 8.86219 11.8331 9.08301 11.833H9.5C9.50009 11.1701 9.76366 10.5342 10.2324 10.0654C10.7012 9.59669 11.337 9.33301 12 9.33301ZM12 13.5C11.8167 13.5 11.6386 13.5604 11.4932 13.6719C11.3478 13.7834 11.2429 13.9402 11.1953 14.1172C11.1478 14.2944 11.1603 14.4829 11.2305 14.6523C11.3006 14.8216 11.4244 14.963 11.583 15.0547V15.583C11.583 15.6934 11.627 15.7998 11.7051 15.8779C11.7832 15.9561 11.8895 16 12 16C12.1105 16 12.2168 15.9561 12.2949 15.8779C12.373 15.7998 12.417 15.6934 12.417 15.583V15.0547C12.5756 14.963 12.6994 14.8216 12.7695 14.6523C12.8397 14.4829 12.8522 14.2944 12.8047 14.1172C12.7571 13.9402 12.6522 13.7834 12.5068 13.6719C12.3614 13.5604 12.1833 13.5 12 13.5ZM15.2988 10.5918L15.7021 10.7002C15.8046 10.7324 15.8906 10.8033 15.9424 10.8975C15.9941 10.9917 16.0074 11.1022 15.9795 11.2061C15.9516 11.3099 15.885 11.3994 15.793 11.4551C15.701 11.5107 15.5903 11.5285 15.4854 11.5049L15.084 11.3975C14.9778 11.3685 14.8869 11.2985 14.832 11.2031C14.7772 11.1077 14.7626 10.994 14.791 10.8877C14.8195 10.7813 14.8891 10.6901 14.9844 10.6348C15.0795 10.5796 15.1925 10.564 15.2988 10.5918ZM14.7637 9.37109C14.8164 9.38521 14.8659 9.40923 14.9092 9.44238C14.9526 9.4757 14.9892 9.51803 15.0166 9.56543C15.0438 9.61271 15.0622 9.66465 15.0693 9.71875C15.0764 9.77286 15.0727 9.82813 15.0586 9.88086L15.0049 10.082C14.991 10.135 14.9667 10.1849 14.9336 10.2285C14.9004 10.2722 14.858 10.3093 14.8105 10.3369C14.7632 10.3643 14.7105 10.3824 14.6562 10.3896C14.6021 10.3968 14.5469 10.393 14.4941 10.3789C14.4411 10.3647 14.3912 10.3401 14.3477 10.3066C14.3041 10.2732 14.2676 10.2312 14.2402 10.1836C14.213 10.1361 14.1955 10.0836 14.1885 10.0293C14.1815 9.97487 14.1848 9.91916 14.1992 9.86621L14.2539 9.66504C14.2826 9.55854 14.3527 9.46728 14.4482 9.41211C14.5438 9.35713 14.6572 9.34264 14.7637 9.37109Z" fill="white"/>
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
