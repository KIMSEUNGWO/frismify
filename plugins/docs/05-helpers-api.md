# State 및 Settings 접근

플러그인에서 상태와 설정에 접근하는 방법입니다.

## 개요

Prismify는 **Background가 Single Source of Truth**인 아키텍처를 사용합니다. Content Script에서는 `pluginManagerProxy`를 통해 Background의 상태를 조회하고 변경사항을 구독합니다.

```typescript
import { pluginManagerProxy } from '@/core/proxy/PluginManagerProxy';

// 플러그인 상태 조회
const state = await pluginManagerProxy.getPluginState('my-plugin');

// 설정 변경 감지
pluginManagerProxy.addListener((newState) => {
  console.log('State changed:', newState);
});
```

## 플러그인 상태 조회

### getPluginState()

특정 플러그인의 전체 상태를 가져옵니다.

```typescript
const state = await pluginManagerProxy.getPluginState(pluginId);
// {
//   enabled: true,
//   settings: { color: '#FF0000', size: 8 },
//   shortcuts: { toggle: { keys: ['Cmd', 'Shift', 'P'] } }
// }
```

### 반환 타입

```typescript
interface PluginState {
  enabled: boolean;
  settings: Record<string, any>;
  shortcuts: Record<string, ShortcutState>;
}

interface ShortcutState {
  keys?: ShortcutKey[];
}
```

## 설정값 사용

### onActivate에서 설정 읽기

```typescript
import { pluginManagerProxy } from '@/core/proxy/PluginManagerProxy';

export const myPlugin: Plugin = {
  id: 'my-plugin',
  // ... 메타데이터

  settings: {
    color: {
      type: 'string',
      label: '색상',
      defaultValue: '#FF0000',
    },
    gridSize: {
      type: 'number',
      label: '그리드 크기',
      defaultValue: 8,
    },
  },

  onActivate: async (ctx) => {
    // 설정값 가져오기
    const state = await pluginManagerProxy.getPluginState('my-plugin');

    // 기본값과 함께 사용 (권장)
    const color = state?.settings?.color ?? '#FF0000';
    const gridSize = state?.settings?.gridSize ?? 8;

    // 설정값 사용
    const overlay = document.createElement('div');
    overlay.style.backgroundColor = color;
    overlay.style.width = `${gridSize}px`;
    document.body.appendChild(overlay);
  },
};
```

### 단축키 핸들러에서 설정 읽기

```typescript
shortcuts: {
  toggle: {
    name: '토글',
    description: '기능을 켜고 끕니다',
    keys: ['Cmd', 'Shift', 'P'],
    handler: async (event, ctx) => {
      // 설정값 조회
      const state = await pluginManagerProxy.getPluginState('my-plugin');
      const enabled = state?.settings?.enabled ?? true;

      if (!enabled) {
        console.log('기능이 비활성화되어 있습니다');
        return;
      }

      toggleFeature();
    },
  },
},
```

## 설정 변경 감지

### addListener()

Background의 상태 변경을 감지합니다.

```typescript
onActivate: async (ctx) => {
  let overlayElement: HTMLElement;

  // 초기 설정 적용
  const state = await pluginManagerProxy.getPluginState('my-plugin');
  const color = state?.settings?.color ?? '#FF0000';

  overlayElement = document.createElement('div');
  overlayElement.style.backgroundColor = color;
  document.body.appendChild(overlayElement);

  // 설정 변경 감지
  const handleStateChange = (newState: AppState) => {
    const pluginState = newState.plugins['my-plugin'];
    if (pluginState?.settings) {
      const newColor = pluginState.settings.color;
      if (overlayElement && newColor) {
        overlayElement.style.backgroundColor = newColor;
      }
    }
  };

  pluginManagerProxy.addListener(handleStateChange);

  // Cleanup 시 리스너 제거 (필수!)
  ctx.onInvalidated(() => {
    pluginManagerProxy.removeListener(handleStateChange);
  });
},
```

### removeListener()

더 이상 필요 없는 리스너를 제거합니다.

```typescript
// 리스너 함수 저장
const handleChange = (state: AppState) => {
  console.log('State changed:', state);
};

// 리스너 등록
pluginManagerProxy.addListener(handleChange);

// 리스너 제거 (cleanup 시)
ctx.onInvalidated(() => {
  pluginManagerProxy.removeListener(handleChange);
});
```

