# WXT 프레임워크 개발 가이드

WXT는 Chrome Extension 개발을 위한 차세대 프레임워크입니다. Vite 기반으로 빠른 HMR(Hot Module Replacement), TypeScript 지원, 그리고 규약 기반(Convention-based) 파일 구조를 제공합니다.

## 목차

1. [WXT란?](#wxt란)
2. [WXT 설치 및 설정](#wxt-설치-및-설정)
3. [프로젝트 구조](#프로젝트-구조)
4. [Entrypoints (진입점)](#entrypoints-진입점)
5. [Content Script 개발](#content-script-개발)
6. [Background Script 개발](#background-script-개발)
7. [Popup & Options 개발](#popup--options-개발)
8. [타입 안전성](#타입-안전성)
9. [빌드 및 배포](#빌드-및-배포)
10. [HMR (Hot Module Replacement)](#hmr-hot-module-replacement)
11. [고급 기능](#고급-기능)
12. [모범 사례](#모범-사례)

---

## WXT란?

WXT(Web eXTension)는 Chrome Extension 개발을 단순화하는 프레임워크입니다.

### 주요 특징

- **Vite 기반**: 초고속 개발 서버 및 빌드
- **TypeScript 우선**: 완벽한 타입 안전성
- **규약 기반 라우팅**: `entrypoints/` 폴더의 파일 구조로 자동 설정
- **HMR 지원**: Background, Content Script에서도 핫 리로딩
- **다중 브라우저**: Chrome, Firefox, Safari, Edge 지원
- **프레임워크 통합**: Vue, React, Svelte 등 자유롭게 사용
- **자동 Manifest 생성**: 파일 구조에서 `manifest.json` 자동 생성

### 기존 방식 vs WXT

#### 기존 Chrome Extension 개발

```json
// manifest.json (수동 작성)
{
  "manifest_version": 3,
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ],
  "action": {
    "default_popup": "popup.html"
  }
}
```

- Manifest 수동 작성
- 빌드 설정 복잡
- HMR 없음 (매번 리로드 필요)
- TypeScript 설정 번거로움

#### WXT 방식

```
entrypoints/
├── background.ts        → Service Worker로 자동 변환
├── content.ts           → Content Script로 자동 변환
└── popup.html           → Popup으로 자동 변환
```

- 파일 생성만으로 자동 설정
- Vite 빌드 시스템
- HMR 자동 지원
- TypeScript 즉시 사용 가능

---

## WXT 설치 및 설정

### 1. 새 프로젝트 생성

```bash
# npm
npm create wxt@latest

# pnpm
pnpm create wxt

# yarn
yarn create wxt
```

프롬프트에서 선택:

```
? Project name: my-extension
? Select a template: Vue
? Enable git? Yes
```

### 2. 기존 프로젝트에 추가

```bash
npm install -D wxt
```

```json
// package.json
{
  "scripts": {
    "dev": "wxt",
    "build": "wxt build",
    "zip": "wxt zip"
  }
}
```

### 3. wxt.config.ts 생성

```typescript
import { defineConfig } from 'wxt';

export default defineConfig({
  // 개발 모드에서 익스텐션 디렉토리
  outDir: '.output',

  // Manifest 설정
  manifest: {
    name: '내 익스텐션',
    version: '1.0.0',
    permissions: ['storage', 'activeTab'],
  },

  // 브라우저별 빌드 설정
  browser: 'chrome', // 'chrome' | 'firefox' | 'safari' | 'edge'
});
```

---

## 프로젝트 구조

WXT는 규약 기반 파일 구조를 사용합니다.

```
my-extension/
├── entrypoints/              # 익스텐션 진입점 (중요!)
│   ├── background.ts         # Background Service Worker
│   ├── content.ts            # Content Script
│   ├── popup/                # Popup UI
│   │   ├── index.html
│   │   ├── main.ts
│   │   └── App.vue
│   └── options/              # Options Page
│       ├── index.html
│       ├── main.ts
│       └── App.vue
│
├── components/               # 재사용 가능한 Vue 컴포넌트
│   └── Button.vue
│
├── assets/                   # 정적 파일 (이미지, 폰트 등)
│   ├── icon.png
│   └── style.css
│
├── public/                   # 빌드 시 그대로 복사될 파일
│   └── manifest-icon.png
│
├── utils/                    # 유틸리티 함수
│   └── storage.ts
│
├── wxt.config.ts             # WXT 설정 파일
├── tsconfig.json             # TypeScript 설정
└── package.json
```

### 중요한 폴더

- **`entrypoints/`**: 익스텐션의 진입점. 이 폴더의 파일 구조로 Manifest가 자동 생성됨
- **`public/`**: 빌드 시 그대로 복사되는 정적 파일
- **`components/`**, **`utils/`**: 자유롭게 구성 가능

---

## Entrypoints (진입점)

WXT의 핵심 개념입니다. `entrypoints/` 폴더의 파일 이름과 구조가 `manifest.json`을 결정합니다.

### Entrypoint 타입

#### 1. Background Script

```typescript
// entrypoints/background.ts
export default defineBackground(() => {
  console.log('Background script started');

  // 메시지 리스너
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Received message:', message);
    sendResponse({ success: true });
  });

  // 설치 이벤트
  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      console.log('Extension installed');
    }
  });
});
```

**생성되는 Manifest**:

```json
{
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

#### 2. Content Script

```typescript
// entrypoints/content.ts
export default defineContentScript({
  // 실행할 URL 패턴
  matches: ['*://*/*'],

  // 실행 시점
  runAt: 'document_idle', // 'document_start' | 'document_end' | 'document_idle'

  // Content Script 메인 함수
  main(ctx) {
    console.log('Content script loaded');

    // DOM 조작
    const div = document.createElement('div');
    div.textContent = 'WXT is awesome!';
    document.body.appendChild(div);

    // Cleanup (HMR 또는 익스텐션 비활성화 시)
    ctx.onInvalidated(() => {
      div.remove();
    });
  },
});
```

**생성되는 Manifest**:

```json
{
  "content_scripts": [
    {
      "matches": ["*://*/*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ]
}
```

#### 3. Popup

```html
<!-- entrypoints/popup/index.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Popup</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./main.ts"></script>
</body>
</html>
```

```typescript
// entrypoints/popup/main.ts
import { createApp } from 'vue';
import App from './App.vue';

createApp(App).mount('#app');
```

```vue
<!-- entrypoints/popup/App.vue -->
<script setup lang="ts">
import { ref } from 'vue';

const count = ref(0);

async function increment() {
  count.value++;
  await browser.storage.local.set({ count: count.value });
}
</script>

<template>
  <div class="popup">
    <h1>WXT Popup</h1>
    <p>Count: {{ count }}</p>
    <button @click="increment">Increment</button>
  </div>
</template>

<style scoped>
.popup {
  width: 300px;
  padding: 16px;
}
</style>
```

**생성되는 Manifest**:

```json
{
  "action": {
    "default_popup": "popup.html"
  }
}
```

#### 4. Options Page

```html
<!-- entrypoints/options/index.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Options</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./main.ts"></script>
</body>
</html>
```

```typescript
// entrypoints/options/main.ts
import { createApp } from 'vue';
import App from './App.vue';
import { createRouter, createMemoryHistory } from 'vue-router';

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: () => import('./views/Settings.vue') },
    { path: '/about', component: () => import('./views/About.vue') },
  ],
});

createApp(App).use(router).mount('#app');
```

**생성되는 Manifest**:

```json
{
  "options_ui": {
    "page": "options.html",
    "open_in_tab": true
  }
}
```

### 다중 Content Script

여러 Content Script가 필요한 경우:

```typescript
// entrypoints/content/index.ts
export default defineContentScript({
  matches: ['*://*.example.com/*'],
  main() {
    console.log('Main content script');
  },
});

// entrypoints/content/youtube.ts
export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  main() {
    console.log('YouTube-specific content script');
  },
});
```

**생성되는 Manifest**:

```json
{
  "content_scripts": [
    {
      "matches": ["*://*.example.com/*"],
      "js": ["content/index.js"]
    },
    {
      "matches": ["*://*.youtube.com/*"],
      "js": ["content/youtube.js"]
    }
  ]
}
```

---

## Content Script 개발

### 기본 구조

```typescript
// entrypoints/content.ts
export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  async main(ctx) {
    // ContentScriptContext 제공
    console.log('Content script context:', ctx);

    // DOM 조작
    createUI();

    // 메시지 리스너
    setupMessageListener();

    // Cleanup
    ctx.onInvalidated(() => {
      cleanupUI();
    });
  },
});

function createUI() {
  const container = document.createElement('div');
  container.id = 'my-extension-ui';
  container.innerHTML = '<h1>Extension Active</h1>';
  document.body.appendChild(container);
}

function cleanupUI() {
  document.getElementById('my-extension-ui')?.remove();
}

function setupMessageListener() {
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'UPDATE_UI') {
      updateUI(message.data);
      sendResponse({ success: true });
    }
  });
}
```

### ContentScriptContext

`ctx` 객체는 WXT가 제공하는 컨텍스트입니다:

```typescript
interface ContentScriptContext {
  // 현재 Content Script가 무효화될 때 실행 (HMR 또는 비활성화)
  onInvalidated(callback: () => void): void;

  // Content Script 정보
  contentScript: {
    matches: string[];
    runAt: 'document_start' | 'document_end' | 'document_idle';
  };
}
```

**사용 예제**:

```typescript
export default defineContentScript({
  matches: ['<all_urls>'],

  main(ctx) {
    const elements: HTMLElement[] = [];
    const listeners: Array<{ target: any; type: string; handler: any }> = [];

    // UI 생성
    const banner = document.createElement('div');
    document.body.appendChild(banner);
    elements.push(banner);

    // 이벤트 리스너 추가
    const clickHandler = () => console.log('clicked');
    document.addEventListener('click', clickHandler);
    listeners.push({ target: document, type: 'click', handler: clickHandler });

    // Cleanup (HMR 시 자동 실행)
    ctx.onInvalidated(() => {
      elements.forEach(el => el.remove());
      listeners.forEach(({ target, type, handler }) => {
        target.removeEventListener(type, handler);
      });
    });
  },
});
```

### CSS 주입

```typescript
// entrypoints/content.ts
import './content.css'; // CSS 자동 주입

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui', // 'ui' | 'manual'

  main() {
    const div = document.createElement('div');
    div.className = 'my-extension-container';
    document.body.appendChild(div);
  },
});
```

```css
/* entrypoints/content.css */
.my-extension-container {
  position: fixed;
  top: 20px;
  right: 20px;
  background: white;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 999999;
}
```

### Vue/React 컴포넌트 마운트

**Vue 예제**:

```typescript
// entrypoints/content.ts
import { createApp } from 'vue';
import App from './content/App.vue';

export default defineContentScript({
  matches: ['<all_urls>'],

  main(ctx) {
    // 컨테이너 생성
    const container = document.createElement('div');
    container.id = 'my-extension-root';
    document.body.appendChild(container);

    // Vue 앱 마운트
    const app = createApp(App);
    app.mount(container);

    // Cleanup
    ctx.onInvalidated(() => {
      app.unmount();
      container.remove();
    });
  },
});
```

```vue
<!-- entrypoints/content/App.vue -->
<script setup lang="ts">
import { ref } from 'vue';

const visible = ref(true);
</script>

<template>
  <div v-if="visible" class="overlay">
    <h1>Extension UI</h1>
    <button @click="visible = false">Close</button>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 32px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  z-index: 999999;
}
</style>
```

---

## Background Script 개발

### 기본 구조

```typescript
// entrypoints/background.ts
export default defineBackground(() => {
  console.log('[Background] Service worker started');

  // 설치 이벤트
  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      console.log('[Background] Extension installed');
      initializeStorage();
    } else if (details.reason === 'update') {
      console.log('[Background] Extension updated');
      migrateData();
    }
  });

  // 메시지 리스너
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Background] Message received:', message);

    // 명령 라우팅
    switch (message.type) {
      case 'GET_DATA':
        handleGetData(message).then(sendResponse);
        return true; // 비동기 응답

      case 'UPDATE_SETTING':
        handleUpdateSetting(message).then(sendResponse);
        return true;

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  });

  // 탭 업데이트 감지
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      console.log('[Background] Tab loaded:', tab.url);
      onTabLoaded(tabId, tab.url);
    }
  });
});

