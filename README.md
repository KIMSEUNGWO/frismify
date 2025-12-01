# Prismify - Frontend Dev Toolkit

**프론트엔드 개발자를 위한 올인원 툴킷**

Prismify는 플러그인 기반 브라우저 확장 프로그램으로, 개발자들에게 필요한 다양한 도구를 제공합니다.

## 🚀 Quick Start

```bash
# 개발 모드 실행 (Chrome)
npm run dev

# 개발 모드 실행 (Firefox)
npm run dev:firefox

# 프로덕션 빌드
npm run build

# 배포용 zip 파일 생성
npm run zip
```

## 📦 프로젝트 구조

```
prismify/
├── core/                    # 핵심 아키텍처
│   ├── PluginManager.ts    # 플러그인 통합 관리 (Facade)
│   ├── ShortcutManager.ts  # 단축키 관리
│   ├── StorageManager.ts   # 스토리지 관리
│   └── index.ts            # Core 모듈 export
│
├── plugins/                 # 플러그인들
│   ├── implementations/     # 플러그인 구현
│   │   └── example/        # 예제 플러그인
│   └── index.ts            # 플러그인 등록
│
├── entrypoints/            # WXT 엔트리포인트
│   ├── background.ts       # Background script
│   ├── content/            # Content script
│   ├── popup/              # Popup UI
│   └── options/            # Options 페이지
│
├── utils/                  # 유틸리티
│   └── platform.ts         # 플랫폼 감지
│
├── types.ts                # 전역 타입 정의
└── wxt.config.ts           # WXT 설정
```

## 🏗️ 아키텍처 설계 원칙

### 1. **Facade Pattern** - 단일 진입점
모든 플러그인 관련 작업은 `PluginManager`를 통해서만 수행됩니다.

```typescript
import { PluginManager } from '@/core';

const manager = PluginManager.getInstance();

// 플러그인 관리
await manager.register(myPlugin);
await manager.togglePlugin('plugin-id');
const plugins = manager.getPlugins();

// 설정 관리
await manager.updateSetting('plugin-id', 'setting-key', value);
const settings = await manager.getSettings('plugin-id');

// 라이프사이클 관리
await manager.activate('plugin-id', ctx);
await manager.cleanup('plugin-id');
```

### 2. **Singleton Pattern** - 일관된 인스턴스
모든 컨텍스트(Background, Content Script, Popup, Options)에서 동일한 인스턴스를 사용합니다.

```typescript
// Background
const manager = PluginManager.getInstance(); // 인스턴스 A

// Content Script
const manager = PluginManager.getInstance(); // 동일한 인스턴스 A

// Popup
const manager = PluginManager.getInstance(); // 동일한 인스턴스 A
```

### 3. **캡슐화** - 최소한의 Public API
각 모듈은 내부 구현을 숨기고 필요한 메서드만 노출합니다.

```typescript
// ❌ 기존: 여러 모듈에 직접 접근
import { pluginRegistry } from '@/plugins/registry';
import { settingsManager } from '@/utils/settings-manager';
import { localStorage } from '@/utils/localStorage';

// ✅ 새로운: PluginManager만 사용
import { PluginManager } from '@/core';
const manager = PluginManager.getInstance();
```

### 4. **단순화** - 불필요한 데이터 구조 제거

#### 기존 (복잡):
```typescript
interface Plugin {
  meta: PluginMetaData;
  executor: PluginExecutor;
  settingOptions?: PluginSettingOption[];
  shortcuts?: PluginShortcut[];
}

interface PluginMetaData { ... }
interface PluginExecutor { ... }
interface PluginSettingOption { ... }
interface PluginShortcut { ... }
interface PluginConfig { ... }
interface PluginSettings { ... }
```

#### 새로운 (간결):
```typescript
interface Plugin {
  // 메타데이터
  id: string;
  name: string;
  description: string;
  category: string;
  tier: 'free' | 'pro';

  // 실행 로직
  onActivate?: (ctx) => void;
  onCleanup?: () => void;

  // 설정 스키마
  settings?: { [key: string]: PluginSetting };

  // 단축키
  shortcuts?: { [id: string]: PluginShortcut };
}
```

## 📚 핵심 모듈 상세

### PluginManager (통합 관리자)

**역할:**
- 플러그인 등록/조회
- 플러그인 활성화/비활성화
- 플러그인 설정 관리
- 플러그인 라이프사이클 관리
- Chrome Commands 생성

**주요 메서드:**

