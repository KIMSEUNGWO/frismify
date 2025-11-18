<template>
  <div class="shortcut-item">
    <div class="shortcut-info">
      <h3 class="shortcut-name">{{ shortcut.name }}</h3>
      <p class="shortcut-description">{{ shortcut.description }}</p>
    </div>

    <div class="shortcut-controls">
      <!-- 단축키 버튼 -->
      <div class="shortcut-key-wrapper">
        <ShortcutBadge
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
            <p class="popover-hint">Press any key combination</p>
            <div class="key-preview-container">
              <div v-if="editingKeys.length === 0" class="placeholder">
                <span>e.g.</span>
                <span class="key">⌘</span>
                <span class="key">⇧</span>
                <span class="key">L</span>
              </div>
              <div v-else class="key-preview">
                <span class="key" v-for="key in editingDisplayKey.split('')" :key="key">{{ key }}</span>
              </div>
            </div>
            <input
              ref="inputRef"
              type="text"
              :value="editingDisplayKey"
              class="popover-input"
              @keydown.prevent="captureKey"
              @keyup="saveOnKeyUp"
              name="popover-input"
              readonly
            />
          </div>
        </div>
      </div>

      <!-- 리셋 버튼 (커스텀 키가 있을 때만 표시) -->
      <button
        v-if="hasCustomKeys"
        class="btn-reset"
        @click="handleReset"
        title="Reset to default"
      >
        ↻
      </button>
    </div>

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
import type { PluginShortcut, ShortcutKey, PluginState } from '@/types';
import ShortcutBadge from '@/components/ShortcutBadge.vue';

const props = defineProps<{
  pluginId: string;
  shortcutId: string;
  shortcut: PluginShortcut;
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
const editingDisplayKey = ref('');

// 표시할 단축키 키 배열
const displayKeys = computed(() => {
  const customKeys = props.config.shortcuts?.[props.shortcutId]?.keys;

  let keys = props.shortcut.keys;
  if (customKeys) {
    if (Array.isArray(customKeys) && customKeys.length > 0) {
      keys = customKeys;
    } else if (typeof customKeys === 'object') {
      const converted = Object.values(customKeys);
      if (converted.length > 0) {
        keys = converted;
      }
    }
  }

  return keys;
});

// 커스텀 키가 있는지
const hasCustomKeys = computed(() => {
  return !!props.config.shortcuts?.[props.shortcutId]?.keys;
});

// 팝오버 열기
const openPopover = () => {
  isEditing.value = true;
  editingKeys.value = [];
  editingDisplayKey.value = '';
};

// 팝오버 닫기
const closePopover = () => {
  isEditing.value = false;
};

// 키 조합 캡처
const captureKey = (event: KeyboardEvent) => {
  const keys: ShortcutKey[] = [];

  // Modifier keys
  if (event.metaKey || event.ctrlKey) keys.push('Cmd');
  if (event.shiftKey) keys.push('Shift');
  if (event.altKey) keys.push('Alt');

  // Regular key
  if (!['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
    keys.push(event.key.toUpperCase());
  }

  if (keys.length > 1) {
    editingKeys.value = keys;
    editingDisplayKey.value = shortcutManager.format(keys);
  }
};

// keyup에서 저장
const saveOnKeyUp = async (event: KeyboardEvent) => {
  // 수정자 키만 눌렀을 때는 저장하지 않음
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
    return;
  }

  // 유효한 키 조합이 있으면 저장
  if (editingKeys.value.length > 1) {
    await manager.updateShortcutKeys(
      props.pluginId,
      props.shortcutId,
      editingKeys.value
    );

    emit('updated');
    closePopover();
  }
};

// 리셋
const handleReset = async () => {
  await manager.resetShortcutKeys(props.pluginId, props.shortcutId);
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
.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--card-bg-hover, #f9fafb);
  border-radius: 8px;
  gap: 16px;
}

.shortcut-info {
  flex: 1;
}

.shortcut-name {
  font-size: 14px;
  font-weight: 500;
  margin: 0 0 4px 0;
  color: var(--font-color-1, #1a1a1a);
}

.shortcut-description {
  font-size: 12px;
  color: var(--font-color-2, #666);
  margin: 0;
}

.shortcut-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 단축키 버튼 및 팝오버 */
.shortcut-key-wrapper {
  position: relative;
}

/* 팝오버 */
.popover-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

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

/* Reset 버튼 */
.btn-reset {
  padding: 6px 10px;
  background: var(--border-color, #e5e7eb);
  color: var(--font-color-1, #1a1a1a);
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-reset:hover {
  background: #d1d5db;
}



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
}
</style>