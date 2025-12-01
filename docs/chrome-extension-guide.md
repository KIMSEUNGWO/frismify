# Chrome Extension 개발 가이드

이 문서는 Chrome Extension의 기본 아키텍처와 각 컴포넌트가 어떻게 동작하는지 설명합니다.

## 목차

1. [Extension 아키텍처 개요](#extension-아키텍처-개요)
2. [Manifest.json](#manifestjson)
3. [Background Script (Service Worker)](#background-script-service-worker)
4. [Content Script](#content-script)
5. [Popup](#popup)
6. [Options Page](#options-page)
7. [컨텍스트 간 통신](#컨텍스트-간-통신)
8. [Storage API](#storage-api)
9. [권한(Permissions)](#권한permissions)
10. [일반적인 패턴](#일반적인-패턴)

---

## Extension 아키텍처 개요

Chrome Extension은 여러 개의 격리된 컨텍스트로 구성되며, 메시지 전달을 통해 통신합니다:

```
┌─────────────────────────────────────────────────────────────┐
│                     Chrome Extension                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Background  │    │    Popup     │    │   Options    │  │
│  │   (Service   │◄───┤ (익스텐션 UI)│    │  (설정 페이지)│  │
│  │   Worker)    │    │              │    │              │  │
│  └──────┬───────┘    └──────────────┘    └──────────────┘  │
│         │                                                    │
│         │ 메시지 전달                                        │
│         ▼                                                    │
│  ┌─────────────────────────────────────────────┐           │
│  │         Content Script                       │           │
│  │  (웹페이지에 주입됨)                         │           │
│  │                                              │           │
│  │  ┌────────────────────────────────────┐    │           │
│  │  │      웹페이지 DOM                   │    │           │
│  │  │  (Content Script가 접근 가능)      │    │           │
│  │  └────────────────────────────────────┘    │           │
│  └─────────────────────────────────────────────┘           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 핵심 개념

- **격리된 컨텍스트**: 각 컴포넌트는 독립된 JavaScript 환경에서 실행되며 다른 컨텍스트에 대한 접근이 제한됨
- **메시지 전달**: `chrome.runtime.sendMessage()`와 `chrome.runtime.onMessage`를 통해 통신
- **권한**: 각 컴포넌트는 실행 환경에 따라 다른 기능을 사용할 수 있음
- **생명주기**: 각 컴포넌트는 고유한 생명주기와 로딩 시점을 가짐

---

## Manifest.json

Manifest 파일은 익스텐션의 설계도입니다. 권한, 스크립트, 메타데이터를 선언합니다.

### Manifest V3 구조

```json
{
  "manifest_version": 3,
  "name": "내 익스텐션",
  "version": "1.0.0",
  "description": "익스텐션 설명",

  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],

  "host_permissions": [
    "https://*/*",
    "http://*/*"
  ],

  "background": {
    "service_worker": "background.js",
    "type": "module"
  },

  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["content.css"],
      "run_at": "document_idle"
    }
  ],

  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },

  "options_ui": {
    "page": "options.html",
    "open_in_tab": true
  },

  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### 주요 필드

- **`manifest_version`**: 반드시 `3`이어야 함 (Manifest V2는 deprecated)
- **`permissions`**: API 권한 (storage, tabs 등)
- **`host_permissions`**: 익스텐션이 실행될 수 있는 URL 패턴
- **`background.service_worker`**: Background 스크립트 진입점
- **`content_scripts`**: 웹페이지에 주입될 스크립트
- **`action.default_popup`**: 팝업 UI의 HTML 파일
- **`options_ui`**: 설정 페이지 구성

---

## Background Script (Service Worker)

Background 스크립트는 익스텐션의 **중앙 허브**입니다. Manifest V3에서는 Service Worker로 실행됩니다.

### 특징

- **이벤트 기반**: 이벤트 발생 시 활성화되고, 필요 없을 때는 유휴 상태로 전환
- **DOM 접근 불가**: 웹페이지를 직접 조작할 수 없음
- **지속적인 상태 관리**: 익스텐션 전체의 상태를 관리
- **전체 API 접근**: 모든 Chrome Extension API 사용 가능

### 예제: 기본 Background Script

```javascript
// background.js

console.log('Background Service Worker 시작됨');

// 익스텐션 설치/업데이트 이벤트 감지
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('익스텐션 설치됨');
    // 기본 설정 초기화
    chrome.storage.local.set({ enabled: true });
  } else if (details.reason === 'update') {
    console.log('익스텐션 업데이트됨:', chrome.runtime.getManifest().version);
  }
});

// Content Script, Popup, Options 페이지로부터 메시지 수신
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('메시지 수신:', message);

  if (message.type === 'GET_DATA') {
    // 데이터 가져와서 응답
    chrome.storage.local.get('data', (result) => {
      sendResponse({ data: result.data });
    });
    return true; // 비동기 응답을 위해 메시지 채널 유지
  }

  if (message.type === 'EXECUTE_ACTION') {
    // 활성 탭에서 액션 실행
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'DO_SOMETHING',
        payload: message.payload
      });
    });
  }
});

// 탭 업데이트 감지
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    console.log('탭 로드 완료:', tab.url);
  }
});
```

### 주요 사용 사례

1. **상태 관리**: 익스텐션 전체의 상태 저장 및 관리
2. **메시지 라우팅**: 다른 컨텍스트 간 메시지 전달
3. **API 호출**: 네트워크 요청 (Content Script는 CORS 제한이 있음)
4. **탭 관리**: 브라우저 탭 모니터링 및 제어
5. **알람**: 주기적인 작업 스케줄링

---

## Content Script

Content Script는 **웹페이지의 컨텍스트**에서 실행되어 DOM을 읽고 수정할 수 있습니다.

### 특징

- **DOM 접근**: 페이지 HTML/CSS 읽기 및 수정 가능
- **격리된 JavaScript**: 격리된 환경에서 실행 (페이지의 JS 변수에 직접 접근 불가)
- **제한된 API 접근**: 대부분의 Chrome API 사용 불가 (`chrome.runtime`, `chrome.storage`만 사용 가능)
- **페이지별 주입**: 각 매칭 페이지마다 새 인스턴스 생성

### 주입 방법

#### 1. 선언적 방식 (manifest.json)

```json
{
  "content_scripts": [
    {
      "matches": ["https://example.com/*"],
      "js": ["content.js"],
      "css": ["content.css"],
      "run_at": "document_idle"
    }
  ]
}
```

**`run_at` 옵션**:
- `document_start`: DOM 생성 전
- `document_end`: DOM 생성 후, 이미지/서브프레임 로드 전
- `document_idle`: `DOMContentLoaded` 이후 (대부분의 경우 권장)

#### 2. 프로그래밍 방식 (Background Script)

```javascript
// background.js
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.scripting.executeScript({
    target: { tabId: tabs[0].id },
    files: ['content.js']
  });
});
```

### 예제: Content Script

```javascript
// content.js

console.log('Content Script 로드됨:', window.location.href);

// DOM 접근 및 수정
const banner = document.createElement('div');
banner.id = 'my-extension-banner';
banner.textContent = '익스텐션이 활성화되었습니다!';
banner.style.cssText = `
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: #4CAF50;
  color: white;
  padding: 10px;
  text-align: center;
  z-index: 10000;
`;
document.body.appendChild(banner);

// Background Script로부터 메시지 수신
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'DO_SOMETHING') {
    console.log('페이로드와 함께 실행:', message.payload);
    // 메시지에 따라 DOM 조작
    document.body.style.backgroundColor = message.payload.color;
    sendResponse({ success: true });
  }
});

// Background Script에 메시지 전송
chrome.runtime.sendMessage({
  type: 'PAGE_LOADED',
  url: window.location.href
});

// 키보드 이벤트 감지
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.shiftKey && event.key === 'X') {
    console.log('단축키 실행됨!');
    // 플러그인 기능 실행
  }
});
```

### 페이지 변수 접근하기

Content Script는 페이지 JavaScript에 직접 접근할 수 없습니다. `window.postMessage()` API를 사용해야 합니다:

```javascript
// content.js (페이지 컨텍스트에 스크립트 주입)
const script = document.createElement('script');
script.textContent = `
  // 이 코드는 페이지 컨텍스트에서 실행됨
  window.postMessage({
    type: 'FROM_PAGE',
    data: window.somePageVariable
  }, '*');
`;
document.documentElement.appendChild(script);

// 페이지로부터 메시지 수신
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data.type === 'FROM_PAGE') {
    console.log('페이지로부터 수신:', event.data.data);
  }
});
```

---

## Popup

Popup은 사용자가 익스텐션 아이콘을 클릭할 때 열리는 작은 HTML 페이지입니다.

### 특징

- **일시적**: 사용자가 외부를 클릭하면 닫힘
- **전체 Chrome API 접근**: 모든 익스텐션 API 사용 가능
- **지속성 없음**: 닫히면 상태가 사라짐
- **UI 중심**: 빠른 액션과 상태 표시에 최적

### 예제: Popup HTML

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>익스텐션 팝업</title>
  <style>
    body {
      width: 300px;
      padding: 16px;
      font-family: Arial, sans-serif;
    }
    button {
      width: 100%;
      padding: 10px;
      margin-bottom: 8px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <h2>내 익스텐션</h2>
  <button id="toggleBtn">기능 토글</button>
  <button id="settingsBtn">설정 열기</button>
  <div id="status"></div>

  <script src="popup.js"></script>
</body>
</html>
```

### 예제: Popup Script

```javascript
// popup.js

// 현재 상태 로드
chrome.storage.local.get('enabled', (result) => {
  updateStatus(result.enabled);
});

// 토글 버튼 클릭
document.getElementById('toggleBtn').addEventListener('click', async () => {
  const result = await chrome.storage.local.get('enabled');
  const newState = !result.enabled;

  // Storage 업데이트
  await chrome.storage.local.set({ enabled: newState });

  // Background Script에 메시지 전송
  chrome.runtime.sendMessage({
    type: 'TOGGLE_FEATURE',
    enabled: newState
  });

  updateStatus(newState);
});

// 설정 버튼 클릭
document.getElementById('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

function updateStatus(enabled) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = enabled ? '✅ 활성화됨' : '❌ 비활성화됨';
}

// 현재 탭에서 액션 실행
document.getElementById('actionBtn')?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id, {
    type: 'EXECUTE_ACTION',
    payload: { color: '#FF0000' }
  });
});
```

---

## Options Page

Options 페이지는 익스텐션 설정을 위한 전체 페이지 UI를 제공합니다.

### 특징

- **지속적인 UI**: 전체 브라우저 탭을 차지
- **전체 Chrome API 접근**: 모든 익스텐션 API 사용 가능
- **사용자 설정**: 복잡한 구성에 적합
- **일반 웹페이지**: 어떤 프론트엔드 프레임워크든 사용 가능

### Manifest 설정

```json
{
  "options_ui": {
    "page": "options.html",
    "open_in_tab": true  // 임베디드 대신 새 탭에서 열기
  }
}
```

### 예제: Options 페이지 (일반 HTML)

```html
<!-- options.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>익스텐션 설정</title>
  <style>
    body {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
      font-family: Arial, sans-serif;
    }
    .setting {
      margin-bottom: 16px;
      padding: 16px;
      border: 1px solid #ddd;
      border-radius: 8px;
    }
    label {
      display: block;
      margin-bottom: 8px;
      font-weight: bold;
    }
    input[type="text"], select {
      width: 100%;
      padding: 8px;
      box-sizing: border-box;
    }
    button {
      padding: 10px 20px;
      background: #4CAF50;
      color: white;
      border: none;
      cursor: pointer;
      border-radius: 4px;
    }
    button:hover {
      background: #45a049;
    }
    #saveStatus {
      margin-left: 10px;
      color: green;
    }
  </style>
</head>
<body>
  <h1>익스텐션 설정</h1>

  <div class="setting">
    <label for="apiKey">API 키</label>
    <input type="text" id="apiKey" placeholder="API 키를 입력하세요">
  </div>

  <div class="setting">
    <label for="theme">테마</label>
    <select id="theme">
      <option value="light">라이트</option>
      <option value="dark">다크</option>
      <option value="auto">자동</option>
    </select>
  </div>

  <div class="setting">
    <label>
      <input type="checkbox" id="notifications">
      알림 활성화
    </label>
  </div>

  <button id="saveBtn">설정 저장</button>
  <span id="saveStatus"></span>

  <script src="options.js"></script>
</body>
</html>
```

```javascript
// options.js

// 저장된 설정 로드
chrome.storage.local.get(['apiKey', 'theme', 'notifications'], (result) => {
  document.getElementById('apiKey').value = result.apiKey || '';
  document.getElementById('theme').value = result.theme || 'auto';
  document.getElementById('notifications').checked = result.notifications ?? true;
});

// 설정 저장
document.getElementById('saveBtn').addEventListener('click', async () => {
  const settings = {
    apiKey: document.getElementById('apiKey').value,
    theme: document.getElementById('theme').value,
    notifications: document.getElementById('notifications').checked
  };

  await chrome.storage.local.set(settings);

  // 저장 확인 표시
  const status = document.getElementById('saveStatus');
  status.textContent = '설정이 저장되었습니다!';
  setTimeout(() => {
    status.textContent = '';
  }, 2000);

  // Background Script에 알림
  chrome.runtime.sendMessage({
    type: 'SETTINGS_UPDATED',
    settings
  });
});
```

### 예제: Options 페이지 (Vue 3)

```vue
<!-- options.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';

const apiKey = ref('');
const theme = ref('auto');
const notifications = ref(true);
const saveStatus = ref('');

onMounted(async () => {
  const result = await chrome.storage.local.get(['apiKey', 'theme', 'notifications']);
  apiKey.value = result.apiKey || '';
  theme.value = result.theme || 'auto';
  notifications.value = result.notifications ?? true;
});

async function saveSettings() {
  await chrome.storage.local.set({
    apiKey: apiKey.value,
    theme: theme.value,
    notifications: notifications.value
  });

  saveStatus.value = '설정이 저장되었습니다!';
  setTimeout(() => {
    saveStatus.value = '';
  }, 2000);

  chrome.runtime.sendMessage({
    type: 'SETTINGS_UPDATED',
    settings: {
      apiKey: apiKey.value,
      theme: theme.value,
      notifications: notifications.value
    }
  });
}
</script>

<template>
  <div class="options-container">
    <h1>익스텐션 설정</h1>

    <div class="setting">
      <label for="apiKey">API 키</label>
      <input type="text" id="apiKey" v-model="apiKey" placeholder="API 키를 입력하세요">
    </div>

    <div class="setting">
      <label for="theme">테마</label>
      <select id="theme" v-model="theme">
        <option value="light">라이트</option>
        <option value="dark">다크</option>
        <option value="auto">자동</option>
      </select>
    </div>

    <div class="setting">
      <label>
        <input type="checkbox" v-model="notifications">
        알림 활성화
      </label>
    </div>

    <button @click="saveSettings">설정 저장</button>
    <span class="save-status">{{ saveStatus }}</span>
  </div>
</template>

<style scoped>
.options-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
}

.setting {
  margin-bottom: 16px;
  padding: 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
}

input[type="text"], select {
  width: 100%;
  padding: 8px;
  box-sizing: border-box;
}

button {
  padding: 10px 20px;
  background: #4CAF50;
  color: white;
  border: none;
  cursor: pointer;
  border-radius: 4px;
}

button:hover {
  background: #45a049;
}

.save-status {
  margin-left: 10px;
  color: green;
}
</style>
```

---

## 컨텍스트 간 통신

### 메시지 전달 아키텍처

```
┌─────────────┐
│   Popup     │─────┐
└─────────────┘     │
                    │  chrome.runtime.sendMessage()
┌─────────────┐     │
│   Options   │─────┤
└─────────────┘     │
                    ▼
              ┌─────────────┐
              │ Background  │
              │  (라우터)   │
              └─────┬───────┘
                    │
                    │  chrome.tabs.sendMessage()
                    ▼
              ┌─────────────┐
              │   Content   │
              │   Script    │
              └─────────────┘
```

### 단방향 메시지

```javascript
// 발신자 (popup, options, content script)
chrome.runtime.sendMessage({
  type: 'ACTION_TYPE',
  payload: { data: 'value' }
});

// 수신자 (background script)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('수신:', message);
  console.log('발신 탭:', sender.tab?.id);
});
```

### 요청-응답 패턴

```javascript
// 발신자
chrome.runtime.sendMessage(
  { type: 'GET_DATA', id: 123 },
  (response) => {
    console.log('응답:', response);
  }
);

// 수신자
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_DATA') {
    // 동기 응답
    sendResponse({ data: 'value' });
  }
});
```

### 비동기 응답 패턴

```javascript
// 수신자 (채널을 열어두기 위해 true 반환 필수)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_API') {
    fetch('https://api.example.com/data')
      .then(response => response.json())
      .then(data => sendResponse({ data }))
      .catch(error => sendResponse({ error: error.message }));

    return true; // 비동기 응답을 위해 메시지 채널 유지
  }
});
```

### Background → Content Script

```javascript
// Background Script
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.tabs.sendMessage(
    tabs[0].id,
    { type: 'UPDATE_UI', color: '#FF0000' }
  );
});

