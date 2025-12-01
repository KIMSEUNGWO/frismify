# 플러그인 구조

Prismify 플러그인의 구조와 각 필드에 대한 상세 설명입니다.

## 기본 구조

```typescript
import type { Plugin } from '@/types';

export const myPlugin: Plugin = {
  // ===== 메타데이터 =====
  id: 'unique-plugin-id',
  name: 'Plugin Name',
  description: 'Plugin description',
  category: 'utility',
  version: '1.0.0',
  tier: 'free',
  icon: (container) => { /* ... */ },

  // ===== 실행 설정 =====
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  // ===== 라이프사이클 =====
  onActivate: async (ctx) => { /* ... */ },
  onCleanup: () => { /* ... */ },

  // 또는
  onExecute: {
    type: 'EXECUTE_PLUGIN',
    execute: async (ctx) => { /* ... */ },
  },

  // ===== 설정 스키마 =====
  settings: { /* ... */ },

  // ===== 단축키 =====
  shortcuts: { /* ... */ },
};
```

## 메타데이터 필드

### id (필수)

플러그인의 고유 식별자입니다.

```typescript
id: 'my-plugin'  // kebab-case 권장
```

**규칙**:
- 전역적으로 고유해야 함
- kebab-case 사용 권장
- 영문자, 숫자, 하이픈만 사용

### name (필수)

UI에 표시될 플러그인 이름입니다.

```typescript
name: 'My Awesome Plugin'
```

### description (필수)

플러그인 설명입니다.

```typescript
description: '웹 페이지의 CSS를 검사하고 분석합니다'
```

### category (필수)

플러그인 카테고리입니다.

```typescript
type Category = 'inspector' | 'performance' | 'design' | 'utility';

category: 'inspector'
```

**카테고리 설명**:
- `inspector`: 요소 검사, CSS 분석 등
- `performance`: 성능 측정, 최적화 도구
- `design`: 디자인 도구, 색상, 타이포그래피
- `utility`: 기타 유틸리티

### version (필수)

플러그인 버전 (SemVer 형식)입니다.

```typescript
version: '1.0.0'
```

### tier (필수)

비즈니스 티어입니다.

```typescript
type Tier = 'free' | 'pro';

tier: 'free'  // 또는 'pro'
```

### icon (필수)

아이콘 렌더링 함수입니다.

```typescript
icon: (container: HTMLDivElement) => void
```

**예제**:

```typescript
// 1. 그라데이션 배경
icon: (container) => {
  container.style.background = 'linear-gradient(135deg, #8B5CF6, #EC4899)';
}

// 2. 이모지
icon: (container) => {
  container.style.background = '#10B981';
  container.innerHTML = '<span style="font-size: 20px;">🎨</span>';
}

// 3. SVG 아이콘
icon: (container) => {
  container.style.background = '#8B5CF6';
  container.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
      <path d="M12 2L2 7v10c0 5.5 3.8 10.7 10 12 6.2-1.3 10-6.5 10-12V7l-10-5z"/>
    </svg>
  `;
}
```

## 실행 설정

### matches (선택)

플러그인이 실행될 URL 패턴입니다.

```typescript
matches?: string[];

// 예시
matches: ['<all_urls>']              // 모든 페이지 (기본값)
matches: ['https://*.google.com/*']   // 구글 도메인
matches: ['https://github.com/*']     // GitHub만
```

### runAt (선택)

Content Script 실행 시점입니다.

```typescript
runAt?: 'document_start' | 'document_end' | 'document_idle';

