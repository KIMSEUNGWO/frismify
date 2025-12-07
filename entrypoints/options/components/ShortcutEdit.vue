<template>
  <div class="shortcut-edit">
    <!-- 단축키 버튼 -->
    <div class="shortcut-key-wrapper">
      <button
        v-if="!displayKeys"
        class="shortcut-badge-empty"
        @click="openPopover"
      >
        No shortcut
      </button>
      <ShortcutBadge
        v-else
        :keys="displayKeys"
        variant="button"
        @click="openPopover"
      />

      <!-- 팝오버 -->
      <div
        v-if="isEditing"
        class="shortcut-popover"
      >
        <div class="popover-content">
          <p class="popover-hint">{{ popoverHintText }}</p>
          <div class="key-preview-container">
            <div v-if="editingKeys.length === 0" class="placeholder">
              <span>e.g.</span>
              <span class="key" v-for="key in shortcutManager.format(['Cmd', 'Shift', 'L'])" :key="key">{{ key }}</span>
            </div>
            <div v-else class="key-preview" :class="validationClass">
              <span class="key" v-for="(key, index) in displayKeysArray" :key="index">{{ key }}</span>
            </div>
          </div>
          <input
            ref="inputRef"
            type="text"
            class="popover-input"
            @keydown.prevent="captureKey"
            @keyup="handleKeyUp"
            name="popover-input"
            readonly
          />
        </div>
      </div>
    </div>

    <!-- 삭제 버튼 (단축키가 등록되어 있을 때만 표시) -->
    <button
      v-if="hasShortcut"
      class="btn-delete"
      @click="handleDelete"
      title="Delete shortcut"
    >
      ×
    </button>

    <!-- 외부 클릭 감지 (팝오버 닫기) -->
    <div
      v-if="isEditing"
      class="popover-overlay"
      @click="closePopover"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { PluginManager, ShortcutManager } from '@/core';
import type { ShortcutKey, PluginState } from '@/types';
import ShortcutBadge from '@/components/ShortcutBadge.vue';

const props = defineProps<{
  pluginId: string;
  shortcutId: string;
  config: PluginState;
}>();

const emit = defineEmits<{
  updated: [];
}>();

const manager = PluginManager.getInstance();
const shortcutManager = ShortcutManager.getInstance();

const isEditing = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);
const editingKeys = ref<ShortcutKey[]>([]);
const editingDisplayKey = ref<string[]>([]);
const validationState = ref<'valid' | 'invalid' | 'duplicate' | null>(null);
const popoverHintText = ref('Press any key combination');

const modifiers = ['Ctrl', 'Alt', 'Shift', 'Cmd', 'Control', 'Meta'];

// 표시할 키 배열 (formatted 문자열을 개별 키로 분리)
const displayKeysArray = computed(() => {
  if (!editingDisplayKey.value) return [];
  return shortcutManager.format(editingKeys.value);
});

// 표시할 단축키 키 배열 (등록된 키만)
const displayKeys = computed(() => {
  const keys = props.config.shortcuts?.[props.shortcutId]?.keys;
  return keys && keys.length > 0 ? keys : null;
});

// 단축키가 등록되어 있는지
const hasShortcut = computed(() => {
  return !!displayKeys.value;
});

// Validation class for key preview
const validationClass = computed(() => {
  if (validationState.value === 'valid') return 'is-valid';
  if (validationState.value === 'invalid') return 'is-invalid';
  if (validationState.value === 'duplicate') return 'is-duplicate';
  return '';
});

// 팝오버 열기
const openPopover = () => {
  isEditing.value = true;
  editingKeys.value = [];
  editingDisplayKey.value = [];
  validationState.value = null;
  popoverHintText.value = 'Press any key combination';
};

// 팝오버 닫기
const closePopover = () => {
  isEditing.value = false;
  validationState.value = null;
};

// 유효한 키 조합인지 검사 (modifier + regular key 필수)
const isValidCombination = (keys: ShortcutKey[]): boolean => {
  if (keys.length < 2) return false;

  const hasModifier = keys.some(key => modifiers.includes(key));
  const hasRegularKey = keys.some(key => !modifiers.includes(key));

  return hasModifier && hasRegularKey;
};

// 다른 단축키와 중복되는지 검사
const isDuplicate = async (keys: ShortcutKey[]): Promise<boolean> => {
  const states = await manager.getPluginStates()

  for (const [pluginId, pluginState] of Object.entries(states)) {
    if (!pluginState.shortcuts) continue;

    for (const [shortcutId, shortcutState] of Object.entries(pluginState.shortcuts)) {
      // 현재 편집 중인 단축키는 제외
      if (pluginId === props.pluginId && shortcutId === props.shortcutId) continue;

      const existingKeys = shortcutState.keys;
      if (!existingKeys || existingKeys.length === 0) continue;

      // 키 배열이 완전히 동일한지 검사
      if (existingKeys.length === keys.length &&
          existingKeys.every((key, index) => key === keys[index])) {
        return true;
      }
    }
  }

  return false;
};