async function initializeStorage() {
  await browser.storage.local.set({
    initialized: true,
    settings: {
      enabled: true,
      theme: 'dark',
    },
  });
}

async function migrateData() {
  const data = await browser.storage.local.get();
  // 데이터 마이그레이션 로직
}

async function handleGetData(message: any) {
  const data = await browser.storage.local.get(message.key);
  return { data: data[message.key] };
}

async function handleUpdateSetting(message: any) {
  await browser.storage.local.set({
    [`settings.${message.key}`]: message.value,
  });
  return { success: true };
}

async function onTabLoaded(tabId: number, url: string) {
  // 특정 사이트에서 Content Script 활성화
  if (url.includes('example.com')) {
    await browser.tabs.sendMessage(tabId, {
      type: 'ACTIVATE_FEATURE',
    });
  }
}
```

### 타입 안전한 메시지 처리

```typescript
// types.ts
export interface MessageTypes {
  GET_DATA: {
    request: { key: string };
    response: { data: any };
  };
  UPDATE_SETTING: {
    request: { key: string; value: any };
    response: { success: boolean };
  };
  TOGGLE_FEATURE: {
    request: { enabled: boolean };
    response: { success: boolean };
  };
}

// utils/messaging.ts
export async function sendMessage<T extends keyof MessageTypes>(
  type: T,
  request: MessageTypes[T]['request']
): Promise<MessageTypes[T]['response']> {
  return browser.runtime.sendMessage({ type, ...request });
}

