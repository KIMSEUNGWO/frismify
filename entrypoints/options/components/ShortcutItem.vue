<template>
  <div class="shortcut-item">
    <div class="shortcut-info">
      <h3 class="shortcut-name">{{ shortcut.name }}</h3>
      <p class="shortcut-description">{{ shortcut.description }}</p>
    </div>

    <ShortcutEdit
      :plugin-id="pluginId"
      :shortcut-id="shortcutId"
      :config="config"
      @updated="emit('updated')"
    />
  </div>
</template>

<script setup lang="ts">
import type { PluginShortcut, PluginState } from '@/types';
import ShortcutEdit from './ShortcutEdit.vue';

defineProps<{
  pluginId: string;
  shortcutId: string;
  shortcut: PluginShortcut;
  config: PluginState;
}>();

const emit = defineEmits<{
  updated: [];
}>();
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
</style>