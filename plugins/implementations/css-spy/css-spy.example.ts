import type { Plugin } from '@/types';
import { ContentScriptContext } from 'wxt/utils/content-script-context';
import { PluginManager } from '@/core';

/**
 * CSS Spy 플러그인 예제
 *
 * 이 파일은 새로운 단순화된 플러그인 시스템을 보여주는 예제입니다.
 *
 * ✅ 주요 특징:
 * - 간단한 플랫 구조
 * - 타입 안전성
 * - 명확한 라이프사이클
 * - 설정값은 PluginManager를 통해 접근
 *
 * ✅ 개발자가 작성할 것:
 * - 비즈니스 로직만!
 */

const cssSpyPluginExample: Plugin = {
  // === 메타데이터 ===
  id: 'css-spy-example',
  name: 'CSS Spy Example',
  description: 'Inspect and analyze CSS properties of any element on the page',
  category: 'inspector',
  version: '1.0.0',
  tier: 'pro',

  // 아이콘
  icon: (div: HTMLDivElement) => {
    div.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    div.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="white" style="margin: 8px;">
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
      </svg>
    `;
  },

  // === 설정 스키마 ===
  settings: {
    showComputedStyles: {
      type: 'boolean',
      label: 'Show Computed Styles',
      description: 'Display computed CSS values instead of declared values',
      defaultValue: true,
    },
    autoCopyOnClick: {
      type: 'boolean',
      label: 'Auto-copy on Click',
      description: 'Automatically copy CSS property to clipboard when clicked',
      defaultValue: false,
    },
    highlightElement: {
      type: 'boolean',
      label: 'Highlight Element',
      description: 'Show visual highlight around inspected element',
      defaultValue: true,
    },
    highlightColor: {
      type: 'select',
      label: 'Highlight Color',
      description: 'Color for element highlighting',
      defaultValue: 'purple',
      options: [
        { label: 'Purple', value: 'purple' },
        { label: 'Blue', value: 'blue' },
        { label: 'Green', value: 'green' },
        { label: 'Red', value: 'red' },
      ],
    },
    panelPosition: {
      type: 'select',
      label: 'Panel Position',
      description: 'Position of the CSS inspector panel',
      defaultValue: 'bottom-right',
      options: [
        { label: 'Bottom Right', value: 'bottom-right' },
        { label: 'Bottom Left', value: 'bottom-left' },
        { label: 'Top Right', value: 'top-right' },
        { label: 'Top Left', value: 'top-left' },
      ],
    },
    maxProperties: {
      type: 'number',
      label: 'Max Properties',
      description: 'Maximum number of CSS properties to display',
      defaultValue: 50,
    },
  },

  // === 단축키 ===
  shortcuts: {
    'toggle-inspector': {
      name: 'Toggle CSS inspection mode',
      description: 'Enable or disable CSS inspection',
      keys: ['Cmd', 'Shift', 'I'],
      handler: async (event: KeyboardEvent, ctx: ContentScriptContext) => {
        console.log('🔄 Toggle inspector');
        // TODO: Inspector on/off 토글
      },
    },
  },

  // === 실행 설정 ===
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  // === 라이프사이클 ===
  onActivate: async (ctx: ContentScriptContext) => {
    console.log('✅ CSS Spy activated!');

    // 설정값 가져오기 - PluginManager를 통해 접근
    const manager = PluginManager.getInstance();
    const settings = await manager.getSettings('css-spy-example');

    console.log('📋 Settings:', settings);

    // 설정 변경 감지
    manager.addListener(async (state) => {
      const newSettings = state.plugins['css-spy-example']?.settings;
      if (newSettings) {
        console.log('⚙️ Settings changed:', newSettings);

        // TODO: UI 업데이트 로직
        // - 패널 위치 변경
        // - 하이라이트 색상 변경
        // - etc.
      }
    });

    // TODO: 실제 CSS Spy UI 생성 및 로직 구현
    // - Inspector 패널 생성
    // - 요소 hover 이벤트 등록
    // - CSS 속성 표시
    // - etc.
  },

  onCleanup: () => {
    console.log('🧹 CSS Spy cleanup');
    // TODO: UI 제거, 이벤트 리스너 제거 등
  },
};

export default cssSpyPluginExample;
