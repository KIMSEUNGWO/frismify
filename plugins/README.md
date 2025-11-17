# 플러그인 개발 가이드

Front Hero 플러그인 시스템 개발 문서입니다.

## 📚 상세 문서

- [빠른 시작](./docs/01-quick-start.md)
- [플러그인 구조](./docs/02-plugin-structure.md)
- [설정 옵션](./docs/03-settings.md)
- [단축키](./docs/04-shortcuts.md)
- [Helpers API](./docs/05-helpers-api.md)
- [예제](./docs/06-examples.md)

## 📁 파일 구조

```
plugins/
├── docs/                       # 개발 가이드 문서
│   ├── 01-quick-start.md
│   ├── 02-plugin-structure.md
│   ├── 03-settings.md
│   ├── 04-shortcuts.md
│   ├── 05-helpers-api.md
│   └── 06-examples.md
├── implementations/            # 플러그인 구현
│   ├── css-spy.example.ts
│   └── ...
├── types.ts                    # 타입 정의
├── registry.ts                 # 플러그인 레지스트리
├── settings-manager.ts         # 설정 관리자
├── plugin-helper.ts            # 헬퍼 함수
└── README.md                   # 이 파일
```

## 🏗️ 핵심 컴포넌트

### 1. 타입 시스템 (`types.ts`)

플러그인의 구조를 정의하는 TypeScript 인터페이스들:

- **`PluginMetaData`**: 플러그인의 메타정보 (ID, 이름, 설명, 아이콘, 단축키, 설정 옵션 등)
- **`PluginShortcut`**: 단축키 정의 (ID, 이름, 설명, 기본 키 조합)
- **`PluginSettingOption`**: 설정 옵션 정의 (ID, 이름, 설명, 타입, 기본값)
- **`PluginConfig`**: 저장되는 플러그인 설정 (활성화 여부, 설정값, 커스텀 단축키)
- **`Plugin`**: 전체 플러그인 인터페이스

### 2. 설정 매니저 (`settings-manager.ts`)

Chrome Storage API를 사용하여 플러그인 설정을 관리하는 싱글톤 클래스:

**주요 기능:**
- ✅ 설정 저장/로드 (Chrome Storage)
- ✅ 플러그인 활성화/비활성화
- ✅ 설정값 업데이트
- ✅ 단축키 커스터마이징
- ✅ 실시간 설정 변경 감지 (리스너 패턴)
- ✅ 설정 초기화

**사용 예제:**
```typescript
import { settingsManager } from '@/plugins/settings-manager';

// 플러그인 활성화/비활성화
await settingsManager.setPluginEnabled('css-spy', true);

// 설정값 업데이트
await settingsManager.updatePluginSettings('css-spy', 'showComputedStyles', true);

// 단축키 커스터마이징
await settingsManager.updatePluginShortcut(
  'css-spy',
  'toggle-inspector',
  { windows: 'Ctrl+Shift+K', mac: '⌘⇧K' }
);

// 설정 변경 감지
settingsManager.addChangeListener((settings) => {
  console.log('Settings changed:', settings);
});
```

### 3. 플러그인 레지스트리 (`registry.ts`)

모든 플러그인을 중앙에서 관리하는 싱글톤 클래스:

**주요 기능:**
- ✅ 플러그인 등록/해제
- ✅ 플러그인 검색 (ID, 카테고리, 티어별)
- ✅ 활성화된 플러그인 필터링
- ✅ 설정과 함께 플러그인 가져오기
- ✅ Chrome Commands API용 단축키 목록 생성

**사용 예제:**
```typescript
import { pluginRegistry } from '@/plugins/registry';
import cssSpyPlugin from './implementations/css-spy';

// 플러그인 등록
pluginRegistry.register(cssSpyPlugin);

// 모든 플러그인 가져오기
const allPlugins = pluginRegistry.findAll();

// 활성화된 플러그인만
const enabledPlugins = pluginRegistry.getEnabledPlugins();

// Free 티어 플러그인
const freePlugins = pluginRegistry.findByTier('free');

// 설정과 함께 가져오기
const pluginsWithConfig = pluginRegistry.getAllPluginsWithConfig();
```

## 🎯 플러그인 작성 가이드

### 1. 플러그인 메타데이터 정의

