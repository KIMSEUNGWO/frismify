# 빠른 시작

5분 안에 첫 플러그인을 만들어보세요.

## 1. 플러그인 파일 생성

`plugins/implementations/my-plugin.ts` 파일을 생성합니다.

```typescript
import type { Plugin } from '../types';
import { createPluginExecutor } from '../plugin-helper';

const meta = {
  id: 'my-plugin',
  name: 'My Plugin',
  description: '내 첫 번째 플러그인',
  version: '1.0.0',
  author: 'Your Name',
  category: 'utility',
  tier: 'free' as const,

  drawIcon: (div: HTMLDivElement) => {
    div.style.background = '#8b5cf6';
    div.innerHTML = `<span style="color: white; font-size: 24px;">🚀</span>`;
    return div;
  },
};

const myPlugin: Plugin = {
  meta,
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  execute: createPluginExecutor('my-plugin', {
    onActivate: (helpers) => {
      console.log('플러그인 활성화!');
    },
  }),
};

export default myPlugin;
```

## 2. 플러그인 등록

`plugins/index.ts`에 플러그인을 추가합니다.

```typescript
import myPlugin from './implementations/my-plugin';

// 플러그인 등록
await pluginRegistry.register(myPlugin);
```

## 3. 빌드 및 테스트

```bash
npm run dev
```

브라우저에서 익스텐션을 리로드하고 Popup을 열어 플러그인을 확인합니다.

## 다음 단계

- [플러그인 구조](./02-plugin-structure.md) - 상세한 구조 이해
- [설정 옵션](./03-settings.md) - 사용자 설정 추가
- [단축키](./04-shortcuts.md) - 키보드 단축키 추가
- [예제](./06-examples.md) - 실전 예제 확인