// entrypoints/background.ts
import type { MessageTypes } from '@/types';

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const type = message.type as keyof MessageTypes;

    switch (type) {
      case 'GET_DATA':
        handleGetData(message).then(sendResponse);
        return true;

      case 'UPDATE_SETTING':
        handleUpdateSetting(message).then(sendResponse);
        return true;
    }
  });
});

// 사용 (popup 또는 content script)
import { sendMessage } from '@/utils/messaging';

const data = await sendMessage('GET_DATA', { key: 'settings' });
console.log(data.data);
```

---

## Popup & Options 개발

### Popup (Vue 3 예제)

```vue
<!-- entrypoints/popup/App.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface Settings {
  enabled: boolean;
  theme: 'light' | 'dark';
}

const settings = ref<Settings>({ enabled: false, theme: 'light' });
const loading = ref(true);

onMounted(async () => {
  const result = await browser.storage.local.get('settings');
  settings.value = result.settings || { enabled: false, theme: 'light' };
  loading.value = false;
});

async function toggleFeature() {
  settings.value.enabled = !settings.value.enabled;
  await browser.storage.local.set({ settings: settings.value });

  // Background에 알림
  browser.runtime.sendMessage({
    type: 'TOGGLE_FEATURE',
    enabled: settings.value.enabled,
  });
}

