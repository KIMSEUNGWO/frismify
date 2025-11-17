# 플러그인 구조

플러그인은 메타데이터와 실행 로직으로 구성됩니다.

## 기본 구조

```typescript
import type { Plugin } from '../types';
import { createPluginExecutor } from '../plugin-helper';

const meta: PluginMetaData = {
  // 메타데이터
};

const plugin: Plugin = {
  meta,
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  execute: createPluginExecutor('plugin-id', {
    // 실행 로직
  }),
};

export default plugin;
```

## PluginMetaData

### 필수 필드

```typescript
{
  id: 'unique-id',              // 고유 ID (kebab-case)
  name: 'Plugin Name',          // 표시 이름
  description: '설명',           // 간단한 설명
  version: '1.0.0',             // 버전 (SemVer)
  author: 'Author Name',        // 제작자 (현재는 모두 prismify)
  category: 'utility',          // 카테고리
  tier: 'free',                 // 'free' | 'pro'
  drawIcon: (div) => div,       // 아이콘 렌더링 함수
}
```

### 선택적 필드

```typescript
{
  settingOptions: [...],  // 설정 옵션 (03-settings.md 참고)
  shortcuts: [...],       // 단축키 (04-shortcuts.md 참고)
}
```

## Plugin

### matches

플러그인이 실행될 URL 패턴을 지정합니다.

```typescript
matches: ['<all_urls>']           // 모든 페이지
matches: ['https://*.google.com/*']  // 구글 도메인
matches: ['https://github.com/*']    // 특정 사이트
```

### runAt

Content Script 실행 시점을 지정합니다.

```typescript
runAt: 'document_start'  // DOM 로드 전
runAt: 'document_end'    // DOM 로드 후, 이미지/스타일시트 로드 전
runAt: 'document_idle'   // 페이지 완전히 로드 후 (권장)
```

### execute

플러그인 실행 함수입니다. `createPluginExecutor`를 사용하는 것을 권장합니다.

```typescript
execute: createPluginExecutor('plugin-id', {
  onActivate: (helpers) => {
    // 플러그인 활성화 시 실행
  },
  onSettingsChange: (helpers) => {
    // 설정 변경 시 실행 (선택사항)
  },
  shortcuts: {
    // 단축키 핸들러 (선택사항)
  },
  onCleanup: () => {
    // 정리 로직 (선택사항)
  },
})
```

## drawIcon

아이콘을 렌더링하는 함수입니다.

### 그라데이션 배경

```typescript
drawIcon: (div: HTMLDivElement) => {
  div.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  return div;
}
```

### SVG 아이콘

```typescript
drawIcon: (div: HTMLDivElement) => {
  div.style.background = '#8b5cf6';
  div.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
      <path d="M12 2L2 7v10c0 5.5 3.8 10.7 10 12 6.2-1.3 10-6.5 10-12V7l-10-5z"/>
    </svg>
  `;
  return div;
}
```

### 이모지

```typescript
drawIcon: (div: HTMLDivElement) => {
  div.style.background = '#10b981';
  div.innerHTML = '<span style="font-size: 24px;">🎨</span>';
  return div;
}
```

## 카테고리

플러그인 카테고리는 자유롭게 정의할 수 있습니다.

권장 카테고리:
- `inspector` - 검사 도구
- `color` - 색상 관련
- `typography` - 타이포그래피
- `layout` - 레이아웃
- `utility` - 유틸리티
- `accessibility` - 접근성
- `performance` - 성능