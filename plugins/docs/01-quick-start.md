# 빠른 시작

5분 안에 첫 플러그인을 만들어보세요.

## 1. 플러그인 파일 생성

`plugins/implementations/my-plugin/index.ts` 파일을 생성합니다.

```typescript
import type { Plugin } from '@/types';

export const myPlugin: Plugin = {
  // === 메타데이터 ===
  id: 'my-plugin',
  name: 'My First Plugin',
  description: '내 첫 번째 플러그인',
  category: 'utility',
  version: '1.0.0',
  tier: 'free',

  // 아이콘 렌더링
  icon: (container) => {
    container.style.background = 'linear-gradient(135deg, #8B5CF6, #EC4899)';
    container.innerHTML = '<span style="color: white; font-size: 20px;">🚀</span>';
  },

  // === 실행 로직 ===
  onActivate: async (ctx) => {
    console.log('플러그인 활성화!');

    // 페이지에 메시지 표시
    const div = document.createElement('div');
    div.id = 'my-plugin-message';
    div.textContent = 'My Plugin is active!';
    div.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #8B5CF6;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 999999;
      font-family: sans-serif;
    `;
    document.body.appendChild(div);
  },

  onCleanup: () => {
    console.log('플러그인 정리');
    document.getElementById('my-plugin-message')?.remove();
  },
};
```

## 2. 플러그인 등록

`plugins/index.ts`에서 플러그인을 `allPlugins` 배열에 추가합니다.

```typescript
import { PluginManager } from '@/core';
import type { Plugin } from '@/types';
import { examplePlugin } from './implementations/example';
import { myPlugin } from './implementations/my-plugin'; // 추가

// 모든 플러그인 정의 배열
export const allPlugins: Plugin[] = [
  examplePlugin,
  myPlugin,  // 추가
  // 다른 플러그인들...
];

export async function registerPlugins(): Promise<void> {
  const manager = PluginManager.getInstance();

  for (const plugin of allPlugins) {
    await manager.register(plugin);
  }

  console.log(`[Plugins] ${manager.getPluginCount()} plugins registered`);
}
```

## 3. 빌드 및 테스트

```bash
npm run dev
```

브라우저에서 익스텐션을 리로드하고:
1. Options 페이지를 열어 "Tools" 메뉴로 이동
2. "My First Plugin" 플러그인을 찾아 토글 스위치로 활성화
3. 웹 페이지를 새로고침하면 우측 상단에 메시지가 표시됩니다

## 다음 단계

- [플러그인 구조](./02-plugin-structure.md) - 상세한 구조 이해
- [설정 스키마](./03-settings.md) - 사용자 설정 추가
- [단축키](./04-shortcuts.md) - 키보드 단축키 추가
- [예제 모음](./06-examples.md) - 실전 예제 확인

## 주요 개념

### onActivate vs onExecute

**onActivate** (지속적 동작)
- 플러그인이 enabled 상태일 때 자동 실행
- 페이지 로드 시마다 호출
- 지속적으로 동작하는 기능에 적합
- 예: Grid Overlay, CSS Spy
- **반드시 onCleanup 정의 필요**

**onExecute** (일회성 실행)
- 사용자가 버튼 클릭 또는 단축키로 실행
- enabled 상태 불필요
- 일회성 동작에 적합
- 예: Color Picker, Screenshot
- onCleanup 불필요

### 플러그인 라이프사이클

#### 활성화 기반 플러그인
```
사용자 토글 ON (Options)
  ↓
Background: PluginManager.enablePlugin()
  ↓
Content Script: 상태 변경 감지
  ↓
Content Script: plugin.onActivate() 호출
  ↓
플러그인 동작 (DOM 조작, 이벤트 리스너 등)

사용자 토글 OFF
  ↓
Content Script: plugin.onCleanup() 호출
  ↓
Background: PluginManager.disablePlugin()
```

#### 실행 기반 플러그인
```
사용자 버튼 클릭 (Popup) / 단축키
  ↓
Background: EXECUTE_PLUGIN 메시지
  ↓
Content Script: plugin.onExecute.execute() 호출
  ↓
일회성 동작 실행
```

## 아키텍처 이해

### Background (Single Source of Truth)
- 모든 플러그인 상태 관리
- Chrome Storage에 상태 저장
- 다른 컨텍스트에 상태 브로드캐스트

### Content Script (실행 주체)
- Background에서 상태를 구독
- 플러그인 로직 실행 (onActivate, onExecute)
- 각 탭마다 독립적인 실행 인스턴스

### Popup/Options (UI)
- Background에서 상태를 구독
- 플러그인 활성화/비활성화
- 설정값 변경

## 팁

### 1. 개발 중 로그 확인

```typescript
{
  onActivate: async (ctx) => {
    console.log('[My Plugin] Activated');
    console.log('Context:', ctx);
  },
}
```

### 2. DOM 요소 정리 필수

```typescript
{
  onActivate: async (ctx) => {
    const element = document.createElement('div');
    element.id = 'my-plugin-ui';
    document.body.appendChild(element);
  },
  onCleanup: () => {
    // 반드시 정리!
    document.getElementById('my-plugin-ui')?.remove();
  }
}
```

### 3. 에러 처리

```typescript
{
  onActivate: async (ctx) => {
    try {
      // 플러그인 로직
    } catch (error) {
      console.error('[My Plugin] Error:', error);
    }
  }
}
```

### 4. 상태 확인

Options 페이지 Tools 메뉴에서:
- 플러그인 목록 확인
- enabled/disabled 상태 확인
- 설정값 변경

### 5. Hot Reload

개발 중에는 `npm run dev`로 빌드하면:
- 파일 변경 시 자동 리빌드
- 브라우저에서 익스텐션 자동 리로드
- 웹페이지 새로고침하면 변경사항 반영