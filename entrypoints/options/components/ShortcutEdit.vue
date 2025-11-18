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
import type { PluginShortcut, ShortcutKey, PluginState } from '@/types';
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
const editingDisplayKey = ref('');

// 표시할 단축키 키 배열 (등록된 키만)
const displayKeys = computed(() => {
  const keys = props.config.shortcuts?.[props.shortcutId]?.keys;
  return keys && keys.length > 0 ? keys : null;
});

// 단축키가 등록되어 있는지
const hasShortcut = computed(() => {
  return !!displayKeys.value;
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
}
</style>