// Content Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_UI') {
    document.body.style.backgroundColor = message.color;
    sendResponse({ success: true });
  }
});
```

### 장기 연결 (Port API)

지속적인 통신이 필요한 경우:

```javascript
// Content Script (연결 설정)
const port = chrome.runtime.connect({ name: 'my-channel' });

port.postMessage({ type: 'INIT' });

port.onMessage.addListener((message) => {
  console.log('수신:', message);
});

// Background Script (연결 감지)
chrome.runtime.onConnect.addListener((port) => {
  console.log('연결 설정됨:', port.name);

  port.onMessage.addListener((message) => {
    console.log('수신:', message);
    port.postMessage({ type: 'RESPONSE', data: 'value' });
  });
});
```

---

## Storage API

Chrome Extension은 여러 Storage 옵션을 제공합니다:

### Storage 타입

1. **`chrome.storage.local`**: 로컬 저장소 (권장)
   - 최대 크기: 10MB (`unlimitedStorage` 권한으로 무제한 가능)
   - 브라우저 재시작 후에도 유지
   - 기기 간 동기화 안됨

2. **`chrome.storage.sync`**: 동기화 저장소
   - 최대 크기: 총 100KB, 항목당 8KB
   - 사용자의 Chrome 인스턴스 간 동기화
   - `storage` 권한 필요

3. **`chrome.storage.session`**: 세션 저장소 (MV3)
   - 최대 크기: 10MB
   - 브라우저 종료 시 삭제
   - 임시 상태에 유용

### 기본 작업

```javascript
// 데이터 저장
await chrome.storage.local.set({ key: 'value' });