async function changeTheme(theme: 'light' | 'dark') {
  settings.value.theme = theme;
  await browser.storage.local.set({ settings: settings.value });
}

function openOptions() {
  browser.runtime.openOptionsPage();
}
</script>

<template>
  <div class="popup">
    <h2>내 익스텐션</h2>

    <div v-if="loading">로딩 중...</div>

    <div v-else class="content">
      <div class="setting-row">
        <label>기능 활성화</label>
        <input type="checkbox" v-model="settings.enabled" @change="toggleFeature" />
      </div>

      <div class="setting-row">
        <label>테마</label>
        <select v-model="settings.theme" @change="changeTheme(settings.theme)">
          <option value="light">라이트</option>
          <option value="dark">다크</option>
        </select>
      </div>

      <button @click="openOptions" class="btn-options">
        자세한 설정
      </button>
    </div>
  </div>
</template>

<style scoped>
.popup {
  width: 320px;
  padding: 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

h2 {
  margin: 0 0 16px 0;
  font-size: 18px;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-options {
  padding: 8px 16px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-options:hover {
  background: #45a049;
}
</style>
```

### Options (Vue Router 예제)

```typescript
// entrypoints/options/main.ts
import { createApp } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';
import App from './App.vue';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'settings',
      component: () => import('./views/Settings.vue'),
    },
    {
      path: '/shortcuts',
      name: 'shortcuts',
      component: () => import('./views/Shortcuts.vue'),
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('./views/About.vue'),
    },
  ],
});

createApp(App).use(router).mount('#app');
```

```vue
<!-- entrypoints/options/App.vue -->
<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();
const navItems = [
  { path: '/', label: '설정', icon: '⚙️' },
  { path: '/shortcuts', label: '단축키', icon: '⌨️' },
  { path: '/about', label: '정보', icon: 'ℹ️' },
];
</script>

<template>
  <div class="options-page">
    <nav class="sidebar">
      <h1>내 익스텐션</h1>
      <ul>
        <li v-for="item in navItems" :key="item.path">
          <router-link :to="item.path" class="nav-link">
            <span class="icon">{{ item.icon }}</span>
            {{ item.label }}
          </router-link>
        </li>
      </ul>
    </nav>

    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.options-page {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 240px;
  background: #f5f5f5;
  padding: 24px;
  border-right: 1px solid #ddd;
}

.sidebar h1 {
  font-size: 20px;
  margin: 0 0 24px 0;
}

.sidebar ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  text-decoration: none;
  color: #333;
  border-radius: 8px;
  transition: background 0.2s;
}

.nav-link:hover {
  background: #e0e0e0;
}

.nav-link.router-link-active {
  background: #4CAF50;
  color: white;
}

