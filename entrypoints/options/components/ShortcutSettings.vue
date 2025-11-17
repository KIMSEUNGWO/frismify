<template>
  <div class="shortcut-settings">
    <h3>단축키 설정</h3>
    <p class="description">
      플러그인을 단축키로 빠르게 토글할 수 있습니다.
      <a href="#" @click.prevent="openChromeShortcuts">브라우저 설정</a>에서 단축키를 변경할 수 있습니다.
    </p>

    <div class="shortcut-list">
      <template v-for="plugin in pluginsWithShortcuts" :key="plugin.meta.id">
        <div
            v-for="shortcut in plugin.meta.shortcuts"
            :key="`${plugin.meta.id}-${shortcut.id}`"
            class="shortcut-item"
        >
          <div class="shortcut-info">
            <div class="plugin-icon-wrapper" v-html="getPluginIcon(plugin.meta)"></div>
            <div>
              <div class="plugin-name">{{ plugin.meta.name }}</div>
              <div class="shortcut-description">
                {{ shortcut.description }}
              </div>
            </div>
          </div>

          <div class="shortcut-keys">
            <kbd>{{ formatShortcut(shortcut.key) }}</kbd>
          </div>
        </div>
      </template>
    </div>

    <div v-if="pluginsWithShortcuts.length === 0" class="empty-state">
      단축키가 설정된 플러그인이 없습니다.
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { pluginRegistry } from '@/plugins/registry';
import { formatShortcutForDisplay } from '@/utils/shortcut-utils';
import type { ShortcutKey } from '@/utils/shortcut-utils';
import type { PluginMetaData } from '@/plugins/types';

const pluginsWithShortcuts = computed(() =>
    pluginRegistry.findAllWithHasShortcuts()
);

const formatShortcut = (keys: ShortcutKey[]) => {
  return formatShortcutForDisplay(keys);
};

const getPluginIcon = (meta: PluginMetaData) => {
  const div = document.createElement('div');
  meta.drawIcon(div);
  return div.innerHTML;
};

const openChromeShortcuts = () => {
  // Chrome: chrome://extensions/shortcuts
  // Firefox: about:addons > 톱니바퀴 > 확장 기능 단축키 관리
  window.open('chrome://extensions/shortcuts', '_blank');
};
</script>

<style scoped>
.shortcut-settings {
  margin-bottom: 32px;
}

.shortcut-settings h3 {
  font-size: 18px;
  margin: 0 0 8px 0;
}

.description {
  color: #6b7280;
  margin-bottom: 20px;
  line-height: 1.6;
}

.description a {
  color: #3b82f6;
  text-decoration: none;
}

.description a:hover {
  text-decoration: underline;
}

.shortcut-list {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.shortcut-item:last-child {
  border-bottom: none;
}

.shortcut-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.plugin-icon-wrapper {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  overflow: hidden;
}

.plugin-icon-wrapper >>> div {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.plugin-name {
  font-weight: 600;
  margin-bottom: 2px;
}

.shortcut-description {
  font-size: 13px;
  color: #6b7280;
}

.shortcut-keys {
  display: flex;
  align-items: center;
  gap: 8px;
}

kbd {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 6px 10px;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  white-space: nowrap;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: #9ca3af;
}
</style>