// 키 조합 캡처
const captureModifers = [
    ''
];
const captureKey = (event: KeyboardEvent) => {

  const code = event.code;

  if (code === 'Escape') {
    closePopover();
    return;
  }

  const keys: ShortcutKey[] = [];

  if (event.metaKey) keys.push('Cmd');
  if (event.ctrlKey) keys.push('Ctrl');
  if (event.shiftKey) keys.push('Shift');
  if (event.altKey) keys.push('Alt');

  if (!modifiers.includes(event.key)) {
    // 일반 키 처리

    if (code.startsWith('Digit')) {
      // 숫자
      keys.push(code.substring(5));
    } else if (code.startsWith('Key')) {
      // 일반 키
      keys.push(code.substring(3));
    } else if (code.startsWith('F') && code.length <= 3) {
      // Function 키
      keys.push(code);
    } else if (code.startsWith('Arrow')) {
      // 화살표
      keys.push(code.substring(5));
    } else if (code === 'Space') {
      keys.push(code);
    } else {
      keys.push(code.toUpperCase());
    }
  }

  // editingKeys 업데이트
  editingKeys.value = keys;

  if (keys.length > 0) {
    editingDisplayKey.value = shortcutManager.format(keys);
  } else {
    editingDisplayKey.value = [];
  }

  console.log(keys);

  // Reset validation state on new input
  validationState.value = null;
  popoverHintText.value = 'Press any key combination';
};

// keyup에서 유효성 검사 및 저장
const handleKeyUp = async (event: KeyboardEvent) => {

  const code = event.code;
  // Enter는 팝오버 닫기
  if (code === 'Escape') {
    closePopover();
    return;
  }

  // Modifier 키만 떼었을 때는 저장하지 않음 (일반 키를 떼었을 때만 저장)
  if (modifiers.includes(code)) {
    return;
  }

  // editingKeys가 비어있으면 무시
  if (editingKeys.value.length === 0) {
    return;
  }

  // 유효한 키 조합인지 검사 (Modifier + Regular Key 필수)
  if (!isValidCombination(editingKeys.value)) {
    validationState.value = 'invalid';
    popoverHintText.value = 'Must include modifier + key';
    return;
  }

  // 중복 검사
  const duplicate = await isDuplicate(editingKeys.value);

  if (duplicate) {
    validationState.value = 'duplicate';
    popoverHintText.value = 'Shortcut already in use';
    return;
  }

  // 유효한 조합이고 중복되지 않음 → 저장
  validationState.value = 'valid';
  popoverHintText.value = 'Shortcut saved!';

  // 저장
  await manager.updateShortcutKeys(
    props.pluginId,
    props.shortcutId,
    editingKeys.value
  );

  emit('updated');

  // 300ms 후 팝오버 닫기
  setTimeout(() => {
    closePopover();
  }, 300);
};

// 삭제
const handleDelete = async () => {
  await manager.deleteShortcutKeys(props.pluginId, props.shortcutId);
  emit('updated');
};

// isEditing이 true가 될 때 포커스
watch(isEditing, async (newVal) => {
  if (newVal) {
    await nextTick();
    setTimeout(() => {
      inputRef.value?.focus();
      console.log('Focus attempted, input element:', inputRef.value);
    }, 50);
  }
});
</script>

<style scoped>
.shortcut-edit {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 단축키 버튼 및 팝오버 */
.shortcut-key-wrapper {
  position: relative;
}

.shortcut-badge-empty {
  padding: 6px 12px;
  background: var(--card-bg-hover, #f3f4f6);
  color: var(--font-color-2, #666);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.shortcut-badge-empty:hover {
  background: var(--border-color, #e5e7eb);
  border-color: var(--font-color-2, #999);
}

/* 팝오버 오버레이 */
.popover-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

/* 팝오버 */
.shortcut-popover {
  position: absolute;
  top: -100%;
  left: 50%;
  transform: translateX(-50%) translateY(-90%);
  margin-top: 8px;
  background: var(--card-bg-color, #fff);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 200px;
}

.popover-content {
  padding: 12px;
}

.popover-hint {
  font-size: 11px;
  color: var(--font-color-2, #666);
  margin: 0 0 8px 0;
  text-align: center;
}

.popover-input {
  position: absolute;
  border: none;
  width: 0;
  height: 0;
}

/* Delete 버튼 */
.btn-delete {
  width: 24px;
  height: 24px;
  padding: 0;
  background: var(--border-color, #e5e7eb);
  color: var(--font-color-1, #1a1a1a);
  border: none;
  border-radius: 4px;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-delete:hover {
  background: #ef4444;
  color: white;
}

/* 키 프리뷰 */
.key-preview-container {
  font-family: ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;
  font-size: 12px;
  font-weight: 500;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.key-preview-container .key {
  padding: 3px 8px;
  border-radius: 6px;
  background-color: var(--card-bg-hover);
}

.placeholder, .key-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.placeholder span {
  color: var(--font-disabled);
}

.key-preview span {
  color: var(--font-color-1);
  transition: background-color 0.2s ease;
}

/* Validation states */
.key-preview.is-valid .key {
  background-color: #22C55E !important;
  color: white;
}

.key-preview.is-invalid .key,
.key-preview.is-duplicate .key {
  background-color: #EF4444 !important;
  color: white;
}
</style>