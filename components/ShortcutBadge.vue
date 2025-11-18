<template>
  <div
    :class="['shortcut-badge', `variant-${variant}`, { clickable : variant === 'button' }]"
    @click="handleClick"
  >
    <span class="key" v-for="key in displayKeys" :key="key" :style="{ fontSize: fontSize + 'px' }">{{ key }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ShortcutManager } from '@/core';
import type { ShortcutKey } from '@/types';

const props = defineProps({
  keys: {
    type: Array<ShortcutKey>,
    required: true,
  },
  variant: {
    type: String as PropType<'badge' | 'button'>,
    default: 'badge',
    validator: (value: string) => ['badge', 'button'].includes(value),
  },
  fontSize: {
    type: Number,
    default: 14,
    required: false
  }
});

const emit = defineEmits<{
  click: [];
}>();

const shortcutManager = ShortcutManager.getInstance();

const displayKeys = computed(() => {
  return shortcutManager.format(props.keys).split('');
});

const handleClick = (event: MouseEvent) => {
  if (props.variant === 'button') {
    emit('click');
  }
};
</script>

<style scoped>

.shortcut-badge {
  font-family: ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;
  font-weight: 500;
  transition: all .15s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background-color: var(--bg-darker);
  border: 1px solid var(--border-color);
}
.shortcut-badge .key {
  margin: 0 2px;
  color: var(--font-color-2);
}
.shortcut-badge.variant-button:hover .key {
  color: var(--font-color-1);
}

/* Badge variant - 작은 뱃지 스타일 (Popup용) */
.variant-badge {
  padding: 4px 8px;
}

/* Button variant - 버튼 스타일 (Options용) */
.variant-button {
  padding: 4px 8px;
  text-align: center;
  min-width: 80px;
}

/* Clickable 스타일 */
.clickable {
  cursor: pointer;
}

.variant-button.clickable:hover {
  border-color: var(--purple, #8b5cf6);
  background: rgba(139, 92, 246, 0.04);
}
</style>