.icon {
  font-size: 20px;
}

.content {
  flex: 1;
  padding: 32px;
}
</style>
```

```vue
<!-- entrypoints/options/views/Settings.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';

const settings = ref({
  apiKey: '',
  enableFeature1: true,
  enableFeature2: false,
  theme: 'dark',
});

const saveStatus = ref('');

onMounted(async () => {
  const result = await browser.storage.local.get('settings');
  if (result.settings) {
    settings.value = result.settings;
  }
});

async function saveSettings() {
  await browser.storage.local.set({ settings: settings.value });

  saveStatus.value = '저장되었습니다!';
  setTimeout(() => {
    saveStatus.value = '';
  }, 2000);

  // Background에 알림
  browser.runtime.sendMessage({
    type: 'SETTINGS_UPDATED',
    settings: settings.value,
  });
}
</script>

<template>
  <div class="settings-view">
    <h2>설정</h2>

    <div class="setting-section">
      <h3>API 설정</h3>
      <div class="form-group">
        <label for="apiKey">API 키</label>
        <input
          type="text"
          id="apiKey"
          v-model="settings.apiKey"
          placeholder="API 키를 입력하세요"
        />
      </div>
    </div>

    <div class="setting-section">
      <h3>기능 설정</h3>
      <div class="form-group">
        <label>
          <input type="checkbox" v-model="settings.enableFeature1" />
          기능 1 활성화
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" v-model="settings.enableFeature2" />
          기능 2 활성화
        </label>
      </div>
    </div>

    <div class="setting-section">
      <h3>테마</h3>
      <div class="form-group">
        <select v-model="settings.theme">
          <option value="light">라이트</option>
          <option value="dark">다크</option>
          <option value="auto">자동</option>
        </select>
      </div>
    </div>

    <button @click="saveSettings" class="btn-save">설정 저장</button>
    <span v-if="saveStatus" class="save-status">{{ saveStatus }}</span>
  </div>
</template>

<style scoped>
.settings-view {
  max-width: 800px;
}

h2 {
  margin: 0 0 24px 0;
  font-size: 28px;
}

.setting-section {
  margin-bottom: 32px;
  padding: 24px;
  background: #f9f9f9;
  border-radius: 8px;
}

