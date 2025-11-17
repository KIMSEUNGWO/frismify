# 예제

실전에서 사용할 수 있는 플러그인 예제 모음입니다.

## 1. 간단한 플러그인

가장 기본적인 형태의 플러그인입니다.

```typescript
import type { Plugin } from '../types';
import { createPluginExecutor } from '../plugin-helper';

const meta = {
  id: 'simple-plugin',
  name: 'Simple Plugin',
  description: '간단한 예제 플러그인',
  version: '1.0.0',
  author: 'Your Name',
  category: 'utility',
  tier: 'free' as const,

  drawIcon: (div: HTMLDivElement) => {
    div.style.background = '#8b5cf6';
    div.innerHTML = '<span style="color: white;">🚀</span>';
    return div;
  },
};

const simplePlugin: Plugin = {
  meta,
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  execute: createPluginExecutor('simple-plugin', {
    onActivate: (helpers) => {
      console.log('플러그인 활성화!');
    },
  }),
};

export default simplePlugin;
```

## 2. 설정이 있는 플러그인

사용자 설정을 활용하는 플러그인입니다.

```typescript
import type { Plugin } from '../types';
import { createPluginExecutor } from '../plugin-helper';

const meta = {
  id: 'theme-changer',
  name: 'Theme Changer',
  description: '페이지 테마를 변경합니다',
  version: '1.0.0',
  author: 'Your Name',
  category: 'utility',
  tier: 'free' as const,

  drawIcon: (div: HTMLDivElement) => {
    div.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    div.innerHTML = '<span style="color: white;">🎨</span>';
    return div;
  },

  settingOptions: [
    {
      id: 'mode',
      name: '모드',
      description: '테마 모드를 선택하세요',
      type: 'select',
      defaultValue: 'dark',
      options: [
        { label: '다크', value: 'dark' },
        { label: '라이트', value: 'light' },
        { label: '자동', value: 'auto' },
      ],
    },
    {
      id: 'autoApply',
      name: '자동 적용',
      description: '페이지 로드 시 자동으로 테마 적용',
      type: 'boolean',
      defaultValue: true,
    },
  ],
};

const themeChangerPlugin: Plugin = {
  meta,
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  execute: createPluginExecutor('theme-changer', {
    onActivate: (helpers) => {
      const mode = helpers.getSetting('mode', 'dark');
      const autoApply = helpers.getSetting('autoApply', true);

      if (autoApply) {
        applyTheme(mode);
      }
    },

    onSettingsChange: (helpers) => {
      const mode = helpers.getSetting('mode', 'dark');
      applyTheme(mode);
    },
  }),
};

function applyTheme(mode: string) {
  document.documentElement.setAttribute('data-theme', mode);
}

export default themeChangerPlugin;
```

## 3. 단축키가 있는 플러그인

키보드 단축키를 사용하는 플러그인입니다.

```typescript
import type { Plugin } from '../types';
import { createPluginExecutor } from '../plugin-helper';

const meta = {
  id: 'screenshot-tool',
  name: 'Screenshot Tool',
  description: '화면을 캡처합니다',
  version: '1.0.0',
  author: 'Your Name',
  category: 'utility',
  tier: 'free' as const,

  drawIcon: (div: HTMLDivElement) => {
    div.style.background = '#10b981';
    div.innerHTML = '<span style="color: white;">📸</span>';
    return div;
  },

  shortcuts: [
    {
      id: 'capture-full',
      name: '전체 화면 캡처',
      description: '전체 화면을 캡처합니다',
      defaultKey: {
        windows: 'Ctrl+Shift+S',
        mac: '⌘⇧S',
      },
      enabled: true,
    },
    {
      id: 'capture-area',
      name: '영역 캡처',
      description: '선택한 영역을 캡처합니다',
      defaultKey: {
        windows: 'Ctrl+Shift+A',
        mac: '⌘⇧A',
      },
      enabled: true,
    },
  ],
};

const screenshotToolPlugin: Plugin = {
  meta,
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  execute: createPluginExecutor('screenshot-tool', {
    onActivate: (helpers) => {
      console.log('Screenshot Tool 활성화');
    },

    shortcuts: {
      'capture-full': (event, helpers) => {
        console.log('전체 화면 캡처 시작');
        captureFullScreen();
      },

      'capture-area': (event, helpers) => {
        console.log('영역 캡처 시작');
        captureArea();
      },
    },
  }),
};

function captureFullScreen() {
  // 전체 화면 캡처 로직
}

function captureArea() {
  // 영역 캡처 로직
}

export default screenshotToolPlugin;
```

## 4. 완전한 기능을 갖춘 플러그인

설정, 단축키, 변경 감지를 모두 사용하는 플러그인입니다.