## 상태 변경 요청

### enablePlugin()

플러그인을 활성화합니다.

```typescript
await pluginManagerProxy.enablePlugin('my-plugin');
```

### disablePlugin()

플러그인을 비활성화합니다.

```typescript
await pluginManagerProxy.disablePlugin('my-plugin');
```

### updateSetting()

설정값을 업데이트합니다.

```typescript
await pluginManagerProxy.updateSetting('my-plugin', 'color', '#00FF00');
```

**주의**: 일반적으로 플러그인 내부에서 상태를 직접 변경하지 않습니다. 상태 변경은 Options 페이지에서 사용자가 수행합니다.

## ContentScriptContext

WXT에서 제공하는 Content Script 컨텍스트 객체입니다.

```typescript
interface ContentScriptContext {
  id: string;                         // Context 고유 ID
  onInvalidated: (callback) => void;  // 무효화 시 콜백
}
```

### 사용 예제

```typescript
onActivate: async (ctx) => {
  console.log('Context ID:', ctx.id);

  // DOM 요소 생성
  const element = document.createElement('div');
  document.body.appendChild(element);

  // Content script 무효화 시 정리
  ctx.onInvalidated(() => {
    console.log('Content script invalidated');
    element.remove();
  });
},
```

## 완전한 예제

### Grid Overlay 플러그인

```typescript
import type { Plugin } from '@/types';
import { pluginManagerProxy } from '@/core/proxy/PluginManagerProxy';
import type { AppState } from '@/types';

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
  },

  onActivate: async (ctx) => {
    // 초기 설정 가져오기
    const state = await pluginManagerProxy.getPluginState('grid-overlay');

    const gridSize = state?.settings?.gridSize ?? 8;
    const gridColor = state?.settings?.gridColor ?? '#FF0000';
    const opacity = state?.settings?.opacity ?? 0.3;

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

    // 설정 변경 감지
    const handleStateChange = (newState: AppState) => {
      const pluginState = newState.plugins['grid-overlay'];
      if (!pluginState?.settings) return;

      const newGridSize = pluginState.settings.gridSize ?? 8;
      const newGridColor = pluginState.settings.gridColor ?? '#FF0000';
      const newOpacity = pluginState.settings.opacity ?? 0.3;

      // 오버레이 업데이트
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
  },
};
```

## 타입 정의

```typescript
// PluginManagerProxy의 주요 메서드
interface PluginManagerProxy {
  getPluginState(pluginId: string): Promise<PluginState | null>;
  enablePlugin(pluginId: string): Promise<void>;
  disablePlugin(pluginId: string): Promise<void>;
  updateSetting(pluginId: string, settingId: string, value: any): Promise<void>;

  addListener(callback: (state: AppState) => void): void;
  removeListener(callback: (state: AppState) => void): void;
}

// 플러그인 상태
interface PluginState {
  enabled: boolean;
  settings: Record<string, any>;
  shortcuts: Record<string, ShortcutState>;
}

// 전체 앱 상태
interface AppState {
  plugins: Record<string, PluginState>;
}
```

## 주의사항

### 1. 항상 기본값 사용

```typescript
// ✅ 좋음
const color = state?.settings?.color ?? '#FF0000';

// ❌ 나쁨 (undefined일 수 있음)
const color = state?.settings?.color;
```

### 2. 리스너 정리 필수

```typescript
// ✅ 좋음
onActivate: async (ctx) => {
  const handleChange = (state) => { /* ... */ };
  pluginManagerProxy.addListener(handleChange);

  ctx.onInvalidated(() => {
    pluginManagerProxy.removeListener(handleChange);
  });
}

// ❌ 나쁨 (메모리 누수)
onActivate: async (ctx) => {
  pluginManagerProxy.addListener((state) => { /* ... */ });
  // 리스너 제거 안 함!
}
```

### 3. Background에서 설정 읽지 말 것

Content Script에서만 `pluginManagerProxy`를 사용하세요. Background에서는 `PluginManager.getInstance()`를 직접 사용합니다.

```typescript
// Content Script ✅
import { pluginManagerProxy } from '@/core/proxy/PluginManagerProxy';
const state = await pluginManagerProxy.getPluginState('my-plugin');

// Background ✅
import { PluginManager } from '@/core';
const manager = PluginManager.getInstance();
const state = await manager.getPluginState('my-plugin');
```