```typescript
class PluginManager {
  // 플러그인 등록/조회
  async register(plugin: Plugin): Promise<void>
  getPlugins(): Plugin[]
  getPlugin(id: string): Plugin | undefined
  getPluginsByCategory(category: string): Plugin[]

  // 상태 관리
  async togglePlugin(pluginId: string): Promise<void>
  async enablePlugin(pluginId: string): Promise<void>
  async disablePlugin(pluginId: string): Promise<void>
  async isEnabled(pluginId: string): Promise<boolean>
  async getEnabledPlugins(): Promise<Plugin[]>

  // 설정 관리
  async getSettings(pluginId: string): Promise<Record<string, any>>
  async updateSetting(pluginId: string, key: string, value: any): Promise<void>
  async getPluginState(pluginId: string): Promise<PluginState | undefined>

  // 라이프사이클
  async activate(pluginId: string, ctx: ContentScriptContext): Promise<void>
  async cleanup(pluginId: string): Promise<void>
  async cleanupAll(): Promise<void>

  // 단축키
  getCommands(): Record<string, any>
  parseCommand(commandName: string): { pluginId, shortcutId } | null
  async handleCommand(commandName: string, ctx): Promise<void>

  // 리스너
  addListener(listener: (state: AppState) => void): void
  removeListener(listener: (state: AppState) => void): void
}
```

### ShortcutManager (단축키 관리자)

**역할:**
- 단축키 매칭
- 단축키 포매팅 (Mac/Windows)
- Chrome Commands API 커맨드 생성

**주요 메서드:**

```typescript
class ShortcutManager {
  // 단축키 매칭
  matches(event: KeyboardEvent, keys: ShortcutKey[]): boolean

  // 포매팅
  format(keys: ShortcutKey[]): string
  // Mac:     ⌘⇧P
  // Windows: Ctrl + Shift + P

  // Chrome Commands API
  toCommand(keys: ShortcutKey[]): { windows: string; mac: string }

  // 유효성 검사
  isValid(keys: ShortcutKey[]): boolean
}
```

### StorageManager (스토리지 관리자)

**역할:**
- `browser.storage.local` 래핑
- 타입 안전성
- 변경 감지 리스너

**주요 메서드:**

```typescript
class StorageManager {
  // 상태 관리
  async getState(): Promise<AppState>
  async setState(state: AppState): Promise<void>
  async updateState(updater: (state) => AppState): Promise<void>

  // 리스너
  addListener(listener: (state: AppState) => void): void
  removeListener(listener: (state: AppState) => void): void

  // 유틸리티
  async clear(): Promise<void>
}
```

## 🔌 플러그인 개발 가이드

### 플러그인 생성

1. `plugins/implementations/` 폴더에 새 디렉토리 생성
2. `index.ts` 파일에 플러그인 구현
3. `plugins/index.ts`에서 플러그인 등록

**예제:**

```typescript
// plugins/implementations/my-plugin/index.ts

import type { Plugin } from '@/types';

export const myPlugin: Plugin = {
  // === 메타데이터 ===
  id: 'my-plugin',
  name: 'My Plugin',
  description: '플러그인 설명',
  category: 'utility',
  version: '1.0.0',
  tier: 'free',

  // 아이콘 렌더링 함수
  icon: (container) => {
    container.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    container.innerHTML = '<svg>...</svg>';
  },

  // === 실행 설정 ===
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  // === 설정 스키마 ===
  settings: {
    enabled: {
      type: 'boolean',
      label: 'Enable feature',
      description: 'Enable or disable this feature',
      defaultValue: true,
    },
    color: {
      type: 'string',
      label: 'Color',
      defaultValue: '#FF0000',
    },
    count: {
      type: 'number',
      label: 'Count',
      defaultValue: 10,
    },
    mode: {
      type: 'select',
      label: 'Mode',
      defaultValue: 'auto',
      options: [
        { label: 'Auto', value: 'auto' },
        { label: 'Manual', value: 'manual' },
      ],
    },
  },

  // === 단축키 ===
  shortcuts: {
    toggle: {
      name: 'Toggle Plugin',
      description: 'Toggle plugin on/off',
      keys: ['Cmd', 'Shift', 'P'],
      handler: async (event, ctx) => {
        console.log('단축키 실행!');
        // 단축키 로직
      },
    },
  },

  // === 라이프사이클 ===
  onActivate: async (ctx) => {
    console.log('플러그인 활성화!');

    // 플러그인 로직
    const element = document.createElement('div');
    element.id = 'my-plugin-element';
    document.body.appendChild(element);
  },

  onCleanup: () => {
    console.log('플러그인 정리!');

    // 정리 로직
    const element = document.getElementById('my-plugin-element');
    element?.remove();
  },
};
```

