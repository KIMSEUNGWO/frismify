# 단축키

플러그인에 키보드 단축키를 추가하는 방법입니다.

## 기본 사용법

플러그인 정의에 `shortcuts` 객체를 추가합니다.

```typescript
import type { Plugin } from '@/types';

export const myPlugin: Plugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  // ... 메타데이터

  shortcuts: {
    toggle: {
      name: '토글',
      description: '플러그인을 활성화/비활성화합니다',
      keys: ['Cmd', 'Shift', 'P'],
      handler: async (event, ctx) => {
        console.log('단축키 실행!');
        // 로직 구현
      },
    },
  },
};
```

## 단축키 정의

### 기본 구조

```typescript
shortcuts: {
  [shortcutId: string]: {
    name: string;           // 표시 이름
    description: string;    // 설명
    keys?: ShortcutKey[];  // 기본 키 조합 (선택)
    handler: (event: KeyboardEvent, ctx: ContentScriptContext) => void | Promise<void>;
  }
}
```

### 키 조합 형식

**추상화된 키 형식** (플랫폼 자동 변환):

```typescript
// 수식키
type ModifierKey = 'Cmd' | 'Shift' | 'Alt' | 'Ctrl';

// 일반 키
type RegularKey = 'A'-'Z' | '0'-'9' | 'F1'-'F12' | 'ArrowUp' | 'ArrowDown' | ...;

// 조합
keys: ['Cmd', 'Shift', 'P']      // Mac: ⌘⇧P, Windows: Ctrl+Shift+P
keys: ['Alt', 'K']                // Mac: ⌥K, Windows: Alt+K
keys: ['Cmd', 'B']                // Mac: ⌘B, Windows: Ctrl+B
```

**자동 플랫폼 변환:**
- Mac: `Cmd` → `Command (⌘)`, `Alt` → `Option (⌥)`
- Windows/Linux: `Cmd` → `Ctrl`

## 단축키 핸들러

### 기본 핸들러

```typescript
shortcuts: {
  copy: {
    name: '복사',
    description: '현재 내용을 복사합니다',
    keys: ['Cmd', 'Shift', 'C'],
    handler: async (event, ctx) => {
      event.preventDefault(); // 기본 동작 방지 (자동으로 처리됨)

      const content = getCurrentContent();
      await navigator.clipboard.writeText(content);
      console.log('복사 완료');
    },
  },
}
```

### 상태 기반 핸들러

```typescript
shortcuts: {
  toggle: {
    name: '검사 모드 토글',
    description: 'CSS 검사 모드를 켜고 끕니다',
    keys: ['Cmd', 'Shift', 'F'],
    handler: async (event, ctx) => {
      // 상태 토글
      const isActive = getInspectorState();
      if (isActive) {
        deactivateInspector();
      } else {
        activateInspector();
      }
    },
  },
}
```

## 단축키 ID

### `execute` (예약 ID)

`execute`는 `onExecute` 타입 플러그인을 위한 **예약된 단축키 ID**입니다.

```typescript
export const colorPicker: Plugin = {
  id: 'color-picker',
  // ... 메타데이터

  onExecute: {
    type: 'EXECUTE_PLUGIN',
    execute: async (ctx) => {
      // Color Picker 실행
      const color = await pickColor();
      navigator.clipboard.writeText(color);
    },
  },

  // 단축키로 onExecute 실행
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
```

**execute의 특별한 점:**
- enabled 상태 확인 **안 함**
- onExecute.execute() 호출

### 일반 단축키 (enabled 확인)

`execute` 외의 단축키는 플러그인이 enabled 상태일 때만 동작합니다.

```typescript
shortcuts: {
  navigateUp: {
    name: '상위 요소로 이동',
    description: '부모 요소를 선택합니다',
    keys: ['ArrowUp'],
    handler: async (event, ctx) => {
      // ✅ 플러그인이 enabled 상태일 때만 실행됨
      navigateToParent();
    },
  },
}
```

## 커스텀 키 조합

사용자는 Options 페이지 > Shortcuts 메뉴에서 단축키를 변경할 수 있습니다.

### 초기 키 없이 정의

```typescript
shortcuts: {
  custom: {
    name: '커스텀 동작',
    description: '사용자 지정 동작',
    // keys 없음 - 사용자가 Options에서 설정
    handler: async (event, ctx) => {
      doCustomAction();
    },
  },
}
```

## 실전 예제

### CSS Inspector 플러그인