// 데이터 가져오기
const result = await chrome.storage.local.get('key');
console.log(result.key); // 'value'

// 여러 키 가져오기
const result = await chrome.storage.local.get(['key1', 'key2']);

// 모든 데이터 가져오기
const allData = await chrome.storage.local.get(null);

// 데이터 삭제
await chrome.storage.local.remove('key');
await chrome.storage.local.remove(['key1', 'key2']);

// 모든 데이터 삭제
await chrome.storage.local.clear();
```

### Storage 변경 감지

```javascript
chrome.storage.onChanged.addListener((changes, areaName) => {
  console.log('Storage 영역:', areaName); // 'local', 'sync', 'session'

  for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(`${key}가 ${oldValue}에서 ${newValue}로 변경됨`);
  }
});
```

### 모범 사례

1. **구조화된 키 사용**:
   ```javascript
   await chrome.storage.local.set({
     'settings.theme': 'dark',
     'settings.language': 'ko',
     'user.name': '홍길동'
   });
   ```

2. **일괄 작업**:
   ```javascript
   // 좋음: 단일 작업
   await chrome.storage.local.set({
     key1: 'value1',
     key2: 'value2',
     key3: 'value3'
   });

   // 나쁨: 여러 작업
   await chrome.storage.local.set({ key1: 'value1' });
   await chrome.storage.local.set({ key2: 'value2' });
   await chrome.storage.local.set({ key3: 'value3' });
   ```

3. **에러 처리**:
   ```javascript
   try {
     await chrome.storage.local.set({ key: 'value' });
   } catch (error) {
     console.error('Storage 에러:', error);
   }
   ```

---

## 권한(Permissions)

Chrome Extension은 API 및 웹 리소스 접근을 위해 명시적 권한이 필요합니다.

### 주요 권한

```json
{
  "permissions": [
    "storage",        // chrome.storage API
    "activeTab",      // 사용자 상호작용 시 활성 탭 접근
    "tabs",           // 탭 URL 및 속성 접근
    "scripting",      // 프로그래밍 방식으로 스크립트 주입
    "contextMenus",   // 컨텍스트 메뉴 항목 추가
    "notifications",  // 데스크톱 알림 표시
    "alarms",         // 주기적 코드 실행 스케줄
    "webRequest",     // 네트워크 요청 가로채기
    "cookies",        // 쿠키 접근
    "history",        // 브라우징 히스토리 접근
    "bookmarks"       // 북마크 접근
  ],

  "host_permissions": [
    "https://*/*",    // 모든 HTTPS 사이트 접근
    "http://*/*",     // 모든 HTTP 사이트 접근
    "<all_urls>"      // 모든 URL 접근 (HTTP, HTTPS, file 등)
  ]
}
```

### 선택적 권한

런타임에 권한 요청 (더 나은 UX):

```json
{
  "optional_permissions": ["tabs", "history"],
  "optional_host_permissions": ["https://api.example.com/*"]
}
```

```javascript
// 필요할 때 권한 요청
document.getElementById('enableFeature').addEventListener('click', async () => {
  const granted = await chrome.permissions.request({
    permissions: ['tabs'],
    origins: ['https://api.example.com/*']
  });

  if (granted) {
    console.log('권한이 부여되었습니다');
  } else {
    console.log('권한이 거부되었습니다');
  }
});

