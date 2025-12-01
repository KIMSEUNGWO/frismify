# 설정 스키마

플러그인에 사용자 정의 설정을 추가하는 방법입니다.

## 기본 사용법

플러그인 정의에 `settings` 객체를 추가합니다.

```typescript
import type { Plugin } from '@/types';

export const myPlugin: Plugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  // ... 기본 필드

  settings: {
    enabled: {
      type: 'boolean',
      label: '기능 활성화',
      description: '이 기능을 활성화합니다',
      defaultValue: true,
    },
    color: {
      type: 'string',
      label: '색상',
      description: '배경 색상을 지정합니다',
      defaultValue: '#FF0000',
    },
  },
};
```

## 설정 타입

### Boolean

토글 스위치로 표시됩니다.

```typescript
{
  enabled: {
    type: 'boolean',
    label: '활성화',
    description: '기능을 활성화합니다',
    defaultValue: true,
  },
}
```

### String

텍스트 입력 필드로 표시됩니다.

```typescript
{
  apiKey: {
    type: 'string',
    label: 'API 키',
    description: 'API 키를 입력하세요',
    defaultValue: '',
  },
}
```

### Number

숫자 입력 필드로 표시됩니다.

```typescript
{
  maxItems: {
    type: 'number',
    label: '최대 항목 수',
    description: '표시할 최대 항목 수',
    defaultValue: 50,
  },
}
```

### Select

드롭다운 메뉴로 표시됩니다.

```typescript
{
  theme: {
    type: 'select',
    label: '테마',
    description: '색상 테마를 선택하세요',
    defaultValue: 'dark',
    options: [
      { label: '다크', value: 'dark' },
      { label: '라이트', value: 'light' },
      { label: '자동', value: 'auto' },
    ],
  },
}
```

## 설정값 읽기

### Content Script에서 읽기

`pluginManagerProxy`를 사용하여 설정값을 가져옵니다.

```typescript
import { pluginManagerProxy } from '@/core/proxy/PluginManagerProxy';

export const myPlugin: Plugin = {
  // ... 메타데이터

  settings: {
    color: {
      type: 'string',
      label: '색상',
      defaultValue: '#FF0000',
    },
    opacity: {
      type: 'number',
      label: '투명도',
      defaultValue: 0.5,
    },
  },

  onActivate: async (ctx) => {
    // 설정값 가져오기
    const state = await pluginManagerProxy.getPluginState('my-plugin');

    const color = state?.settings?.color ?? '#FF0000';
    const opacity = state?.settings?.opacity ?? 0.5;

    // 설정값 사용
    const overlay = document.createElement('div');
    overlay.style.backgroundColor = color;
    overlay.style.opacity = String(opacity);
    document.body.appendChild(overlay);
  },
};
```

### Modal View에서 읽기

Vue 컴포넌트에서 `pluginManagerProxy`를 사용합니다.

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { pluginManagerProxy } from '@/core/proxy/PluginManagerProxy';

const color = ref('#FF0000');
const opacity = ref(0.5);

onMounted(async () => {
  const state = await pluginManagerProxy.getPluginState('my-plugin');

  if (state?.settings) {
    color.value = state.settings.color ?? '#FF0000';
    opacity.value = state.settings.opacity ?? 0.5;
  }
});
</script>
```

## 설정 변경 감지

Background에서 상태가 변경되면 자동으로 Port를 통해 브로드캐스트됩니다.

### Content Script에서 감지

```typescript
import { pluginManagerProxy } from '@/core/proxy/PluginManagerProxy';

export const myPlugin: Plugin = {
  // ... 메타데이터

  onActivate: async (ctx) => {
    let overlayElement: HTMLElement;

    // 초기 설정 적용
    const state = await pluginManagerProxy.getPluginState('my-plugin');
    const color = state?.settings?.color ?? '#FF0000';

    overlayElement = document.createElement('div');
    overlayElement.style.backgroundColor = color;
    document.body.appendChild(overlayElement);

    // 설정 변경 감지
    pluginManagerProxy.addListener((newState) => {
      const pluginState = newState.plugins['my-plugin'];
      if (pluginState?.settings) {
        // 설정 변경 시 UI 업데이트
        const newColor = pluginState.settings.color;
        if (overlayElement && newColor) {
          overlayElement.style.backgroundColor = newColor;
        }
      }
    });
  },
};
```

### Modal View에서 감지

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { pluginManagerProxy } from '@/core/proxy/PluginManagerProxy';
import type { AppState } from '@/types';

const color = ref('#FF0000');

const handleStateChange = (state: AppState) => {
  const pluginState = state.plugins['my-plugin'];
  if (pluginState?.settings?.color) {
    color.value = pluginState.settings.color;
  }
};

onMounted(async () => {
  // 초기 설정 로드
  const state = await pluginManagerProxy.getPluginState('my-plugin');
  if (state?.settings?.color) {
    color.value = state.settings.color;
  }

  // 설정 변경 리스너 등록
  pluginManagerProxy.addListener(handleStateChange);
});

onUnmounted(() => {
  // 리스너 제거
  pluginManagerProxy.removeListener(handleStateChange);
});
</script>
```