```typescript
import type { Plugin } from '../types';
import { createPluginExecutor } from '../plugin-helper';

const meta = {
  id: 'element-inspector',
  name: 'Element Inspector',
  description: 'HTML 요소를 검사합니다',
  version: '1.0.0',
  author: 'Your Name',
  category: 'inspector',
  tier: 'free' as const,

  drawIcon: (div: HTMLDivElement) => {
    div.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    div.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
      </svg>
    `;
    return div;
  },

  settingOptions: [
    {
      id: 'showTooltip',
      name: '툴팁 표시',
      description: '요소 정보를 툴팁으로 표시',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'highlightColor',
      name: '하이라이트 색상',
      description: '선택한 요소의 하이라이트 색상',
      type: 'select',
      defaultValue: 'blue',
      options: [
        { label: '파란색', value: 'blue' },
        { label: '초록색', value: 'green' },
        { label: '빨간색', value: 'red' },
      ],
    },
  ],

  shortcuts: [
    {
      id: 'toggle-inspector',
      name: '검사 모드 토글',
      description: '검사 모드를 켜고 끕니다',
      defaultKey: {
        windows: 'Ctrl+Shift+I',
        mac: '⌘⇧I',
      },
      enabled: true,
    },
    {
      id: 'copy-info',
      name: '정보 복사',
      description: '선택한 요소의 정보를 복사합니다',
      defaultKey: {
        windows: 'Ctrl+C',
        mac: '⌘C',
      },
      enabled: true,
    },
  ],
};

const elementInspectorPlugin: Plugin = {
  meta,
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  execute: createPluginExecutor('element-inspector', {
    onActivate: (helpers) => {
      // 설정 읽기
      const showTooltip = helpers.getSetting('showTooltip', true);
      const highlightColor = helpers.getSetting('highlightColor', 'blue');

      // Inspector 인스턴스 생성
      const inspector = createInspector({
        showTooltip,
        highlightColor,
      });

      // 전역 저장 (단축키에서 사용)
      (window as any).__inspector = inspector;
    },

    onSettingsChange: (helpers) => {
      // 설정 변경 시 Inspector 업데이트
      const inspector = (window as any).__inspector;
      if (!inspector) return;

      const showTooltip = helpers.getSetting('showTooltip', true);
      const highlightColor = helpers.getSetting('highlightColor', 'blue');

      inspector.updateSettings({ showTooltip, highlightColor });
    },

    shortcuts: {
      'toggle-inspector': (event, helpers) => {
        const inspector = (window as any).__inspector;
        if (!inspector) return;

        inspector.toggle();
      },

      'copy-info': (event, helpers) => {
        const inspector = (window as any).__inspector;
        if (!inspector) return;

        const info = inspector.getSelectedElementInfo();
        if (info) {
          navigator.clipboard.writeText(JSON.stringify(info, null, 2));
          console.log('정보 복사 완료');
        }
      },
    },

    onCleanup: () => {
      const inspector = (window as any).__inspector;
      if (inspector) {
        inspector.destroy();
        delete (window as any).__inspector;
      }
    },
  }),
};

// Inspector 생성 함수
function createInspector(options: any) {
  let isActive = false;
  let selectedElement: HTMLElement | null = null;

  return {
    toggle() {
      isActive = !isActive;
      console.log('Inspector:', isActive ? '활성화' : '비활성화');
    },

    updateSettings(newOptions: any) {
      Object.assign(options, newOptions);
      console.log('설정 업데이트:', options);
    },

    getSelectedElementInfo() {
      if (!selectedElement) return null;

      return {
        tag: selectedElement.tagName,
        id: selectedElement.id,
        classes: Array.from(selectedElement.classList),
        attributes: Array.from(selectedElement.attributes).map(attr => ({
          name: attr.name,
          value: attr.value,
        })),
      };
    },

    destroy() {
      isActive = false;
      selectedElement = null;
      console.log('Inspector 제거됨');
    },
  };
}

export default elementInspectorPlugin;
```

## 5. 특정 사이트 전용 플러그인

특정 웹사이트에서만 동작하는 플러그인입니다.

```typescript
import type { Plugin } from '../types';
import { createPluginExecutor } from '../plugin-helper';

const meta = {
  id: 'github-enhancer',
  name: 'GitHub Enhancer',
  description: 'GitHub 사용성을 개선합니다',
  version: '1.0.0',
  author: 'Your Name',
  category: 'utility',
  tier: 'free' as const,

  drawIcon: (div: HTMLDivElement) => {
    div.style.background = '#24292e';
    div.innerHTML = '<span style="color: white;">🐙</span>';
    return div;
  },

  settingOptions: [
    {
      id: 'autoExpandDiff',
      name: 'Diff 자동 펼치기',
      description: 'PR의 파일 변경사항을 자동으로 펼칩니다',
      type: 'boolean',
      defaultValue: true,
    },
  ],
};

const githubEnhancerPlugin: Plugin = {
  meta,
  matches: ['https://github.com/*'],  // GitHub에서만 실행
  runAt: 'document_idle',

  execute: createPluginExecutor('github-enhancer', {
    onActivate: (helpers) => {
      const autoExpandDiff = helpers.getSetting('autoExpandDiff', true);

      if (autoExpandDiff) {
        expandAllDiffs();
      }
    },
  }),
};

function expandAllDiffs() {
  const buttons = document.querySelectorAll('[data-load-diff-button]');
  buttons.forEach(button => (button as HTMLElement).click());
}

export default githubEnhancerPlugin;
```