// 예시
runAt: 'document_idle'  // 기본값, 권장
runAt: 'document_end'   // DOM 로드 후 즉시
runAt: 'document_start' // DOM 로드 전
```

## 라이프사이클 메서드

### onActivate (선택)

플러그인이 활성화될 때 호출됩니다.

```typescript
onActivate?: (ctx: ContentScriptContext) => void | Promise<void>;
```

**사용 시기**:
- 지속적으로 동작하는 기능
- 페이지 로드 시 자동 실행

**예제**:
```typescript
onActivate: async (ctx) => {
  // DOM에 오버레이 추가
  const overlay = document.createElement('div');
  overlay.id = 'my-plugin-overlay';
  overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%;';
  document.body.appendChild(overlay);

  // 이벤트 리스너 등록
  document.addEventListener('click', handleClick);
},
```

### onCleanup (선택)

플러그인이 비활성화될 때 호출됩니다.

```typescript
onCleanup?: () => void | Promise<void>;
```

**중요**: `onActivate`에서 생성한 모든 리소스를 정리해야 합니다.

**예제**:
```typescript
onCleanup: () => {
  // DOM 요소 제거
  document.getElementById('my-plugin-overlay')?.remove();

  // 이벤트 리스너 제거
  document.removeEventListener('click', handleClick);

  // 인터벌/타이머 정리
  clearInterval(timerId);
},
```

### onExecute (선택)

사용자가 플러그인을 실행할 때 호출됩니다.

```typescript
onExecute?: {
  type: 'EXECUTE_PLUGIN' | 'OPEN_MODAL';
  execute: (ctx: ContentScriptContext) => void | Promise<void>;
};
```

**타입 설명**:
- `EXECUTE_PLUGIN`: 함수만 실행
- `OPEN_MODAL`: 모달 창 열기 + 함수 실행

**EXECUTE_PLUGIN 예제** (일회성 실행):
```typescript
onExecute: {
  type: 'EXECUTE_PLUGIN',
  execute: async (ctx) => {
    // 스크린샷 촬영
    const canvas = await captureScreen();
    downloadImage(canvas);
  },
},
```

**OPEN_MODAL 예제** (모달 UI 표시):
```typescript
onExecute: {
  type: 'OPEN_MODAL',
  execute: async (ctx) => {
    // 모달이 열릴 때 추가 초기화 (선택)
    console.log('Color Picker modal opened');
  },
},
```

모달 뷰는 `entrypoints/content/router/index.ts`에 등록:
```typescript
{
  path: '/color-picker',
  name: 'color-picker',
  component: ColorPickerView,
}
```

## 설정 스키마

플러그인의 사용자 설정을 정의합니다. [설정 스키마 가이드](./03-settings.md) 참고.

```typescript
settings?: {
  [settingId: string]: PluginSetting;
};
```

**예제**:
```typescript
settings: {
  enabled: {
    type: 'boolean',
    label: '기능 활성화',
    description: '이 기능을 활성화합니다',
    defaultValue: true,
  },
  color: {
    type: 'select',
    label: '색상',
    defaultValue: 'blue',
    options: [
      { label: '파란색', value: 'blue' },
      { label: '빨간색', value: 'red' },
    ],
  },
},
```

## 단축키

키보드 단축키를 정의합니다. [단축키 가이드](./04-shortcuts.md) 참고.

```typescript
shortcuts?: {
  [shortcutId: string]: PluginShortcut;
};
```

**예제**:
```typescript
shortcuts: {
  toggle: {
    name: '토글',
    description: '기능을 켜고 끕니다',
    handler: async (event, ctx) => {
      toggleFeature();
    },
  },
},
```

## ContentScriptContext

WXT에서 제공하는 Content Script 컨텍스트 객체입니다.

```typescript
interface ContentScriptContext {
  id: string;                    // Context 고유 ID
  onInvalidated: (callback) => void;  // 무효화 시 콜백
}
```

**사용 예제**:
```typescript
onActivate: async (ctx) => {
  console.log('Context ID:', ctx.id);

  // Content script 무효화 시 정리
  ctx.onInvalidated(() => {
    console.log('Content script invalidated');
    cleanup();
  });
},
```

## 플러그인 패턴

### 패턴 1: 활성화 기반 (Persistent)

```typescript
export const gridOverlay: Plugin = {
  id: 'grid-overlay',
  // ... 메타데이터

  onActivate: async (ctx) => {
    // 그리드 오버레이 생성 및 표시
    const grid = createGrid();
    document.body.appendChild(grid);
  },

  onCleanup: () => {
    // 그리드 제거
    document.querySelector('.grid-overlay')?.remove();
  },
};
```

### 패턴 2: 실행 기반 (On-Demand)

```typescript
export const colorPicker: Plugin = {
  id: 'color-picker',
  // ... 메타데이터

  onExecute: {
    type: 'EXECUTE_PLUGIN',
    execute: async (ctx) => {
      // 색상 선택 후 클립보드에 복사
      const color = await pickColor();
      await navigator.clipboard.writeText(color);
    },
  },
};
```

### 패턴 3: 모달 기반 (Modal UI)

```typescript
export const cssInspector: Plugin = {
  id: 'css-inspector',
  // ... 메타데이터

  onExecute: {
    type: 'OPEN_MODAL',
    execute: async (ctx) => {
      // 모달 열릴 때 초기 데이터 준비
      prepareInspectorData();
    },
  },
};
```

## 타입 정의 참고

```typescript
// types.ts
export interface Plugin {
  id: string;
  name: string;
  description: string;
  category: 'inspector' | 'performance' | 'design' | 'utility';
  version: string;
  tier: 'free' | 'pro';
  icon: (container: HTMLDivElement) => void;

  matches?: string[];
  runAt?: 'document_start' | 'document_end' | 'document_idle';

  onActivate?: (ctx: ContentScriptContext) => void | Promise<void>;
  onCleanup?: () => void | Promise<void>;

  onExecute?: {
    type: 'EXECUTE_PLUGIN' | 'OPEN_MODAL';
    execute: (ctx: ContentScriptContext) => void | Promise<void>;
  };

  settings?: {
    [settingId: string]: PluginSetting;
  };

  shortcuts?: {
    [shortcutId: string]: PluginShortcut;
  };
}
```