// 권한이 부여되었는지 확인
const hasPermission = await chrome.permissions.contains({
  permissions: ['tabs']
});
```

### 권한 모범 사례

1. **최소 권한 요청**: 필요한 것만 요청
2. **가능하면 `activeTab` 사용**: `tabs` 권한보다 낫음
3. **런타임에 요청**: 선택적 권한으로 사용자 신뢰 향상
4. **이유 설명**: 왜 권한이 필요한지 UI로 설명

---

## 일반적인 패턴

### 패턴 1: 기능 켜기/끄기 토글

```javascript
// Background Script
let featureEnabled = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TOGGLE_FEATURE') {
    featureEnabled = !featureEnabled;

    // 모든 탭에 알림
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'FEATURE_STATE_CHANGED',
          enabled: featureEnabled
        });
      });
    });

    sendResponse({ enabled: featureEnabled });
  }
});

// Content Script
let feature = null;

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'FEATURE_STATE_CHANGED') {
    if (message.enabled) {
      activateFeature();
    } else {
      deactivateFeature();
    }
  }
});

function activateFeature() {
  feature = document.createElement('div');
  feature.textContent = '기능 활성화!';
  document.body.appendChild(feature);
}

function deactivateFeature() {
  feature?.remove();
  feature = null;
}
```

### 패턴 2: 상태 동기화

```javascript
// 공유 상태 관리
class StateManager {
  static async getState() {
    const result = await chrome.storage.local.get('appState');
    return result.appState || this.getDefaultState();
  }

