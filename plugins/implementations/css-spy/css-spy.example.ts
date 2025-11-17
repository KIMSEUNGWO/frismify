import type { Plugin, PluginMetaData } from '../../types';
import { createPluginExecutor, type PluginHelpers } from '../../../utils/plugin-helper';

/**
 * CSS Spy 플러그인 예제
 *
 * 이 파일은 새로운 플러그인 시스템을 사용하는 방법을 보여주는 예제입니다.
 * createPluginExecutor()를 사용하면 공통 로직이 자동으로 처리됩니다.
 *
 * ✅ 자동 처리:
 * - 설정 로드
 * - 활성화 상태 체크
 * - 설정 변경 감지
 * - 단축키 핸들러 등록
 *
 * ✅ 개발자가 작성할 것:
 * - 비즈니스 로직만!
 */

// 플러그인 메타데이터 정의
const meta: PluginMetaData = {
  id: 'css-spy',
  name: 'CSS Spy2',
  description: 'Inspect and analyze CSS properties of any element on the page',
  version: '1.0.0',
  author: 'Prismify Team',
  category: 'inspector',
  tier: 'pro',

  // 아이콘 그리기 함수
  drawIcon: (div: HTMLDivElement) => {
    div.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    div.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="white" style="margin: 8px;">
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
      </svg>
    `;
    return div;
  },

  // 여러 단축키 정의
  shortcuts: [
    {
      id: 'toggle-inspector',
      name: 'Toggle CSS inspection mode',
      description: 'Enable or disable CSS inspection',
      key: ['Cmd', 'Shift', 'I'],
      enabled: true,
    },
  ],

  // 설정 옵션들 정의
  settingOptions: [
    {
      id: 'showComputedStyles',
      name: 'Show Computed Styles',
      description: 'Display computed CSS values instead of declared values',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'autoCopyOnClick',
      name: 'Auto-copy on Click',
      description: 'Automatically copy CSS property to clipboard when clicked',
      type: 'boolean',
      defaultValue: false,
    },
    {
      id: 'highlightElement',
      name: 'Highlight Element',
      description: 'Show visual highlight around inspected element',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'highlightColor',
      name: 'Highlight Color',
      description: 'Color for element highlighting',
      type: 'select',
      defaultValue: 'purple',
      options: [
        { label: 'Purple', value: 'purple' },
        { label: 'Blue', value: 'blue' },
        { label: 'Green', value: 'green' },
        { label: 'Red', value: 'red' },
      ],
    },
    {
      id: 'panelPosition',
      name: 'Panel Position',
      description: 'Position of the CSS inspector panel',
      type: 'select',
      defaultValue: 'bottom-right',
      options: [
        { label: 'Bottom Right', value: 'bottom-right' },
        { label: 'Bottom Left', value: 'bottom-left' },
        { label: 'Top Right', value: 'top-right' },
        { label: 'Top Left', value: 'top-left' },
      ],
    },
    {
      id: 'maxProperties',
      name: 'Max Properties',
      description: 'Maximum number of CSS properties to display',
      type: 'number',
      defaultValue: 50,
    },
  ],
};

// ==========================================
// 🎯 새로운 방식 (권장)
// ==========================================
// createPluginExecutor()를 사용하면 공통 로직이 자동으로 처리됩니다.

const cssSpyPluginExample: Plugin = {
  meta,
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  // ✅ 핵심: createPluginExecutor로 래핑
  execute: createPluginExecutor('css-spy', {
    // 1. 메인 로직 (필수)
    onActivate: (helpers: PluginHelpers) => {
      console.log('✅ CSS Spy activated!');

      // 설정값 사용 - helpers에서 간편하게 가져오기
      const showComputed = helpers.getSetting('showComputedStyles', true);
      const autoCopy = helpers.getSetting('autoCopyOnClick', false);
      const highlight = helpers.getSetting('highlightElement', true);
      const color = helpers.getSetting('highlightColor', 'purple');
      const position = helpers.getSetting('panelPosition', 'bottom-right');
      const maxProps = helpers.getSetting('maxProperties', 50);

      console.log('📋 Settings:', {
        showComputed,
        autoCopy,
        highlight,
        color,
        position,
        maxProps,
      });

      // TODO: 실제 CSS Spy UI 생성 및 로직 구현
      // - Inspector 패널 생성
      // - 요소 hover 이벤트 등록
      // - CSS 속성 표시
      // - etc.
    },

    // 2. 설정 변경 시 (선택사항)
    onSettingsChange: (helpers) => {
      console.log('⚙️ Settings changed:', helpers.settings);

      // 설정 변경에 따른 UI 업데이트
      const newColor = helpers.getSetting('highlightColor', 'purple');
      const newPosition = helpers.getSetting('panelPosition', 'bottom-right');

      // TODO: UI 업데이트 로직
      // - 패널 위치 변경
      // - 하이라이트 색상 변경
      // - etc.
    },

    // 3. 단축키 핸들러 (선택사항)
    shortcuts: {
      'toggle-inspector': (e, helpers) => {
        console.log('🔄 Toggle inspector');
        // TODO: Inspector on/off 토글
      },

      'copy-property': (e, helpers) => {
        console.log('📋 Copy CSS property');
        // TODO: 선택된 CSS 속성 클립보드에 복사
      },

      'copy-all-styles': (e, helpers) => {
        console.log('📋 Copy all styles');
        // TODO: 모든 CSS 스타일 클립보드에 복사
      },

      'navigate-up': (e, helpers) => {
        console.log('⬆️ Navigate to parent');
        // TODO: 부모 요소로 이동
      },

      'navigate-down': (e, helpers) => {
        console.log('⬇️ Navigate to child');
        // TODO: 자식 요소로 이동
      },
    },

    // 4. 정리 로직 (선택사항)
    onCleanup: () => {
      console.log('🧹 CSS Spy cleanup');
      // TODO: UI 제거, 이벤트 리스너 제거 등
    },
  }),
};

// ==========================================
// 📚 기존 방식 (직접 작성)
// ==========================================
// 필요하다면 여전히 직접 작성할 수 있습니다.
// 하지만 권장하지 않습니다. (휴먼 에러 가능성)

const cssSpyPluginManual: Plugin = {
  meta,
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  execute: async (ctx) => {
    // ❌ 이런 보일러플레이트 코드를 매번 작성해야 함
    const { settingsManager } = await import('../../../utils/settings-manager');
    const config = settingsManager.getPluginConfig('css-spy');

    if (!config?.enabled) {
      console.log('CSS Spy is disabled');
      return;
    }

    const settings = config.settings || {};

    // 실제 로직
    console.log('Settings:', settings);

    // 설정 변경 감지 - 매번 등록해야 함
    settingsManager.addChangeListener((appSettings) => {
      const newConfig = appSettings.plugins['css-spy'];
      if (newConfig) {
        console.log('Settings updated:', newConfig.settings);
      }
    });

    // 단축키 핸들러 - 매번 등록해야 함
    document.addEventListener('keydown', (e) => {
      // 단축키 처리 로직...
    });
  },

  cleanup: () => {
    console.log('Cleanup');
  },
};

// ✅ 새로운 방식 사용 (권장)
export default cssSpyPluginExample;

// ❌ 기존 방식 (비권장)
// export default cssSpyPluginManual;
