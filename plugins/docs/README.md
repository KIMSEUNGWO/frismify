# Prismify 플러그인 개발 가이드

Prismify의 플러그인 시스템에 대한 완전한 개발 가이드입니다.

## 목차

1. [빠른 시작](./01-quick-start.md)
2. [플러그인 구조](./02-plugin-structure.md)
3. [설정 스키마](./03-settings.md)
4. [단축키](./04-shortcuts.md)
5. [Helpers API](./05-helpers-api.md)
6. [예제 모음](./06-examples.md)

## 개요

Prismify 플러그인 시스템은 브라우저 익스텐션에 기능을 모듈식으로 추가할 수 있도록 설계되었습니다.

### 주요 특징

- **선언적 플러그인 정의**: 메타데이터, 설정, 단축키를 하나의 객체로 정의
- **상태 공유 아키텍처**: Background가 Single Source of Truth
- **다중 모달 지원**: 독립적인 Vue Router 인스턴스로 모달 충돌 방지
- **타입 안전성**: TypeScript 기반 완전한 타입 지원
- **자동 설정 관리**: Chrome Storage API 기반 자동 저장 및 동기화

### 플러그인 위치

모든 플러그인은 `plugins/implementations/` 디렉토리에 위치합니다.

```
plugins/
├── implementations/     # 플러그인 구현
│   ├── example/
│   │   └── index.ts
│   ├── color-picker/
│   │   ├── index.ts
│   │   └── ColorPickerModalView.vue
│   └── ...
├── index.ts            # 플러그인 등록 (allPlugins export)
└── docs/               # 개발 문서
```

### 핵심 아키텍처

#### Background Context (Single Source of Truth)
- **PluginManager**: 플러그인 등록, 상태 관리
- **StorageManager**: Chrome Storage API 래퍼

#### Content Script Context
- **플러그인 실행**: onActivate, onExecute, shortcuts 실행
- **Modal 관리**: ModalManager (각 탭 독립)
- **상태 구독**: pluginManagerProxy로 Background 상태 조회

#### Popup/Options Context
- **UI 표시**: 플러그인 목록, 설정 UI
- **상태 구독**: pluginManagerProxy로 Background 상태 조회

```
Background (PluginManager)
  ↓ 상태 공유 (Proxy)
  ├─ Content Script (플러그인 실행)
  ├─ Popup (UI 표시)
  └─ Options (설정 UI)
```

### 시작하기

[빠른 시작 가이드](./01-quick-start.md)를 참고하여 첫 플러그인을 만들어보세요.

## 플러그인 유형

### 1. 활성화 기반 플러그인 (Persistent)

페이지 로드 시 자동으로 활성화되어 지속적으로 동작하는 플러그인

- 예: Grid Overlay, CSS Spy
- `onActivate`, `onCleanup` 사용
- enabled 상태에서 자동 실행

### 2. 실행 기반 플러그인 (On-Demand)

사용자가 버튼을 클릭하거나 단축키를 누를 때 일회성으로 실행되는 플러그인

- 예: Screenshot, Ruler
- `onExecute.type: 'EXECUTE_PLUGIN'` 사용
- enabled 상태 불필요

### 3. 모달 기반 플러그인 (Modal UI)

별도의 모달 창에서 UI를 제공하는 플러그인

- 예: Color Picker, CSS Inspector
- `onExecute.type: 'OPEN_MODAL'` 사용
- Vue Router로 모달 뷰 정의
- 각 모달마다 독립적인 router 인스턴스

## 아키텍처 핵심 개념

### 공유되는 것 (Background 관리)
- 플러그인 상태 (enabled/disabled)
- 설정값 (settings)
- 단축키 설정 (shortcuts)

### 공유되지 않는 것 (각 Context 독립)
- Modal 인스턴스 (각 탭마다 독립)
- 플러그인 실행 상태 (DOM 조작 결과)
- Vue Router 인스턴스 (모달마다 독립)

## 비즈니스 모델

- **Free Tier**: 4개 핵심 플러그인
- **Pro Tier**: 11개 프리미엄 플러그인

플러그인 정의 시 `tier: 'free' | 'pro'` 지정