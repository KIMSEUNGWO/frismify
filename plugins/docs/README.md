# 플러그인 개발 가이드

Front Hero의 플러그인 시스템에 대한 완전한 개발 가이드입니다.

## 목차

1. [빠른 시작](./01-quick-start.md)
2. [플러그인 구조](./02-plugin-structure.md)
3. [설정 옵션](./03-settings.md)
4. [단축키](./04-shortcuts.md)
5. [Helpers API](./05-helpers-api.md)
6. [예제](./06-examples.md)

## 개요

Front Hero 플러그인 시스템은 크롬 익스텐션에 기능을 쉽게 추가할 수 있도록 설계되었습니다.

### 주요 특징

- **선언적 메타데이터**: 플러그인 정보, 설정, 단축키를 한 곳에서 정의
- **자동 설정 관리**: Chrome Storage API 기반 자동 동기화
- **추상화된 실행 로직**: `createPluginExecutor`로 보일러플레이트 제거
- **타입 안전성**: TypeScript 기반 완전한 타입 지원
- **실시간 동기화**: Popup과 Options 간 설정 자동 동기화

### 플러그인 위치

모든 플러그인은 `plugins/implementations/` 디렉토리에 위치합니다.

```
plugins/
├── implementations/     # 플러그인 구현
│   ├── css-spy.ts
│   ├── color-picker.ts
│   └── ...
├── types.ts            # 타입 정의
├── registry.ts         # 플러그인 레지스트리
├── settings-manager.ts # 설정 관리자
└── plugin-helper.ts    # 헬퍼 함수
```

### 시작하기

[빠른 시작 가이드](./01-quick-start.md)를 참고하여 첫 플러그인을 만들어보세요.