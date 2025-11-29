/**
 * Example Plugin - 새로운 API 데모
 *
 * 이 플러그인은 새로운 간소화된 API를 보여줍니다.
 */

import type { Plugin } from '../../../types';
import {browser} from "wxt/browser";

export const examplePlugin: Plugin = {
  // ===== 메타데이터 =====
  id: 'example-plugin',
  name: 'Example Plugin',
  description: 'Demonstrates the new simplified API',
  category: 'utility',
  version: '1.0.0',
  tier: 'free',

  // 아이콘 렌더링
  icon: (div) => {
    div.style.background = `linear-gradient(135deg, #feda75, #fa7e1e)`;
    div.className += ' plugin-icon';
    div.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M2 17L12 22L22 17" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M2 12L12 17L22 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  },

  // ===== 실행 설정 =====
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  // ===== 설정 스키마 =====
  settings: {
    enabled: {
      type: 'boolean',
      label: 'Enable notifications',
      description: 'Show console notifications',
      defaultValue: true,
    },
    message: {
      type: 'string',
      label: 'Custom message',
      description: 'Message to display',
      defaultValue: 'Hello from Example Plugin!',
    },
    count: {
      type: 'number',
      label: 'Counter',
      description: 'Number of times to log',
      defaultValue: 1,
    },
  },

  // ===== 단축키 =====
  shortcuts: {
    toggle: {
      name: 'Toggle Example',
      description: 'Toggle example plugin functionality',
      handler: async (event, ctx) => {
        console.log('🎯 Example shortcut triggered!');
        alert('Example Plugin activated via shortcut!');
      },
    },
  },

  // ===== 라이프사이클 =====
  onActivate: async (ctx) => {
    console.log('✅ Example Plugin activated!');

    // 플러그인 로직 예제
    const banner = document.createElement('div');
    banner.id = 'example-plugin-banner';
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      padding: 10px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-align: center;
      font-family: Arial, sans-serif;
      z-index: 999999;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    banner.textContent = 'Example Plugin is active!';
    document.body.appendChild(banner);

    // 3초 후 사라짐
    setTimeout(() => {
      banner.remove();
    }, 3000);
  },

  onCleanup: () => {
    console.log('🧹 Example Plugin cleaned up!');
    const banner = document.getElementById('example-plugin-banner');
    banner?.remove();
  },

  onExecute: {
    type: 'OPEN_MODAL',
    execute: async (ctx) => {

    },
  }
};