```typescript
import type { Plugin } from '@/types';

let selectedElement: HTMLElement | null = null;
let isInspecting = false;

export const cssInspector: Plugin = {
  id: 'css-inspector',
  name: 'CSS Inspector',
  description: '요소를 클릭하여 CSS를 검사합니다',
  category: 'inspector',
  version: '1.0.0',
  tier: 'free',

  icon: (container) => {
    container.style.background = '#3B82F6';
  },

  shortcuts: {
    toggle: {
      name: '검사 모드 토글',
      description: 'CSS 검사 모드를 켜고 끕니다',
      keys: ['Cmd', 'Shift', 'F'],
      handler: async (event, ctx) => {
        isInspecting = !isInspecting;
        console.log(`검사 모드: ${isInspecting ? 'ON' : 'OFF'}`);

        if (isInspecting) {
          document.body.style.cursor = 'crosshair';
        } else {
          document.body.style.cursor = '';
          selectedElement = null;
        }
      },
    },

    copyStyles: {
      name: '스타일 복사',
      description: '선택한 요소의 스타일을 복사합니다',
      keys: ['Cmd', 'Shift', 'C'],
      handler: async (event, ctx) => {
        if (!selectedElement) {
          console.warn('선택된 요소가 없습니다');
          return;
        }

        const styles = window.getComputedStyle(selectedElement);
        const cssText = styles.cssText;
        await navigator.clipboard.writeText(cssText);
        console.log('스타일 복사 완료');
      },
    },

    navigateUp: {
      name: '상위 요소로 이동',
      description: '부모 요소를 선택합니다',
      keys: ['ArrowUp'],
      handler: async (event, ctx) => {
        if (!selectedElement) return;

        const parent = selectedElement.parentElement;
        if (parent && parent !== document.body) {
          selectedElement = parent;
          highlightElement(selectedElement);
          console.log('상위 요소:', selectedElement.tagName);
        }
      },
    },

    navigateDown: {
      name: '하위 요소로 이동',
      description: '첫 번째 자식 요소를 선택합니다',
      keys: ['ArrowDown'],
      handler: async (event, ctx) => {
        if (!selectedElement) return;

        const firstChild = selectedElement.firstElementChild as HTMLElement;
        if (firstChild) {
          selectedElement = firstChild;
          highlightElement(selectedElement);
          console.log('하위 요소:', selectedElement.tagName);
        }
      },
    },
  },

  onActivate: async (ctx) => {
    // 클릭 핸들러
    const handleClick = (e: MouseEvent) => {
      if (isInspecting) {
        e.preventDefault();
        e.stopPropagation();
        selectedElement = e.target as HTMLElement;
        highlightElement(selectedElement);
      }
    };

    document.addEventListener('click', handleClick, true);

    ctx.onInvalidated(() => {
      document.removeEventListener('click', handleClick, true);
    });
  },

  onCleanup: () => {
    isInspecting = false;
    selectedElement = null;
    document.body.style.cursor = '';
  },
};

function highlightElement(element: HTMLElement) {
  // 하이라이트 구현...
}
```

## 단축키 충돌 방지

### 브라우저 기본 단축키 피하기

다음 단축키는 피하세요:
- `Ctrl+T` (새 탭)
- `Ctrl+W` (탭 닫기)
- `Ctrl+N` (새 창)
- `Ctrl+R` (새로고침)
- `F5` (새로고침)
- `F12` (DevTools)

### 권장 단축키 패턴

```typescript
// ✅ 좋은 예 (Cmd+Shift+문자)
keys: ['Cmd', 'Shift', 'P']
keys: ['Cmd', 'Shift', 'F']
keys: ['Cmd', 'Alt', 'C']

// ⚠️  주의 (브라우저 기본 단축키)
keys: ['Cmd', 'T']  // 새 탭
keys: ['Cmd', 'W']  // 탭 닫기
```

## 타입 정의

```typescript
// types.ts
export type ShortcutKey = string; // 'Cmd', 'Shift', 'Alt', 'Ctrl', 'A', 'ArrowUp', etc.

export interface PluginShortcut {
  name: string;
  description: string;
  keys?: ShortcutKey[];
  handler: (event: KeyboardEvent, ctx: ContentScriptContext) => void | Promise<void>;
}

export interface ShortcutState {
  keys?: ShortcutKey[]; // 사용자 커스텀 키
}
```

## 주의사항

### 1. 자동 preventDefault

단축키 핸들러가 호출되면 자동으로 `event.preventDefault()`와 `event.stopPropagation()`이 호출됩니다.

### 2. enabled 상태 확인

`execute` 외의 단축키는 플러그인이 enabled 상태일 때만 동작합니다.

### 3. 플랫폼 자동 변환

`Cmd` 키는 자동으로 플랫폼에 맞게 변환됩니다:
- Mac: Command (⌘)
- Windows/Linux: Ctrl

### 4. 커스텀 단축키 우선

사용자가 Options에서 설정한 단축키가 플러그인 정의의 `keys`보다 우선합니다.