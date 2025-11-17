<template>
  <div class="tools-view">
    <div class="tools-header">
      <h1>Tools</h1>
      <p class="subtitle">Configure and customize each tool's behavior and settings</p>
    </div>

    <!-- 플러그인 리스트 -->
    <div class="plugins-grid">
      <div
        v-for="{ plugin, config } in pluginsWithConfig"
        :key="plugin.meta.id"
        class="plugin-card"
      >
        <div class="plugin-card-header">
          <div class="plugin-info">
            <div ref="iconContainer" class="plugin-icon-container"></div>
            <div>
              <h3 class="plugin-name">{{ plugin.meta.name }}</h3>
              <p class="plugin-description">{{ plugin.meta.description }}</p>
              <span class="plugin-tier" :class="plugin.meta.tier">{{ plugin.meta.tier }}</span>
            </div>
          </div>
          <ToggleSwitch
            :model-value="config.enabled"
            @update:model-value="togglePlugin(plugin.meta.id, $event)"
          />
        </div>

        <!-- 설정 옵션들 -->
        <div v-if="config.enabled && plugin.meta.settingOptions" class="plugin-settings">
          <div
            v-for="option in plugin.meta.settingOptions"
            :key="option.id"
            class="setting-item"
          >
            <div class="setting-info">
              <label class="setting-name">{{ option.name }}</label>
              <p class="setting-description">{{ option.description }}</p>
            </div>

            <!-- Boolean 타입 -->
            <ToggleSwitch
              v-if="option.type === 'boolean'"
              :model-value="config.settings?.[option.id] ?? option.defaultValue"
              @update:model-value="updateSetting(plugin.meta.id, option.id, $event)"
            />

            <!-- String/Number 타입 -->
            <input
              v-else-if="option.type === 'string' || option.type === 'number'"
              :type="option.type === 'number' ? 'number' : 'text'"
              :value="config.settings?.[option.id] ?? option.defaultValue"
              @input="updateSetting(plugin.meta.id, option.id, ($event.target as HTMLInputElement).value)"
              class="setting-input"
            />

            <!-- Select 타입 -->
            <select
              v-else-if="option.type === 'select'"
              :value="config.settings?.[option.id] ?? option.defaultValue"
              @change="updateSetting(plugin.meta.id, option.id, ($event.target as HTMLSelectElement).value)"
              class="setting-select"
            >
              <option
                v-for="opt in option.options"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { pluginRegistry } from '@/plugins/registry';
import { settingsManager } from '@/utils/settings-manager';
import type { AppSettings } from '@/utils/settings-manager';
import ToggleSwitch from '@/components/ToggleSwitch.vue';

const pluginsWithConfig = ref(pluginRegistry.getAllPluginsWithConfig());

// 설정 변경 감지 및 반영
const handleSettingsChange = (settings: AppSettings) => {
  pluginsWithConfig.value = pluginRegistry.getAllPluginsWithConfig();
};

// 플러그인 활성화/비활성화
const togglePlugin = async (pluginId: string, enabled: boolean) => {
  await settingsManager.setPluginEnabled(pluginId, enabled);
};

// 설정값 업데이트
const updateSetting = async (pluginId: string, settingId: string, value: any) => {
  await settingsManager.updatePluginSettings(pluginId, settingId, value);
};

onMounted(async () => {
  // 설정 매니저 초기화
  await settingsManager.initialize();

  // 설정 변경 리스너 등록
  settingsManager.addChangeListener(handleSettingsChange);

  // 초기 데이터 로드
  pluginsWithConfig.value = pluginRegistry.getAllPluginsWithConfig();

  // 아이콘 그리기
  pluginsWithConfig.value.forEach(({ plugin }, index) => {
    const containers = document.querySelectorAll('.plugin-icon-container');
    if (containers[index]) {
      plugin.meta.drawIcon(containers[index] as HTMLDivElement);
    }
  });
});

onUnmounted(() => {
  // 리스너 제거
  settingsManager.removeChangeListener(handleSettingsChange);
});
</script>

<style scoped>
.tools-view {
  padding: 32px;
  max-width: 1000px;
  margin: 0 auto;
}

.tools-header {
  margin-bottom: 32px;
}

.tools-header h1 {
  font-size: 32px;
  font-weight: 700;
  color: var(--font-color-1);
}

.subtitle {
  font-size: 16px;
  color: var(--font-color-2);
}

.plugins-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.plugin-card {
  background: var(--card-bg-color);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 20px;
  transition: all 0.2s;
}

.plugin-card:hover {
  border-color: var(--purple);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.1);
}

.plugin-card-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 16px;
}

.plugin-info {
  display: flex;
  gap: 12px;
  flex: 1;
}

.plugin-icon-container {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  flex-shrink: 0;
}

.plugin-name {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: var(--font-color-1, #1a1a1a);
}

.plugin-description {
  font-size: 14px;
  color: var(--font-color-2, #666);
  margin: 0 0 8px 0;
  line-height: 1.5;
}

.plugin-tier {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.plugin-tier.free {
  background: #10b981;
  color: white;
}

.plugin-tier.pro {
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  color: white;
}

.plugin-settings {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color, #e5e7eb);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.setting-info {
  flex: 1;
}

.setting-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--font-color-1, #1a1a1a);
  display: block;
  margin-bottom: 4px;
}

.setting-description {
  font-size: 12px;
  color: var(--font-color-2, #666);
  margin: 0;
}

.setting-input,
.setting-select {
  padding: 8px 12px;
  border: 1px solid var(--border-color, #d1d5db);
  border-radius: 6px;
  font-size: 14px;
  min-width: 200px;
  background: var(--card-bg-color, #fff);
  color: var(--font-color-1, #1a1a1a);
}

.setting-input:focus,
.setting-select:focus {
  outline: none;
  border-color: var(--purple, #8b5cf6);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}
</style>
