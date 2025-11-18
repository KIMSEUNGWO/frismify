
<template>
  <div class="plugin-card">
    <div class="plugin-card-header">
      <div class="plugin-info">
        <div ref="iconContainer" class="plugin-icon-container"></div>
        <div class="plugin-title-wrap" :class="{ disabled : !config.enabled }">
          <div class="plugin-title">
            <TierTag :tier="plugin.tier"/>
            <h3 class="plugin-name">{{ plugin.name }}</h3>
          </div>
          <p class="plugin-description">{{ plugin.description }}</p>
        </div>
      </div>
      <ToggleSwitch
          :model-value="config.enabled"
          @update:model-value="togglePlugin(plugin.id, $event)"
      />
    </div>

    <!-- 설정 옵션들 -->
    <div v-if="config.enabled && plugin.settings" class="plugin-settings">
      <div
          v-for="(setting, settingId) in plugin.settings"
          :key="String(settingId)"
          class="setting-item"
      >
        <div class="setting-info" :class="{ disabled : setting.type !== 'boolean' ? false : !(config.settings?.[settingId] ?? setting.defaultValue)}">
          <label class="setting-name">{{ setting.label }}</label>
          <p class="setting-description">{{ setting.description }}</p>
        </div>

        <!-- Boolean 타입 -->
        <ToggleSwitch
            v-if="setting.type === 'boolean'"
            :model-value="config.settings?.[String(settingId)] ?? setting.defaultValue"
            @update:model-value="updateSetting(plugin.id, String(settingId), $event)"
        />

        <!-- String/Number 타입 -->
        <input
            v-else-if="setting.type === 'string' || setting.type === 'number'"
            :type="setting.type === 'number' ? 'number' : 'text'"
            :value="config.settings?.[String(settingId)] ?? setting.defaultValue"
            @input="updateSetting(plugin.id, String(settingId), ($event.target as HTMLInputElement).value)"
            class="setting-input"
        />

        <!-- Select 타입 -->
        <select
            v-else-if="setting.type === 'select'"
            :value="config.settings?.[String(settingId)] ?? setting.defaultValue"
            @change="updateSetting(plugin.id, String(settingId), ($event.target as HTMLSelectElement).value)"
            class="setting-select"
        >
          <option
              v-for="opt in setting.options"
              :key="opt.value"
              :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">

import type {Plugin, PluginState} from "@/types";
import {onMounted, ref} from "vue";
import TierTag from "@/components/TierTag.vue";
import ToggleSwitch from "@/components/ToggleSwitch.vue";
import {PluginManager} from "@/core";

const iconContainer = ref<HTMLDivElement>();
const props = defineProps<{
  plugin: Plugin;
  config: PluginState;
}>();

const manager = PluginManager.getInstance();

// 플러그인 활성화/비활성화
const togglePlugin = async (pluginId: string, enabled: boolean) => {
  if (enabled) {
    await manager.enablePlugin(pluginId);
  } else {
    await manager.disablePlugin(pluginId);
  }
};

// 설정값 업데이트
const updateSetting = async (pluginId: string, settingId: string, value: any) => {
  await manager.updateSetting(pluginId, settingId, value);
};


onMounted(() => {
  if (props.plugin.icon && iconContainer.value) {
    props.plugin.icon(iconContainer.value);
  }
})
</script>


<style scoped>

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
  align-items: center;
  gap: 16px;
}

.plugin-info {
  display: flex;
  align-items: flex-start;
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
  color: var(--font-color-1);
}

.plugin-description {
  font-size: 14px;
  color: var(--font-color-2);
  margin-top: 4px;
}

.plugin-title {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-start;
}

.plugin-settings {
  margin-top: 26px;
  border-top: 1px solid var(--border-color);
  padding-top: 20px;
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

.disabled {
  h1,h2,h3,h4,h5,h6,span,p,pre,label {
    color: var(--font-disabled);
  }
}
</style>