  static async setState(state) {
    await chrome.storage.local.set({ appState: state });
  }

  static async updateState(updater) {
    const currentState = await this.getState();
    const newState = updater(currentState);
    await this.setState(newState);
    return newState;
  }

  static getDefaultState() {
    return {
      enabled: false,
      settings: {}
    };
  }
}

// Background Script에서 사용
await StateManager.updateState(state => {
  state.enabled = true;
  return state;
});

// Content Script에서 사용
const state = await StateManager.getState();
console.log('현재 상태:', state);
```

### 패턴 3: 명령 라우터

```javascript
// Background Script
const commandHandlers = {
  'GET_SETTINGS': async (message) => {
    const settings = await chrome.storage.local.get('settings');
    return { settings: settings.settings };
  },

  'UPDATE_SETTING': async (message) => {
    await chrome.storage.local.set({
      [`settings.${message.key}`]: message.value
    });
    return { success: true };
  },

  'EXECUTE_ON_TAB': async (message) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, {
      type: 'DO_ACTION',
      payload: message.payload
    });
    return { success: true };
  }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = commandHandlers[message.type];

  if (handler) {
    handler(message)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true; // 비동기 응답
  }
});
```

### 패턴 4: 생명주기 관리

```javascript
// 적절한 cleanup이 있는 Content Script
class FeatureManager {
  constructor() {
    this.elements = [];
    this.listeners = [];
  }