.setting-section h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group:last-child {
  margin-bottom: 0;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

input[type="text"],
select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.btn-save {
  padding: 12px 24px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
}

.btn-save:hover {
  background: #45a049;
}

.save-status {
  margin-left: 16px;
  color: #4CAF50;
  font-weight: 500;
}
</style>
```

---

## 타입 안전성

WXT는 TypeScript를 우선으로 지원하며, 자동으로 타입을 생성합니다.

### 자동 생성된 타입

```typescript
// .wxt/types/index.d.ts (자동 생성됨)
declare module 'wxt/browser' {
  export * from 'webextension-polyfill';
}

declare module '~entrypoints/background' {
  // Background 타입
}

declare module '~entrypoints/content' {
  // Content Script 타입
}
```

### Browser API 타입

```typescript
// WXT는 webextension-polyfill 사용
import { browser } from 'wxt/browser';

// 완전한 타입 안전성
const tabs = await browser.tabs.query({ active: true });
const storage = await browser.storage.local.get('key');

// TypeScript가 자동으로 타입 체크
browser.runtime.sendMessage({ type: 'test' }); // ✅
browser.runtime.sendMessage(123); // ❌ 타입 에러
```

### Storage 타입 정의

```typescript
// utils/storage.ts
interface StorageSchema {
  settings: {
    enabled: boolean;
    theme: 'light' | 'dark';
    apiKey: string;
  };
  userData: {
    name: string;
    email: string;
  };
  plugins: Record<string, {
    enabled: boolean;
    config: any;
  }>;
}

export async function getStorageItem<K extends keyof StorageSchema>(
  key: K
): Promise<StorageSchema[K] | undefined> {
  const result = await browser.storage.local.get(key);
  return result[key];
}

export async function setStorageItem<K extends keyof StorageSchema>(
  key: K,
  value: StorageSchema[K]
): Promise<void> {
  await browser.storage.local.set({ [key]: value });
}

// 사용
const settings = await getStorageItem('settings'); // 타입: StorageSchema['settings']
await setStorageItem('settings', { enabled: true, theme: 'dark', apiKey: '' });
```

---

## 빌드 및 배포

### 개발 모드

```bash
# Chrome 개발 모드
npm run dev

# Firefox 개발 모드
npm run dev -- --browser firefox

# 특정 포트 사용
npm run dev -- --port 3000
```

개발 모드 특징:
- HMR (Hot Module Replacement) 활성화
- Source maps 포함
- 자동 리로딩
- `.output/chrome-mv3` 폴더에 빌드 결과 생성

### 프로덕션 빌드

```bash
# Chrome 빌드
npm run build

# Firefox 빌드
npm run build -- --browser firefox

# 모든 브라우저 빌드
npm run build -- --browser chrome,firefox,edge
```

빌드 결과:
- `.output/chrome-mv3/`: Chrome 빌드
- `.output/firefox-mv2/`: Firefox 빌드
- 압축 및 최적화된 코드
- Source maps 제거

### ZIP 파일 생성 (스토어 배포용)

```bash
# Chrome 웹 스토어용 ZIP
npm run zip

# Firefox 애드온 스토어용 ZIP
npm run zip -- --browser firefox
```

생성된 ZIP 파일:
- `.output/chrome-mv3.zip`
- `.output/firefox-mv2.zip`

### 브라우저별 빌드 차이

WXT는 브라우저별로 최적화된 빌드를 생성합니다:

```typescript
// wxt.config.ts
export default defineConfig({
  manifest: {
    name: '내 익스텐션',
    version: '1.0.0',

    // Chrome 전용 설정
    chrome: {
      minimum_chrome_version: '88',
    },

    // Firefox 전용 설정
    firefox: {
      browser_specific_settings: {
        gecko: {
          id: 'my-extension@example.com',
          strict_min_version: '91.0',
        },
      },
    },
  },
});
```

---

## HMR (Hot Module Replacement)

WXT의 가장 강력한 기능 중 하나는 모든 컨텍스트에서 HMR을 지원한다는 것입니다.

### Content Script HMR

```typescript
// entrypoints/content.ts
export default defineContentScript({
  matches: ['<all_urls>'],

  main(ctx) {
    console.log('Content script loaded');

    const div = document.createElement('div');
    div.textContent = 'Version 1'; // 이 텍스트를 변경하면...
    document.body.appendChild(div);

    // ctx.onInvalidated()가 자동으로 실행되어 cleanup
    ctx.onInvalidated(() => {
      div.remove(); // 이전 버전 제거
      // 새 버전이 자동으로 로드됨
    });
  },
});
```

**작동 방식**:
1. 코드 변경 감지
2. `ctx.onInvalidated()` 콜백 실행 (cleanup)
3. 새 버전의 Content Script 자동 주입
4. `main()` 함수 재실행

### Background Script HMR

```typescript
// entrypoints/background.ts
export default defineBackground(() => {
  console.log('Background script version:', Date.now());

  // 리스너 등록
  browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log('Message:', msg);
    sendResponse({ received: true });
  });

  // HMR이 새 버전을 로드할 때:
  // 1. 이전 리스너가 자동으로 제거됨
  // 2. 새 리스너가 등록됨
  // 3. Service Worker 재시작 없음!
});
```

### HMR 제한사항

일부 변경사항은 전체 리로드가 필요합니다:

- `manifest.json` 관련 변경 (권한, matches 등)
- Background에서 Storage 스키마 변경
- Entrypoint 추가/삭제

이런 경우 수동으로 익스텐션을 리로드해야 합니다.

---

## 고급 기능

### Manifest 커스터마이징

```typescript
// wxt.config.ts
import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: '내 익스텐션',
    version: '1.0.0',
    description: '익스텐션 설명',

    permissions: ['storage', 'activeTab', 'scripting'],
    host_permissions: ['https://*/*'],

    // 컨텐츠 보안 정책
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'",
    },

    // 웹 접근 가능한 리소스
    web_accessible_resources: [
      {
        resources: ['assets/*'],
        matches: ['<all_urls>'],
      },
    ],

    // 커맨드 (단축키)
    commands: {
      'toggle-feature': {
        suggested_key: {
          default: 'Ctrl+Shift+Y',
          mac: 'Command+Shift+Y',
        },
        description: '기능 토글',
      },
    },
  },

  // 빌드 후 Manifest 수정
  hooks: {
    'build:manifestGenerated': (wxt, manifest) => {
      // Manifest 동적 수정
      if (wxt.config.mode === 'production') {
        manifest.description = '프로덕션용 설명';
      }

      // Options 페이지를 새 탭에서 열기
      if (manifest.options_ui) {
        manifest.options_ui.open_in_tab = true;
      }
    },
  },
});
```

### 다중 환경 설정

```typescript
// wxt.config.ts
import { defineConfig } from 'wxt';

