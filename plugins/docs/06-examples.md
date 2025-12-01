# 예제 모음

실전에서 사용할 수 있는 플러그인 예제 모음입니다.

## 1. 간단한 플러그인

가장 기본적인 형태의 플러그인입니다.

```typescript
import type { Plugin } from '@/types';

export const simplePlugin: Plugin = {
  id: 'simple-plugin',
  name: 'Simple Plugin',
  description: '간단한 예제 플러그인',
  category: 'utility',
  version: '1.0.0',
  tier: 'free',

  icon: (container) => {
    container.style.background = '#8b5cf6';
    container.innerHTML = '<span style="color: white; font-size: 20px;">🚀</span>';
  },

  onActivate: async (ctx) => {
    console.log('플러그인 활성화!');

    const message = document.createElement('div');
    message.id = 'simple-plugin-message';
    message.textContent = 'Simple Plugin is active!';
    message.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #8b5cf6;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 999999;
    `;
    document.body.appendChild(message);
  },

  onCleanup: () => {
    document.getElementById('simple-plugin-message')?.remove();
  },
};
```

## 2. 설정이 있는 플러그인

사용자 설정을 활용하는 플러그인입니다.

```typescript
import type { Plugin } from '@/types';
import { pluginManagerProxy } from '@/core/proxy/PluginManagerProxy';
import type { AppState } from '@/types';

export const themeChanger: Plugin = {
  id: 'theme-changer',
  name: 'Theme Changer',
  description: '페이지 테마를 변경합니다',
  category: 'utility',
  version: '1.0.0',
  tier: 'free',

  icon: (container) => {
    container.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    container.innerHTML = '<span style="color: white; font-size: 20px;">🎨</span>';
  },

  settings: {
    mode: {
      type: 'select',
      label: '모드',
      description: '테마 모드를 선택하세요',
      defaultValue: 'dark',
      options: [
        { label: '다크', value: 'dark' },
        { label: '라이트', value: 'light' },
        { label: '자동', value: 'auto' },
      ],
    },
    autoApply: {
      type: 'boolean',
      label: '자동 적용',
      description: '페이지 로드 시 자동으로 테마 적용',
      defaultValue: true,
    },
  },

  onActivate: async (ctx) => {
    // 초기 설정 가져오기
    const state = await pluginManagerProxy.getPluginState('theme-changer');
    const mode = state?.settings?.mode ?? 'dark';
    const autoApply = state?.settings?.autoApply ?? true;

    if (autoApply) {
      applyTheme(mode);
    }

    // 설정 변경 감지
    const handleStateChange = (newState: AppState) => {
      const pluginState = newState.plugins['theme-changer'];
      if (pluginState?.settings) {
        const newMode = pluginState.settings.mode ?? 'dark';
        applyTheme(newMode);
      }
    };

    pluginManagerProxy.addListener(handleStateChange);

    ctx.onInvalidated(() => {
      pluginManagerProxy.removeListener(handleStateChange);
    });
  },

  onCleanup: () => {
    document.documentElement.removeAttribute('data-theme');
  },
};

function applyTheme(mode: string) {
  document.documentElement.setAttribute('data-theme', mode);
}
```

## 3. 단축키가 있는 플러그인

키보드 단축키를 사용하는 플러그인입니다.

```typescript
import type { Plugin } from '@/types';

let isCapturing = false;

export const screenshotTool: Plugin = {
  id: 'screenshot-tool',
  name: 'Screenshot Tool',
  description: '화면을 캡처합니다',
  category: 'utility',
  version: '1.0.0',
  tier: 'free',

  icon: (container) => {
    container.style.background = '#10b981';
    container.innerHTML = '<span style="color: white; font-size: 20px;">📸</span>';
  },

  shortcuts: {
    'capture-full': {
      name: '전체 화면 캡처',
      description: '전체 화면을 캡처합니다',
      keys: ['Cmd', 'Shift', 'S'],
      handler: async (event, ctx) => {
        console.log('전체 화면 캡처 시작');
        await captureFullScreen();
      },
    },
    'capture-area': {
      name: '영역 캡처',
      description: '선택한 영역을 캡처합니다',
      keys: ['Cmd', 'Shift', 'A'],
      handler: async (event, ctx) => {
        console.log('영역 캡처 시작');
        await captureArea();
      },
    },
  },

  onActivate: async (ctx) => {
    console.log('Screenshot Tool 활성화');
  },
};

async function captureFullScreen() {
  isCapturing = true;
  // 전체 화면 캡처 로직
  console.log('Capturing full screen...');
  isCapturing = false;
}

