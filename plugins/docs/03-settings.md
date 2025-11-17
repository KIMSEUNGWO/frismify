# 설정 옵션

플러그인에 사용자 정의 설정을 추가하는 방법입니다.

## 기본 사용법

메타데이터에 `settingOptions` 배열을 추가합니다.

```typescript
const meta: PluginMetaData = {
  // ... 기본 필드
  settingOptions: [
    {
      id: 'myOption',
      name: '옵션 이름',
      description: '옵션 설명',
      type: 'boolean',
      defaultValue: true,
    },
  ],
};
```

## 설정 타입

### Boolean

토글 스위치로 표시됩니다.

```typescript
{
  id: 'enabled',
  name: '활성화',
  description: '기능을 활성화합니다',
  type: 'boolean',
  defaultValue: true,
}
```

### String

텍스트 입력 필드로 표시됩니다.

```typescript
{
  id: 'apiKey',
  name: 'API 키',
  description: 'API 키를 입력하세요',
  type: 'string',
  defaultValue: '',
}
```

### Number

숫자 입력 필드로 표시됩니다.

```typescript
{
  id: 'maxItems',
  name: '최대 항목 수',
  description: '표시할 최대 항목 수',
  type: 'number',
  defaultValue: 50,
}
```

### Select

드롭다운 메뉴로 표시됩니다.

```typescript
{
  id: 'theme',
  name: '테마',
  description: '색상 테마를 선택하세요',
  type: 'select',
  defaultValue: 'dark',
  options: [
    { label: '다크', value: 'dark' },
    { label: '라이트', value: 'light' },
    { label: '자동', value: 'auto' },
  ],
}
```

## 설정값 읽기

`helpers.getSetting()` 메서드를 사용합니다.

### 기본값과 함께

```typescript
execute: createPluginExecutor('my-plugin', {
  onActivate: (helpers) => {
    const enabled = helpers.getSetting('enabled', true);
    const maxItems = helpers.getSetting('maxItems', 50);
    const theme = helpers.getSetting('theme', 'dark');
  },
})
```

### 기본값 없이

```typescript
execute: createPluginExecutor('my-plugin', {
  onActivate: (helpers) => {
    const apiKey = helpers.getSetting<string>('apiKey');
    if (!apiKey) {
      console.warn('API 키가 설정되지 않았습니다');
      return;
    }
  },
})
```

### 전체 설정 객체

```typescript
execute: createPluginExecutor('my-plugin', {
  onActivate: (helpers) => {
    const allSettings = helpers.settings;
    console.log(allSettings);
  },
})
```

## 설정 변경 감지

설정이 변경될 때 자동으로 호출됩니다.

```typescript
execute: createPluginExecutor('my-plugin', {
  onActivate: (helpers) => {
    const theme = helpers.getSetting('theme', 'dark');
    applyTheme(theme);
  },

  onSettingsChange: (helpers) => {
    // 설정 변경 시 자동 호출
    const newTheme = helpers.getSetting('theme', 'dark');
    applyTheme(newTheme);
  },
})
```

## 실전 예제

```typescript
const meta: PluginMetaData = {
  id: 'color-picker',
  name: 'Color Picker',
  settingOptions: [
    {
      id: 'autoSave',
      name: '자동 저장',
      description: '색상을 자동으로 히스토리에 저장',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'format',
      name: '색상 형식',
      description: '기본 색상 형식',
      type: 'select',
      defaultValue: 'hex',
      options: [
        { label: 'HEX', value: 'hex' },
        { label: 'RGB', value: 'rgb' },
        { label: 'HSL', value: 'hsl' },
      ],
    },
    {
      id: 'historySize',
      name: '히스토리 크기',
      description: '저장할 최대 색상 개수',
      type: 'number',
      defaultValue: 20,
    },
  ],
};

const colorPickerPlugin: Plugin = {
  meta,
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  execute: createPluginExecutor('color-picker', {
    onActivate: (helpers) => {
      const autoSave = helpers.getSetting('autoSave', true);
      const format = helpers.getSetting('format', 'hex');
      const historySize = helpers.getSetting('historySize', 20);

      // ColorPicker 인스턴스 생성
      const picker = new ColorPicker({
        autoSave,
        format,
        historySize,
      });
    },

    onSettingsChange: (helpers) => {
      // 설정 변경 시 ColorPicker 업데이트
      const format = helpers.getSetting('format', 'hex');
      picker.setFormat(format);
    },
  }),
};
```