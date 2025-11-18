<template>
  <div class="shortcuts-view">
    <div class="shortcuts-header">
      <h1>Shortcuts</h1>
      <p class="subtitle">Customize keyboard shortcuts for each plugin</p>
    </div>

    <!-- 플러그인별 단축키 목록 -->
    <div class="shortcuts-list">
      <div
        v-for="{ plugin, config } in pluginsWithShortcuts"
        :key="plugin.id"
        class="plugin-shortcut-section"
      >
        <div class="section-header">
          <div class="plugin-title-row">
            <div ref="iconContainer" class="plugin-icon-small"></div>
            <h2 class="plugin-name">{{ plugin.name }}</h2>
            <span class="plugin-version">v{{ plugin.version }}</span>
          </div>
          <ShortcutEdit
              v-if="plugin.onExecute?.shortcut"
              :plugin-id="plugin.id"
              shortcut-id="execute"
              :shortcut="plugin.onExecute.shortcut"
              :config="config"
              @updated="loadPlugins"
          />
        </div>

        <!-- 단축키 목록 -->
        <div class="shortcuts-grid" v-if="plugin.shortcuts">
          <ShortcutItem
            v-for="(shortcut, shortcutId) in plugin.shortcuts"
            :key="String(shortcutId)"
            :plugin-id="plugin.id"
            :shortcut-id="String(shortcutId)"
            :shortcut="shortcut"
            :config="config"
            @updated="loadPlugins"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { PluginManager } from '@/core';
import { registerPlugins } from '@/plugins';
import type { AppState, Plugin, PluginState } from '@/types';
import ShortcutItem from '../components/ShortcutItem.vue';
import ShortcutEdit from "@/entrypoints/options/components/ShortcutEdit.vue";

const manager = PluginManager.getInstance();

const pluginsWithShortcuts = ref<Array<{ plugin: Plugin; config: PluginState }>>([]);

// 플러그인 로드
const loadPlugins = async () => {
  const plugins = manager.getPlugins().filter(p => p.shortcuts || p.onActivate);
  const result = [];

  for (const plugin of plugins) {
    const config = await manager.getPluginState(plugin.id);
    if (config) {
      result.push({ plugin, config });
    }
  }

  pluginsWithShortcuts.value = result;
};

// 설정 변경 감지
const handleSettingsChange = async (state: AppState) => {
  console.log('[ShortcutsView] 설정 변경 감지!!', state);
  await loadPlugins();
};

onMounted(async () => {
  // 플러그인 등록 (Options 컨텍스트에서)
  await registerPlugins();

  await loadPlugins();
  manager.addListener(handleSettingsChange);

  // 아이콘 그리기
  setTimeout(() => {
    pluginsWithShortcuts.value.forEach(({ plugin }, index) => {
      const containers = document.querySelectorAll('.plugin-icon-small');
      if (containers[index] && plugin.icon) {
        plugin.icon(containers[index] as HTMLDivElement);
      }
    });
  }, 100);
});

onUnmounted(() => {
  manager.removeListener(handleSettingsChange);
});
</script>

<style scoped>
.shortcuts-view {
  padding: 32px;
  max-width: 1000px;
  margin: 0 auto;
}

.shortcuts-header {
  margin-bottom: 32px;
}

.shortcuts-header h1 {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: var(--font-color-1, #1a1a1a);
}

.subtitle {
  font-size: 16px;
  color: var(--font-color-2, #666);
  margin: 0;
}

.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.plugin-shortcut-section {
  background: var(--card-bg-color, #fff);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 12px;
  padding: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.plugin-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.plugin-icon-small {
  width: 32px;
  height: 32px;
  border-radius: 6px;
}

.plugin-name {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: var(--font-color-1, #1a1a1a);
}

.plugin-version {
  font-size: 12px;
  color: var(--font-color-2, #666);
  background: var(--border-color, #e5e7eb);
  padding: 2px 8px;
  border-radius: 4px;
}

.shortcuts-grid {
  margin-top: 26px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