```typescript
import type { PluginMetaData } from '../types';

const meta: PluginMetaData = {
  id: 'my-plugin',                    // 고유 ID
  name: 'My Plugin',                  // 표시 이름
  description: 'Plugin description',  // 설명
  version: '1.0.0',                   // 버전
  author: 'Your Name',                // 작성자
  category: 'inspector',              // 카테고리
  tier: 'free',                       // 티어 (free/pro)

  // 아이콘 그리기 함수
  drawIcon: (div: HTMLDivElement) => {
    div.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    div.innerHTML = '<svg>...</svg>';
    return div;
  },

  // 단축키 정의
  shortcuts: [
    {
      id: 'toggle-feature',
      name: 'Toggle Feature',
      description: 'Enable or disable the feature',
      defaultKey: {
        windows: 'Ctrl+Shift+T',
        mac: '⌘⇧T',
      },
      enabled: true,
    },
  ],

  // 설정 옵션 정의
  settingOptions: [
    {
      id: 'enableAutoSave',
      name: 'Enable Auto Save',
      description: 'Automatically save changes',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'theme',
      name: 'Theme',
      description: 'Select color theme',
      type: 'select',
      defaultValue: 'dark',
      options: [
        { label: 'Dark', value: 'dark' },
        { label: 'Light', value: 'light' },
      ],
    },
  ],
};
```

### 2. 플러그인 로직 구현 (🔥 권장 방식)

**`createPluginExecutor()` 헬퍼를 사용하면 보일러플레이트 코드가 자동으로 처리됩니다!**

```typescript
import type { Plugin } from '../types';
import { createPluginExecutor } from '../plugin-helper';

const myPlugin: Plugin = {
  meta,
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  // ✅ 핵심: createPluginExecutor로 래핑
  execute: createPluginExecutor('my-plugin', {
    // 1. 메인 로직 (필수)
    onActivate: (helpers) => {
      // 설정값 사용 - helpers에서 간편하게 가져오기
      const autoSave = helpers.getSetting('enableAutoSave', true);
      const theme = helpers.getSetting('theme', 'dark');

      console.log('Plugin activated with settings:', { autoSave, theme });

      // TODO: 실제 비즈니스 로직 구현
    },

    // 2. 설정 변경 시 (선택사항)
    onSettingsChange: (helpers) => {
      const newTheme = helpers.getSetting('theme', 'dark');
      console.log('Theme changed to:', newTheme);

      // TODO: UI 업데이트 로직
    },

    // 3. 단축키 핸들러 (선택사항)
    shortcuts: {
      'toggle-feature': (e, helpers) => {
        console.log('Toggle feature shortcut pressed');
        // TODO: 기능 토글 로직
      },
    },

    // 4. 정리 로직 (선택사항)
    onCleanup: () => {
      console.log('Cleanup');
      // TODO: 리소스 정리
    },
  }),
};

export default myPlugin;
```

**자동으로 처리되는 것들:**
- ✅ 설정 로드
- ✅ 활성화 상태 체크
- ✅ 설정 변경 감지 및 리스너 자동 등록/제거
- ✅ 단축키 핸들러 자동 등록/제거
- ✅ Cleanup 시 모든 리스너 자동 제거

**개발자가 작성할 것:**
- ✅ 비즈니스 로직만!

### 2-1. 기존 방식 (직접 작성)

필요하다면 여전히 직접 작성할 수 있지만, **권장하지 않습니다** (휴먼 에러 가능성).

```typescript
import type { Plugin } from '../types';

const myPlugin: Plugin = {
  meta,
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  execute: async (ctx) => {
    // ❌ 이런 보일러플레이트 코드를 매번 작성해야 함
    const { settingsManager } = await import('../settings-manager');
    const config = settingsManager.getPluginConfig('my-plugin');

    if (!config?.enabled) {
      return; // 비활성화된 경우 종료
    }

    const settings = config.settings || {};

    // 설정값 사용
    if (settings.enableAutoSave) {
      // auto save 로직
    }

    // 설정 변경 감지 - 매번 등록해야 함
    settingsManager.addChangeListener((appSettings) => {
      const newConfig = appSettings.plugins['my-plugin'];
      if (newConfig) {
        // 설정 변경 시 UI 업데이트
      }
    });

    // 단축키 핸들러 - 매번 등록해야 함
    document.addEventListener('keydown', (e) => {
      // 단축키 처리
    });
  },

  cleanup: () => {
    // 정리 로직 (이벤트 리스너 제거 등)
    // ❌ 모든 리스너를 수동으로 제거해야 함
  },
};

export default myPlugin;
```

