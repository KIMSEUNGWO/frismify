# 단축키

플러그인에 키보드 단축키를 추가하는 방법입니다.

## 기본 사용법

메타데이터에 `shortcuts` 배열을 추가합니다.

```typescript
const meta: PluginMetaData = {
  // ... 기본 필드
  shortcuts: [
    {
      id: 'toggle',
      name: '토글',
      description: '플러그인을 활성화/비활성화합니다',
      defaultKey: {
        windows: 'Ctrl+Shift+P',
        mac: '⌘⇧P',
      },
      enabled: true,
    },
  ],
};
```

## 단축키 정의

### 필수 필드

```typescript
{
  id: 'unique-shortcut-id',      // 고유 ID
  name: '단축키 이름',             // 표시 이름
  description: '단축키 설명',      // 설명
  defaultKey: {                  // 기본 키 조합
    windows: 'Ctrl+Shift+K',
    mac: '⌘⇧K',
  },
}
```

### 선택적 필드

```typescript
{
  enabled: true,  // 기본 활성화 여부 (기본값: true)
}
```

## 키 조합 형식

### Windows/Linux

```typescript
'Ctrl+Shift+K'    // Ctrl + Shift + K
'Ctrl+Alt+D'      // Ctrl + Alt + D
'Shift+F'         // Shift + F
'Ctrl+/'          // Ctrl + /
```

### Mac

```typescript
'⌘⇧K'      // Command + Shift + K
'⌘⌥D'      // Command + Option + D
'⇧F'       // Shift + F
'⌘/'       // Command + /
```

#### Mac 수식키
- `⌘` - Command (Cmd)
- `⌃` - Control
- `⌥` - Option (Alt)
- `⇧` - Shift

## 단축키 핸들러

`shortcuts` 객체에 핸들러 함수를 정의합니다.

```typescript
execute: createPluginExecutor('my-plugin', {
  onActivate: (helpers) => {
    console.log('플러그인 활성화');
  },

  shortcuts: {
    'toggle': (event, helpers) => {
      // 토글 로직
      console.log('토글 단축키 눌림');
    },

    'copy': (event, helpers) => {
      // 복사 로직
      navigator.clipboard.writeText('내용');
    },
  },
})
```

## 단축키 상태 확인

### 활성화 여부 확인

```typescript
execute: createPluginExecutor('my-plugin', {
  shortcuts: {
    'toggle': (event, helpers) => {
      const isEnabled = helpers.isShortcutEnabled('toggle');
      if (!isEnabled) return;

      // 핸들러 로직
    },
  },
})
```

### 커스텀 키 가져오기

```typescript
execute: createPluginExecutor('my-plugin', {
  shortcuts: {
    'toggle': (event, helpers) => {
      const customKey = helpers.getShortcutKey('toggle');
      console.log('현재 단축키:', customKey);
      // { windows: 'Ctrl+Shift+P', mac: '⌘⇧P' }
    },
  },
})
```

## 실전 예제

```typescript
const meta: PluginMetaData = {
  id: 'css-inspector',
  name: 'CSS Inspector',
  shortcuts: [
    {
      id: 'toggle-inspector',
      name: '검사 모드 토글',
      description: 'CSS 검사 모드를 켜고 끕니다',
      defaultKey: {
        windows: 'Ctrl+Shift+F',
        mac: '⌘⇧F',
      },
      enabled: true,
    },
    {
      id: 'copy-styles',
      name: '스타일 복사',
      description: '선택한 요소의 스타일을 복사합니다',
      defaultKey: {
        windows: 'Ctrl+Shift+C',
        mac: '⌘⇧C',
      },
      enabled: true,
    },
    {
      id: 'navigate-up',
      name: '상위 요소로 이동',
      description: '부모 요소를 선택합니다',
      defaultKey: {
        windows: 'ArrowUp',
        mac: '↑',
      },
      enabled: true,
    },
  ],
};

const cssInspectorPlugin: Plugin = {
  meta,
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  execute: createPluginExecutor('css-inspector', {
    onActivate: (helpers) => {
      let isInspecting = false;
      let selectedElement: HTMLElement | null = null;

      // 상태를 외부에서 접근 가능하도록 저장
      (window as any).__inspectorState = {
        get isInspecting() { return isInspecting; },
        set isInspecting(value) { isInspecting = value; },
        get selectedElement() { return selectedElement; },
        set selectedElement(value) { selectedElement = value; },
      };
    },

    shortcuts: {
      'toggle-inspector': (event, helpers) => {
        const state = (window as any).__inspectorState;
        state.isInspecting = !state.isInspecting;

        if (state.isInspecting) {
          console.log('검사 모드 활성화');
        } else {
          console.log('검사 모드 비활성화');
        }
      },

      'copy-styles': (event, helpers) => {
        const state = (window as any).__inspectorState;
        if (!state.selectedElement) {
          console.warn('선택된 요소가 없습니다');
          return;
        }

        const styles = window.getComputedStyle(state.selectedElement);
        const cssText = styles.cssText;
        navigator.clipboard.writeText(cssText);
        console.log('스타일 복사 완료');
      },

      'navigate-up': (event, helpers) => {
        const state = (window as any).__inspectorState;
        if (!state.selectedElement) return;

        const parent = state.selectedElement.parentElement;
        if (parent) {
          state.selectedElement = parent;
          console.log('상위 요소로 이동:', parent.tagName);
        }
      },
    },
  }),
};
```

## 주의사항

### 단축키 충돌

- 브라우저 기본 단축키와 충돌하지 않도록 주의하세요
- 다른 플러그인과 충돌하지 않도록 고유한 키 조합을 사용하세요

### 자동 등록

- `createPluginExecutor`가 단축키 핸들러를 자동으로 등록합니다
- cleanup 시 자동으로 해제됩니다

### 비활성화된 단축키

- 사용자가 Options 페이지에서 단축키를 비활성화할 수 있습니다
- `helpers.isShortcutEnabled()`로 확인할 수 있습니다