## 실전 예제

```typescript
import type { Plugin } from '@/types';
import { pluginManagerProxy } from '@/core/proxy/PluginManagerProxy';

export const gridOverlay: Plugin = {
  id: 'grid-overlay',
  name: 'Grid Overlay',
  description: '그리드 오버레이를 표시합니다',
  category: 'design',
  version: '1.0.0',
  tier: 'free',

  icon: (container) => {
    container.style.background = '#10B981';
  },

  settings: {
    gridSize: {
      type: 'number',
      label: '그리드 크기',
      description: '그리드 셀 크기 (px)',
      defaultValue: 8,
    },
    gridColor: {
      type: 'string',
      label: '그리드 색상',
      description: '그리드 선 색상',
      defaultValue: '#FF0000',
    },
    opacity: {
      type: 'number',
      label: '투명도',
      description: '오버레이 투명도 (0-1)',
      defaultValue: 0.3,
    },
    showRuler: {
      type: 'boolean',
      label: '눈금자 표시',
      description: '화면 가장자리에 눈금자를 표시합니다',
      defaultValue: true,
    },
  },

  onActivate: async (ctx) => {
    const state = await pluginManagerProxy.getPluginState('grid-overlay');

    // 설정값 가져오기 (기본값 사용)
    const gridSize = state?.settings?.gridSize ?? 8;
    const gridColor = state?.settings?.gridColor ?? '#FF0000';
    const opacity = state?.settings?.opacity ?? 0.3;
    const showRuler = state?.settings?.showRuler ?? true;

    // 그리드 오버레이 생성
    const overlay = document.createElement('div');
    overlay.id = 'grid-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 999999;
      background-image:
        repeating-linear-gradient(
          0deg,
          ${gridColor} 0px,
          ${gridColor} 1px,
          transparent 1px,
          transparent ${gridSize}px
        ),
        repeating-linear-gradient(
          90deg,
          ${gridColor} 0px,
          ${gridColor} 1px,
          transparent 1px,
          transparent ${gridSize}px
        );
      opacity: ${opacity};
    `;
    document.body.appendChild(overlay);

    // 눈금자 추가
    if (showRuler) {
      const ruler = document.createElement('div');
      ruler.id = 'grid-ruler';
      // 눈금자 구현...
      document.body.appendChild(ruler);
    }

    // 설정 변경 감지
    const handleStateChange = (newState: AppState) => {
      const pluginState = newState.plugins['grid-overlay'];
      if (!pluginState?.settings) return;

      // 설정이 변경되면 오버레이 업데이트
      const newGridSize = pluginState.settings.gridSize ?? 8;
      const newGridColor = pluginState.settings.gridColor ?? '#FF0000';
      const newOpacity = pluginState.settings.opacity ?? 0.3;

      if (overlay) {
        overlay.style.backgroundImage = `
          repeating-linear-gradient(0deg, ${newGridColor} 0px, ${newGridColor} 1px, transparent 1px, transparent ${newGridSize}px),
          repeating-linear-gradient(90deg, ${newGridColor} 0px, ${newGridColor} 1px, transparent 1px, transparent ${newGridSize}px)
        `;
        overlay.style.opacity = String(newOpacity);
      }
    };

    pluginManagerProxy.addListener(handleStateChange);

    // Cleanup 시 리스너 제거
    ctx.onInvalidated(() => {
      pluginManagerProxy.removeListener(handleStateChange);
    });
  },

  onCleanup: () => {
    document.getElementById('grid-overlay')?.remove();
    document.getElementById('grid-ruler')?.remove();
  },
};
```

## 타입 정의

```typescript
// types.ts
export type PluginSettingType = 'boolean' | 'string' | 'number' | 'select';

export interface PluginSetting {
  type: PluginSettingType;
  label: string;
  description: string;
  defaultValue: any;
  options?: Array<{ label: string; value: any }>; // select일 때만
}

export interface PluginState {
  enabled: boolean;
  settings: Record<string, any>;
  shortcuts: Record<string, ShortcutState>;
}
```

## 주의사항

### 1. 기본값 사용

항상 기본값을 제공하세요:

```typescript
const color = state?.settings?.color ?? '#FF0000'; // ✅ 좋음
const color = state?.settings?.color; // ❌ undefined일 수 있음
```

### 2. 리스너 정리

onInvalidated에서 리스너를 제거하세요:

```typescript
onActivate: async (ctx) => {
  const handleChange = (state) => { /* ... */ };
  pluginManagerProxy.addListener(handleChange);

  ctx.onInvalidated(() => {
    pluginManagerProxy.removeListener(handleChange); // ✅ 정리 필수
  });
}
```

### 3. 설정 변경은 Options에서만

사용자는 Options 페이지에서만 설정을 변경할 수 있습니다.
Content Script에서는 읽기만 가능합니다.