### 3. 플러그인 등록

```typescript
import { pluginRegistry } from '@/plugins/registry';
import myPlugin from './implementations/my-plugin';

// background.ts 또는 main.ts에서
pluginRegistry.register(myPlugin);
```

## 🖥️ UI 컴포넌트

### Tools 페이지 (`entrypoints/options/pages/ToolsView.vue`)

모든 플러그인의 on/off 토글과 설정을 관리하는 페이지:

- ✅ 플러그인별 활성화/비활성화 토글
- ✅ 설정 옵션 실시간 편집
- ✅ Boolean, String, Number, Select 타입 지원
- ✅ Free/Pro 티어 뱃지 표시
- ✅ 실시간 설정 동기화

### Shortcuts 페이지 (`entrypoints/options/pages/ShortcutsView.vue`)

플러그인별 단축키를 관리하는 페이지:

- ✅ 플러그인별 단축키 목록 표시
- ✅ 단축키 활성화/비활성화 토글
- ✅ 커스텀 단축키 설정 다이얼로그
- ✅ 키보드 입력 캡처
- ✅ 단축키 리셋 (기본값으로 복원)
- ✅ Windows/Mac 플랫폼별 단축키

### ToggleSwitch 컴포넌트 (`components/ToggleSwitch.vue`)

재사용 가능한 토글 스위치:

```vue
<ToggleSwitch
  :model-value="enabled"
  @update:model-value="handleToggle"
/>
```

## 📊 설정 저장 구조

Chrome Storage에 저장되는 데이터 구조:

```typescript
{
  appSettings: {
    plugins: {
      'css-spy': {
        enabled: true,
        settings: {
          showComputedStyles: true,
          autoCopyOnClick: false,
          highlightColor: 'purple',
          maxProperties: 50
        },
        shortcuts: {
          'toggle-inspector': {
            enabled: true,
            customKey: {
              windows: 'Ctrl+Shift+K',
              mac: '⌘⇧K'
            }
          }
        }
      }
    }
  }
}
```

## 🔄 실시간 동기화

설정 변경 시 자동으로 동기화:

1. **Options 페이지에서 설정 변경**
   - `settingsManager.updatePluginSettings()` 호출
   - Chrome Storage에 저장
   - `storage.onChanged` 이벤트 발생

2. **Content Script에서 감지**
   - `settingsManager.addChangeListener()` 콜백 실행
   - 변경된 설정으로 UI 업데이트

3. **즉시 반영**
   - 페이지 새로고침 없이 즉시 적용

## 🎨 예제: CSS Spy 플러그인

완전한 예제는 `implementations/css-spy.example.ts` 파일을 참고하세요.

주요 특징:
- ✅ 5개의 단축키 (Toggle, Copy Property, Copy All, Navigate Up/Down)
- ✅ 6개의 설정 옵션 (Computed Styles, Auto-copy, Highlight, Color, Position, Max Properties)
- ✅ 실시간 설정 변경 감지
- ✅ Free 티어 플러그인

## 🚀 다음 단계

1. **CSS Spy 플러그인 완성**: 예제를 바탕으로 실제 기능 구현
2. **Background Script 통합**: 단축키 이벤트 처리
3. **Popup 연동**: PluginCard.vue에서 새로운 시스템 사용
4. **추가 플러그인 개발**: Color Suite, Ruler & Grid 등

## 📝 체크리스트

새 플러그인을 만들 때:

- [ ] `PluginMetaData` 정의 (ID, 이름, 아이콘, 단축키, 설정)
- [ ] `Plugin` 인터페이스 구현 (execute, cleanup)
- [ ] `pluginRegistry.register()` 호출
- [ ] Settings Manager 사용하여 설정 관리
- [ ] 설정 변경 리스너 등록
- [ ] 단축키 핸들러 구현
- [ ] Cleanup 로직 작성
- [ ] Options 페이지에서 테스트

---

**이제 플러그인을 쉽게 추가/제거할 수 있습니다! 🎉**