async function captureArea() {
  isCapturing = true;
  // 영역 캡처 로직
  console.log('Capturing selected area...');
  isCapturing = false;
}
```

## 4. 완전한 기능을 갖춘 플러그인

설정, 단축키, 변경 감지를 모두 사용하는 플러그인입니다.

```typescript
import type { Plugin } from '@/types';
import { pluginManagerProxy } from '@/core/proxy/PluginManagerProxy';
import type { AppState } from '@/types';

interface InspectorOptions {
  showTooltip: boolean;
  highlightColor: string;
}

let inspector: ReturnType<typeof createInspector> | null = null;

export const elementInspector: Plugin = {
  id: 'element-inspector',
  name: 'Element Inspector',
  description: 'HTML 요소를 검사합니다',
  category: 'inspector',
  version: '1.0.0',
  tier: 'free',

  icon: (container) => {
    container.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    container.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
      </svg>
    `;
  },

  settings: {
    showTooltip: {
      type: 'boolean',
      label: '툴팁 표시',
      description: '요소 정보를 툴팁으로 표시',
      defaultValue: true,
    },
    highlightColor: {
      type: 'select',
      label: '하이라이트 색상',
      description: '선택한 요소의 하이라이트 색상',
      defaultValue: 'blue',
      options: [
        { label: '파란색', value: 'blue' },
        { label: '초록색', value: 'green' },
        { label: '빨간색', value: 'red' },
      ],
    },
  },

  shortcuts: {
    'toggle-inspector': {
      name: '검사 모드 토글',
      description: '검사 모드를 켜고 끕니다',
      keys: ['Cmd', 'Shift', 'I'],
      handler: async (event, ctx) => {
        if (inspector) {
          inspector.toggle();
        }
      },
    },
    'copy-info': {
      name: '정보 복사',
      description: '선택한 요소의 정보를 복사합니다',
      keys: ['Cmd', 'C'],
      handler: async (event, ctx) => {
        if (!inspector) return;

        const info = inspector.getSelectedElementInfo();
        if (info) {
          await navigator.clipboard.writeText(JSON.stringify(info, null, 2));
          console.log('정보 복사 완료');
        }
      },
    },
  },

  onActivate: async (ctx) => {
    // 설정 읽기
    const state = await pluginManagerProxy.getPluginState('element-inspector');
    const showTooltip = state?.settings?.showTooltip ?? true;
    const highlightColor = state?.settings?.highlightColor ?? 'blue';

    // Inspector 인스턴스 생성
    inspector = createInspector({
      showTooltip,
      highlightColor,
    });

    // 설정 변경 감지
    const handleStateChange = (newState: AppState) => {
      const pluginState = newState.plugins['element-inspector'];
      if (!pluginState?.settings || !inspector) return;

      const showTooltip = pluginState.settings.showTooltip ?? true;
      const highlightColor = pluginState.settings.highlightColor ?? 'blue';

      inspector.updateSettings({ showTooltip, highlightColor });
    };

    pluginManagerProxy.addListener(handleStateChange);

    ctx.onInvalidated(() => {
      pluginManagerProxy.removeListener(handleStateChange);
    });
  },

  onCleanup: () => {
    if (inspector) {
      inspector.destroy();
      inspector = null;
    }
  },
};

// Inspector 생성 함수
function createInspector(options: InspectorOptions) {
  let isActive = false;
  let selectedElement: HTMLElement | null = null;

  return {
    toggle() {
      isActive = !isActive;
      console.log('Inspector:', isActive ? '활성화' : '비활성화');
    },

    updateSettings(newOptions: Partial<InspectorOptions>) {
      Object.assign(options, newOptions);
      console.log('설정 업데이트:', options);
    },

    getSelectedElementInfo() {
      if (!selectedElement) return null;

      return {
        tag: selectedElement.tagName,
        id: selectedElement.id,
        classes: Array.from(selectedElement.classList),
        attributes: Array.from(selectedElement.attributes).map(attr => ({
          name: attr.name,
          value: attr.value,
        })),
      };
    },

    destroy() {
      isActive = false;
      selectedElement = null;
      console.log('Inspector 제거됨');
    },
  };
}
```

## 5. 특정 사이트 전용 플러그인

특정 웹사이트에서만 동작하는 플러그인입니다.

```typescript
import type { Plugin } from '@/types';
import { pluginManagerProxy } from '@/core/proxy/PluginManagerProxy';

export const githubEnhancer: Plugin = {
  id: 'github-enhancer',
  name: 'GitHub Enhancer',
  description: 'GitHub 사용성을 개선합니다',
  category: 'utility',
  version: '1.0.0',
  tier: 'free',

  icon: (container) => {
    container.style.background = '#24292e';
    container.innerHTML = '<span style="color: white; font-size: 20px;">🐙</span>';
  },

  matches: ['https://github.com/*'],  // GitHub에서만 실행

  settings: {
    autoExpandDiff: {
      type: 'boolean',
      label: 'Diff 자동 펼치기',
      description: 'PR의 파일 변경사항을 자동으로 펼칩니다',
      defaultValue: true,
    },
  },

  onActivate: async (ctx) => {
    const state = await pluginManagerProxy.getPluginState('github-enhancer');
    const autoExpandDiff = state?.settings?.autoExpandDiff ?? true;

    if (autoExpandDiff) {
      expandAllDiffs();
    }
  },
};

function expandAllDiffs() {
  const buttons = document.querySelectorAll('[data-load-diff-button]');
  buttons.forEach(button => (button as HTMLElement).click());
}
```

## 6. 일회성 실행 플러그인 (onExecute)

버튼 클릭 또는 단축키로 실행되는 일회성 플러그인입니다.

```typescript
import type { Plugin } from '@/types';

export const colorPicker: Plugin = {
  id: 'color-picker',
  name: 'Color Picker',
  description: '페이지에서 색상을 선택합니다',
  category: 'design',
  version: '1.0.0',
  tier: 'free',

  icon: (container) => {
    container.style.background = 'linear-gradient(135deg, #FF6B6B, #FFE66D)';
    container.innerHTML = '<span style="color: white; font-size: 20px;">🎨</span>';
  },

  onExecute: {
    type: 'EXECUTE_PLUGIN',
    execute: async (ctx) => {
      console.log('Color Picker 실행');

      // 색상 선택 로직
      const color = await pickColorFromPage();

      if (color) {
        await navigator.clipboard.writeText(color);
        console.log('색상 복사 완료:', color);

        // 알림 표시
        showNotification(`색상 복사: ${color}`);
      }
    },
  },

  shortcuts: {
    execute: {
      name: 'Color Picker 실행',
      description: '색상 선택 도구를 실행합니다',
      keys: ['Cmd', 'Shift', 'C'],
      handler: async (event, ctx) => {
        // onExecute.execute가 자동으로 호출됨
      },
    },
  },
};

async function pickColorFromPage(): Promise<string | null> {
  // 색상 선택 구현
  return '#FF6B6B';
}

function showNotification(message: string) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10B981;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 999999;
  `;
  document.body.appendChild(notification);

  setTimeout(() => notification.remove(), 3000);
}
```

## 7. 모달 기반 플러그인 (OPEN_MODAL)

모달 UI를 표시하는 플러그인입니다.

```typescript
import type { Plugin } from '@/types';

export const cssInspector: Plugin = {
  id: 'css-inspector',
  name: 'CSS Inspector',
  description: 'CSS 속성을 검사하고 분석합니다',
  category: 'inspector',
  version: '1.0.0',
  tier: 'free',

  icon: (container) => {
    container.style.background = '#3B82F6';
    container.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
        <path d="M9 3L5 6.99h3V14h2V6.99h3L9 3zm7 14.01V10h-2v7.01h-3L15 21l4-3.99h-3z"/>
      </svg>
    `;
  },

  onExecute: {
    type: 'OPEN_MODAL',
    execute: async (ctx) => {
      // 모달이 열릴 때 초기 데이터 준비
      console.log('CSS Inspector 모달 열림');
    },
  },

  shortcuts: {
    execute: {
      name: 'CSS Inspector 열기',
      description: 'CSS Inspector 모달을 엽니다',
      keys: ['Cmd', 'Shift', 'X'],
      handler: async (event, ctx) => {
        // 모달 자동으로 열림
      },
    },
  },
};
```

모달 뷰 컴포넌트 (`CssInspectorView.vue`):

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { modalManager } from '@/core/ModalManager';

const pluginId = 'css-inspector';
const selectedElement = ref<HTMLElement | null>(null);
const cssProperties = ref<Record<string, string>>({});

onMounted(() => {
  // 페이지에서 요소 선택 리스너
  window.addEventListener('cssInspector:elementSelected', handleElementSelected);
});

function handleElementSelected(event: CustomEvent) {
  selectedElement.value = event.detail.element;
  cssProperties.value = getComputedStyles(selectedElement.value);
}

function getComputedStyles(element: HTMLElement) {
  const styles = window.getComputedStyle(element);
  const result: Record<string, string> = {};

  for (let i = 0; i < styles.length; i++) {
    const prop = styles[i];
    result[prop] = styles.getPropertyValue(prop);
  }

  return result;
}

function closeModal() {
  modalManager.removeModal(pluginId);
}
</script>

<template>
  <div class="css-inspector-modal">
    <div class="header">
      <h2>CSS Inspector</h2>
      <button @click="closeModal">닫기</button>
    </div>
    <div class="content">
      <div v-if="selectedElement">
        <h3>{{ selectedElement.tagName }}</h3>
        <div v-for="(value, key) in cssProperties" :key="key">
          <strong>{{ key }}:</strong> {{ value }}
        </div>
      </div>
      <div v-else>
        <p>요소를 선택하세요</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.css-inspector-modal {
  width: 400px;
  max-height: 600px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  overflow: auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.content {
  padding: 16px;
}
</style>
```

## 8. 리스너를 사용한 동적 업데이트 플러그인

설정 변경을 실시간으로 반영하는 플러그인입니다.

```typescript
import type { Plugin } from '@/types';
import { pluginManagerProxy } from '@/core/proxy/PluginManagerProxy';
import type { AppState } from '@/types';

export const dynamicOverlay: Plugin = {
  id: 'dynamic-overlay',
  name: 'Dynamic Overlay',
  description: '실시간으로 업데이트되는 오버레이',
  category: 'design',
  version: '1.0.0',
  tier: 'free',

  icon: (container) => {
    container.style.background = '#8B5CF6';
  },

  settings: {
    opacity: {
      type: 'number',
      label: '투명도',
      description: '오버레이 투명도 (0-1)',
      defaultValue: 0.5,
    },
    color: {
      type: 'string',
      label: '색상',
      description: '오버레이 색상',
      defaultValue: '#8B5CF6',
    },
  },

  onActivate: async (ctx) => {
    // 초기 설정
    const state = await pluginManagerProxy.getPluginState('dynamic-overlay');
    const opacity = state?.settings?.opacity ?? 0.5;
    const color = state?.settings?.color ?? '#8B5CF6';

    // 오버레이 생성
    const overlay = document.createElement('div');
    overlay.id = 'dynamic-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 999998;
      background-color: ${color};
      opacity: ${opacity};
      transition: all 0.3s ease;
    `;
    document.body.appendChild(overlay);

    // 실시간 업데이트 리스너
    const handleStateChange = (newState: AppState) => {
      const pluginState = newState.plugins['dynamic-overlay'];
      if (!pluginState?.settings) return;

      const newOpacity = pluginState.settings.opacity ?? 0.5;
      const newColor = pluginState.settings.color ?? '#8B5CF6';

      // 부드러운 전환
      overlay.style.backgroundColor = newColor;
      overlay.style.opacity = String(newOpacity);

      console.log('오버레이 업데이트:', { color: newColor, opacity: newOpacity });
    };

    pluginManagerProxy.addListener(handleStateChange);

    ctx.onInvalidated(() => {
      pluginManagerProxy.removeListener(handleStateChange);
    });
  },

  onCleanup: () => {
    document.getElementById('dynamic-overlay')?.remove();
  },
};
```

## 요약

### 플러그인 패턴별 선택 가이드

| 패턴 | 사용 시기 | 예제 |
|------|----------|------|
| **onActivate** | 지속적으로 동작하는 기능 | Grid Overlay, Theme Changer |
| **onExecute (EXECUTE_PLUGIN)** | 일회성 실행 | Color Picker, Screenshot |
| **onExecute (OPEN_MODAL)** | UI가 필요한 도구 | CSS Inspector, Element Viewer |
| **Settings** | 사용자 커스터마이즈 필요 | 모든 플러그인에 추가 가능 |
| **Shortcuts** | 키보드 제어 필요 | 모든 플러그인에 추가 가능 |
| **Listeners** | 실시간 설정 반영 필요 | Dynamic Overlay, Live Preview |

### 체크리스트

플러그인 개발 시 확인사항:

- [ ] `id`가 고유한가?
- [ ] `icon` 함수가 정의되었는가?
- [ ] `onActivate`를 사용한다면 `onCleanup`도 정의했는가?
- [ ] 설정값을 읽을 때 기본값(`??`)을 사용하는가?
- [ ] 리스너를 등록했다면 `ctx.onInvalidated`에서 제거하는가?
- [ ] DOM 요소를 생성했다면 cleanup에서 제거하는가?
- [ ] 모달 기반이라면 router에 경로를 등록했는가?