export default defineConfig(({ mode }) => ({
  manifest: {
    name: mode === 'production' ? '내 익스텐션' : '내 익스텐션 (개발)',
    version: '1.0.0',
  },

  vite: () => ({
    define: {
      __DEV__: mode !== 'production',
      __API_URL__: JSON.stringify(
        mode === 'production'
          ? 'https://api.example.com'
          : 'http://localhost:3000'
      ),
    },
  }),
}));
```

```typescript
// 코드에서 사용
declare const __DEV__: boolean;
declare const __API_URL__: string;

if (__DEV__) {
  console.log('개발 모드입니다');
}

fetch(`${__API_URL__}/data`);
```

### 리소스 임포트

```typescript
// entrypoints/content.ts
import iconUrl from '@/assets/icon.png'; // Vite가 자동으로 처리
import styles from './content.module.css'; // CSS Modules

export default defineContentScript({
  matches: ['<all_urls>'],

  main() {
    const img = document.createElement('img');
    img.src = iconUrl; // 빌드 시 올바른 URL로 변환
    document.body.appendChild(img);

    const div = document.createElement('div');
    div.className = styles.container; // CSS Module 클래스명
    document.body.appendChild(div);
  },
});
```

### Remote Code (외부 스크립트 로드)

```typescript
// entrypoints/content.ts
export default defineContentScript({
  matches: ['<all_urls>'],

  async main() {
    // Manifest V3에서는 eval() 금지
    // 대신 browser.scripting.executeScript 사용

    await browser.scripting.executeScript({
      target: { tabId: await getCurrentTabId() },
      func: () => {
        // 이 함수는 페이지 컨텍스트에서 실행됨
        console.log('Executed in page context');
      },
    });
  },
});

async function getCurrentTabId(): Promise<number> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab.id!;
}
```

---

## 모범 사례

### 1. 프로젝트 구조

```
my-extension/
├── entrypoints/              # WXT entrypoints
│   ├── background.ts
│   ├── content/
│   │   ├── index.ts         # Main content script
│   │   └── overlay.ts       # Additional content script
│   ├── popup/
│   │   ├── index.html
│   │   ├── main.ts
│   │   └── App.vue
│   └── options/
│       ├── index.html
│       ├── main.ts
│       └── App.vue
│
├── components/               # 재사용 컴포넌트
│   ├── ui/                  # 공통 UI
│   │   ├── Button.vue
│   │   └── Toggle.vue
│   └── features/            # 기능별 컴포넌트
│       └── SettingsPanel.vue
│
├── composables/              # Vue 3 Composables
│   ├── useStorage.ts
│   └── useMessaging.ts
│
├── core/                     # 핵심 비즈니스 로직
│   ├── PluginManager.ts
│   └── StateManager.ts
│
├── utils/                    # 유틸리티
│   ├── messaging.ts
│   └── dom.ts
│
├── types/                    # 타입 정의
│   ├── index.ts
│   └── storage.ts
│
└── wxt.config.ts
```

### 2. Storage 추상화

```typescript
// utils/storage.ts
import { browser } from 'wxt/browser';

export class StorageManager<T extends Record<string, any>> {
  async get<K extends keyof T>(key: K): Promise<T[K] | undefined> {
    const result = await browser.storage.local.get(key as string);
    return result[key as string];
  }

  async set<K extends keyof T>(key: K, value: T[K]): Promise<void> {
    await browser.storage.local.set({ [key]: value });
  }

  async update<K extends keyof T>(
    key: K,
    updater: (current: T[K]) => T[K]
  ): Promise<void> {
    const current = await this.get(key);
    const updated = updater(current as T[K]);
    await this.set(key, updated);
  }

  onChanged(callback: (changes: Partial<T>) => void) {
    browser.storage.onChanged.addListener((changes) => {
      const typedChanges: Partial<T> = {};
      for (const [key, { newValue }] of Object.entries(changes)) {
        typedChanges[key as keyof T] = newValue;
      }
      callback(typedChanges);
    });
  }
}

// 사용
interface AppStorage {
  settings: { theme: string; enabled: boolean };
  userData: { name: string };
}

const storage = new StorageManager<AppStorage>();

// 완전한 타입 안전성
await storage.set('settings', { theme: 'dark', enabled: true }); // ✅
await storage.set('settings', { invalid: true }); // ❌ 타입 에러
```

### 3. Composables (Vue 3)

```typescript
// composables/useStorage.ts
import { ref, watch } from 'vue';
import { browser } from 'wxt/browser';