```typescript
// plugins/index.ts

import { PluginManager } from '@/core';
import { myPlugin } from './implementations/my-plugin';

export async function registerPlugins(): Promise<void> {
  const manager = PluginManager.getInstance();

  await manager.register(myPlugin);
  // 추가 플러그인 등록...

  console.log(`[Plugins] ${manager.getPluginCount()} plugins registered`);
}
```

### 플러그인에서 설정 사용하기

플러그인 내에서 설정값에 접근하려면 `PluginManager`를 사용합니다:

```typescript
onActivate: async (ctx) => {
  const manager = PluginManager.getInstance();
  const settings = await manager.getSettings('my-plugin');

  console.log('Enabled:', settings.enabled);
  console.log('Color:', settings.color);
  console.log('Count:', settings.count);
  console.log('Mode:', settings.mode);

  // 설정 변경 감지
  manager.addListener((state) => {
    const newSettings = state.plugins['my-plugin']?.settings;
    if (newSettings) {
      console.log('Settings changed:', newSettings);
    }
  });
},
```

## 🔄 컨텍스트별 사용법

### Background Script

```typescript
import { PluginManager } from '@/core';
import { registerPlugins } from '@/plugins';

export default defineBackground(async () => {
  const manager = PluginManager.getInstance();

  // 플러그인 등록
  await registerPlugins();

  // 메시지 처리
  browser.runtime.onMessage.addListener(async (message) => {
    if (message.type === 'TOGGLE_PLUGIN') {
      await manager.togglePlugin(message.pluginId);
    }
  });
});
```

### Content Script

```typescript
import { PluginManager, ShortcutManager } from '@/core';
import { registerPlugins } from '@/plugins';

export default defineContentScript({
  matches: ['<all_urls>'],
  async main(ctx) {
    const manager = PluginManager.getInstance();

    // 플러그인 등록
    await registerPlugins();

    // 활성화된 플러그인 실행
    for (const plugin of manager.getPlugins()) {
      if (await manager.isEnabled(plugin.id)) {
        await manager.activate(plugin.id, ctx);
      }
    }

    // 정리
    ctx.onInvalidated(async () => {
      await manager.cleanupAll();
    });
  },
});
```

### Popup / Options

```typescript
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { PluginManager } from '@/core';

const manager = PluginManager.getInstance();
const plugins = ref([]);

onMounted(async () => {
  plugins.value = manager.getPlugins();
});

async function togglePlugin(pluginId: string) {
  await manager.togglePlugin(pluginId);
}
</script>
```

## 🎯 장점 요약

### 기존 아키텍처의 문제점:
1. ❌ 불필요한 데이터 구조 중복 (Plugin, PluginMetaData, PluginExecutor...)
2. ❌ 강한 결합도 (Registry ↔ SettingsManager ↔ localStorage)
3. ❌ 책임 분산 (각 모듈이 너무 많은 일 담당)
4. ❌ 복잡한 초기화 (여러 곳에서 initialize() 호출 필요)
5. ❌ 일관성 부족 (싱글톤 패턴이 일부에만 적용)

### 새로운 아키텍처의 해결책:
1. ✅ **간소화된 타입** - Plugin 하나로 통합
2. ✅ **낮은 결합도** - PluginManager가 내부 구현 캡슐화
3. ✅ **단일 책임** - 각 모듈이 하나의 역할만 담당
4. ✅ **쉬운 사용** - 모든 컨텍스트에서 동일한 API
5. ✅ **일관된 싱글톤** - 모든 관리자 클래스가 싱글톤
6. ✅ **자동 초기화** - PluginManager가 알아서 처리
7. ✅ **타입 안전성** - TypeScript로 모든 타입 정의

## 📖 추가 문서

- [CLAUDE.md](./CLAUDE.md) - Claude Code를 위한 프로젝트 가이드
- [PLUGIN.md](./PLUGIN.md) - 플러그인 로드맵
- [PRODUCE.md](./PRODUCE.md) - 비즈니스 전략

## 🛠️ 개발 팁

### 타입 체크
```bash
npm run compile
```

### 디버깅
```typescript
const manager = PluginManager.getInstance();
const debugInfo = await manager.getDebugInfo();
console.log(debugInfo);
```

### 스토리지 초기화
```typescript
const storage = StorageManager.getInstance();
await storage.clear(); // 주의: 모든 데이터 삭제!
```

## 📝 라이선스

MIT License

## 👥 기여

기여를 환영합니다! Pull Request를 보내주세요.

---

Made with ❤️ by Prismify Team