  activate() {
    // UI 요소 생성
    const banner = document.createElement('div');
    banner.textContent = '기능 활성화';
    document.body.appendChild(banner);
    this.elements.push(banner);

    // 이벤트 리스너 추가
    const handler = (e) => console.log('클릭:', e);
    document.addEventListener('click', handler);
    this.listeners.push({ target: document, type: 'click', handler });
  }

  cleanup() {
    // UI 요소 제거
    this.elements.forEach(el => el.remove());
    this.elements = [];

    // 이벤트 리스너 제거
    this.listeners.forEach(({ target, type, handler }) => {
      target.removeEventListener(type, handler);
    });
    this.listeners = [];
  }
}

const feature = new FeatureManager();

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'ACTIVATE') {
    feature.activate();
  } else if (message.type === 'CLEANUP') {
    feature.cleanup();
  }
});
```

---

## 요약

### 핵심 내용

1. **아키텍처**: Extension은 격리된 컨텍스트(background, content, popup, options)로 구성되며 메시지를 통해 통신
2. **Background Script**: 중앙 허브, 이벤트 기반, 상태 관리
3. **Content Script**: 웹페이지에서 실행, DOM 접근 가능, 제한된 API 접근
4. **Popup**: 빠른 액션을 위한 임시 UI
5. **Options**: 설정을 위한 지속적 UI
6. **메시지 전달**: `chrome.runtime.sendMessage()`로 통신
7. **Storage**: 지속적 데이터는 `chrome.storage.local` 사용
8. **권한**: 필요한 것만 요청, 이유 설명

### 모범 사례

- **권한 최소화**: 필요한 권한만 요청
- **리소스 정리**: 이벤트 리스너와 DOM 요소 제거
- **에러 처리**: Storage/메시징 호출을 try-catch로 감싸기
- **async/await 사용**: 콜백보다 깔끔함
- **관심사 분리**: 비즈니스 로직은 background에, UI는 content/popup에
- **철저한 테스트**: 시크릿 모드, 다양한 사이트, 엣지 케이스 테스트

### 주의사항

- ❌ 비동기 메시지 핸들러에서 `return true` 잊지 말기
- ❌ Content Script 리소스 정리하지 않기 (메모리 누수)
- ❌ Content Script에서 페이지 변수에 접근하기 (`window.postMessage` 사용)
- ❌ 동기 Storage API 사용하기 (promise/async 사용)
- ❌ 과도한 권한 요청 (사용자가 불신함)

---

## 추가 자료

- [Chrome Extension 문서](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 마이그레이션 가이드](https://developer.chrome.com/docs/extensions/migrating/)
- [메시지 전달](https://developer.chrome.com/docs/extensions/mv3/messaging/)
- [Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)
- [Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)