export function useStorage<T>(key: string, defaultValue: T) {
  const data = ref<T>(defaultValue);
  const loading = ref(true);
  const error = ref<Error | null>(null);

  // 초기 로드
  (async () => {
    try {
      const result = await browser.storage.local.get(key);
      if (result[key] !== undefined) {
        data.value = result[key];
      }
    } catch (e) {
      error.value = e as Error;
    } finally {
      loading.value = false;
    }
  })();

  // 자동 저장
  watch(
    data,
    async (newValue) => {
      try {
        await browser.storage.local.set({ [key]: newValue });
      } catch (e) {
        error.value = e as Error;
      }
    },
    { deep: true }
  );

  // Storage 변경 감지
  browser.storage.onChanged.addListener((changes) => {
    if (changes[key]) {
      data.value = changes[key].newValue;
    }
  });

  return { data, loading, error };
}

// 사용
const { data: settings, loading } = useStorage('settings', {
  theme: 'dark',
  enabled: true,
});
```

```typescript
// composables/useMessaging.ts
import { ref } from 'vue';
import { browser } from 'wxt/browser';

export function useMessaging() {
  const sending = ref(false);
  const error = ref<Error | null>(null);

  async function sendMessage<T = any>(message: any): Promise<T> {
    sending.value = true;
    error.value = null;

    try {
      const response = await browser.runtime.sendMessage(message);
      return response as T;
    } catch (e) {
      error.value = e as Error;
      throw e;
    } finally {
      sending.value = false;
    }
  }

  function onMessage<T = any>(
    handler: (message: T) => void | Promise<void>
  ) {
    browser.runtime.onMessage.addListener((message) => {
      handler(message as T);
    });
  }

  return { sendMessage, onMessage, sending, error };
}

// 사용
const { sendMessage, sending } = useMessaging();

async function toggleFeature() {
  const result = await sendMessage({ type: 'TOGGLE_FEATURE' });
  console.log('Result:', result);
}
```

### 4. 에러 처리

```typescript
// utils/error-handler.ts
export class ExtensionError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ExtensionError';
  }
}

export async function handleAsync<T>(
  promise: Promise<T>
): Promise<[T | null, Error | null]> {
  try {
    const data = await promise;
    return [data, null];
  } catch (error) {
    return [null, error as Error];
  }
}

// 사용
import { handleAsync, ExtensionError } from '@/utils/error-handler';

const [data, error] = await handleAsync(
  browser.storage.local.get('settings')
);

if (error) {
  throw new ExtensionError('Failed to load settings', 'STORAGE_ERROR', error);
}
```

### 5. 디버깅

```typescript
// utils/logger.ts
const DEBUG = __DEV__;

export const logger = {
  debug(...args: any[]) {
    if (DEBUG) {
      console.log('[DEBUG]', ...args);
    }
  },

  info(...args: any[]) {
    console.info('[INFO]', ...args);
  },

  warn(...args: any[]) {
    console.warn('[WARN]', ...args);
  },

  error(...args: any[]) {
    console.error('[ERROR]', ...args);
  },
};

// 사용
import { logger } from '@/utils/logger';

logger.debug('Content script loaded');
logger.info('Settings updated:', settings);
logger.error('Failed to save:', error);
```

---

## 요약

### WXT의 장점

1. **개발 속도**: HMR로 즉각적인 피드백
2. **타입 안전성**: TypeScript 완벽 지원
3. **규약 기반**: 파일 구조로 Manifest 자동 생성
4. **Vite 생태계**: 플러그인 및 최적화 활용
5. **다중 브라우저**: 한 번의 코드로 여러 브라우저 지원

### 핵심 개념

- **Entrypoints**: `entrypoints/` 폴더가 Manifest를 결정
- **Context**: `ctx` 객체로 생명주기 관리
- **HMR**: 모든 컨텍스트에서 핫 리로딩
- **브라우저 API**: `wxt/browser`로 타입 안전한 API 사용

### 시작하기

```bash
# 프로젝트 생성
npm create wxt@latest

# 개발 모드
npm run dev

# 프로덕션 빌드
npm run build

# ZIP 생성
npm run zip
```

---

## 추가 자료

- [WXT 공식 문서](https://wxt.dev/)
- [WXT GitHub](https://github.com/wxt-dev/wxt)
- [예제 프로젝트](https://github.com/wxt-dev/wxt/tree/main/examples)
- [Chrome Extension 문서](https://developer.chrome.com/docs/extensions/)