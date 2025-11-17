# Helpers API

플러그인 실행 시 제공되는 `helpers` 객체의 API 문서입니다.

## 개요

`helpers` 객체는 `createPluginExecutor`의 콜백 함수에서 사용할 수 있습니다.

```typescript
execute: createPluginExecutor('my-plugin', {
  onActivate: (helpers) => {
    // helpers 사용
  },
  onSettingsChange: (helpers) => {
    // helpers 사용
  },
  shortcuts: {
    'toggle': (event, helpers) => {
      // helpers 사용
    },
  },
})
```

## 속성

### settings

현재 플러그인의 모든 설정값을 포함하는 **읽기 전용** 객체입니다.

```typescript
type: DeepReadonly<PluginSettings>

const allSettings = helpers.settings;
// { enabled: true, theme: 'dark', maxItems: 50 }

// ❌ 직접 수정 불가능 (TypeScript 에러)
helpers.settings.theme = 'light';  // Error!

// ✅ settingsManager를 통해 변경
const { settingsManager } = await import('./settings-manager');
await settingsManager.updatePluginSettings('my-plugin', 'theme', 'light');
```

### config

플러그인의 전체 설정 객체입니다. **읽기 전용**입니다.

```typescript
type: DeepReadonly<PluginConfig>

const config = helpers.config;
// { enabled: true, settings: {...}, shortcuts: {...} }

// ❌ 직접 수정 불가능
helpers.config.enabled = false;  // Error!
```

### pluginId

플러그인 ID입니다.

```typescript
type: string

const id = helpers.pluginId;
// 'my-plugin'
```

### ctx

WXT Content Script Context 객체입니다.

```typescript
type: ContentScriptContext

const context = helpers.ctx;
// WXT에서 제공하는 content script context
```

## 메서드

### getSetting()

특정 설정값을 가져옵니다.

#### 기본값과 함께

```typescript
getSetting<T>(key: string, defaultValue: T): T

const theme = helpers.getSetting('theme', 'dark');
// theme: 'dark' | 'light' | 'auto'
```

#### 기본값 없이

```typescript
getSetting<T>(key: string): T | undefined

const apiKey = helpers.getSetting<string>('apiKey');
// apiKey: string | undefined

if (!apiKey) {
  console.warn('API 키가 설정되지 않았습니다');
}
```

### isShortcutEnabled()

단축키의 활성화 여부를 확인합니다.

```typescript
isShortcutEnabled(shortcutId: string): boolean

const enabled = helpers.isShortcutEnabled('toggle');
if (!enabled) {
  console.log('단축키가 비활성화되어 있습니다');
  return;
}
```

### getShortcutKey()

단축키의 현재 키 조합을 가져옵니다.

```typescript
getShortcutKey(shortcutId: string): { windows: string; mac: string } | null

const key = helpers.getShortcutKey('toggle');
// { windows: 'Ctrl+Shift+P', mac: '⌘⇧P' }

if (key) {
  console.log('Windows:', key.windows);
  console.log('Mac:', key.mac);
}
```

## 사용 예제

### 설정 기반 초기화

```typescript
execute: createPluginExecutor('my-plugin', {
  onActivate: (helpers) => {
    // 설정값 읽기
    const enabled = helpers.getSetting('enabled', true);
    const theme = helpers.getSetting('theme', 'dark');
    const maxItems = helpers.getSetting('maxItems', 50);

    if (!enabled) {
      console.log('플러그인이 비활성화되어 있습니다');
      return;
    }

    // 초기화 로직
    initializePlugin({ theme, maxItems });
  },
})
```

### 설정 변경 처리

```typescript
execute: createPluginExecutor('my-plugin', {
  onActivate: (helpers) => {
    const instance = createInstance(helpers.settings);
  },

  onSettingsChange: (helpers) => {
    // 변경된 설정 확인
    console.log('플러그인 ID:', helpers.pluginId);
    console.log('새 설정:', helpers.settings);

    // 설정 적용
    const theme = helpers.getSetting('theme', 'dark');
    instance.updateTheme(theme);
  },
})
```

### 단축키 핸들러

```typescript
execute: createPluginExecutor('my-plugin', {
  shortcuts: {
    'toggle': (event, helpers) => {
      // 단축키 활성화 확인
      if (!helpers.isShortcutEnabled('toggle')) {
        return;
      }

      // 현재 단축키 정보
      const key = helpers.getShortcutKey('toggle');
      console.log('단축키:', key);

      // 설정값 사용
      const enabled = helpers.getSetting('enabled', true);
      if (!enabled) return;

      // 토글 로직
      toggleFeature();
    },
  },
})
```

### Context 활용

```typescript
execute: createPluginExecutor('my-plugin', {
  onActivate: (helpers) => {
    // WXT context 사용
    const ctx = helpers.ctx;

    // Content script의 고유 ID
    console.log('Context ID:', ctx.id);

    // cleanup 등록
    ctx.onInvalidated(() => {
      console.log('Content script가 무효화되었습니다');
    });
  },
})
```

## 타입 정의

```typescript
interface PluginHelpers {
  /** 현재 설정값 (읽기 전용) */
  readonly settings: DeepReadonly<PluginSettings>;

  /** 전체 설정 객체 (읽기 전용) */
  readonly config: DeepReadonly<PluginConfig>;

  /** 플러그인 ID */
  pluginId: string;

  /** Content Script Context */
  ctx: ContentScriptContext;

  /** 특정 설정값 가져오기 (defaultValue 있을 때) */
  getSetting<T>(key: string, defaultValue: T): T;

  /** 특정 설정값 가져오기 (defaultValue 없을 때) */
  getSetting<T>(key: string): T | undefined;

  /** 단축키 활성화 여부 확인 */
  isShortcutEnabled(shortcutId: string): boolean;

  /** 커스텀 단축키 가져오기 (없으면 기본값) */
  getShortcutKey(shortcutId: string): { windows: string; mac: string } | null;
}

/**
 * 깊은 읽기 전용 타입
 * 중첩된 객체도 모두 readonly로 만듭니다
 */
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};
```