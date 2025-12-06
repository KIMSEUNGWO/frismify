<template>
  <div class="plugin-card" :class="{ 'has-execute': isExecutablePlugin(plugin) }" @click="handleCardClick">
    <div class="plugin-info">
      <div class="plugin-header">
        <div ref="iconContainer" class="plugin-icon"></div>
        <div class="plugin-title">
          <div class="plugin-title-wrap">
            <TierTag :tier="plugin.tier"/>
            <h3 class="plugin-name">{{ plugin.name }}</h3>
          </div>
          <p class="plugin-description">{{ plugin.description }}</p>
        </div>
      </div>
      <div v-if="executeShortcutKeys" class="execute-shortcut">
        <ShortcutBadge :keys="executeShortcutKeys" variant="badge" :font-size="10" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import {ExecutablePlugin, isModalPlugin, ModalPlugin, Plugin, PluginState} from '@/types';
import { isExecutablePlugin } from '@/types';
import { pluginManagerProxy } from '@/core/proxy/PluginManagerProxy';
import TierTag from '@/components/TierTag.vue';
import ShortcutBadge from '@/components/ShortcutBadge.vue';
import {modalManager} from "@/core/ModalManager";
import {MessageType} from "@/core/InstanceManager";

const iconContainer = ref<HTMLDivElement>();
const pluginState = ref<PluginState | undefined>(undefined);

const props = defineProps<{
  plugin: Plugin;
}>();

// 등록된 execute 단축키가 있는지 확인
const executeShortcutKeys = computed(() => {
  if (!isExecutablePlugin(props.plugin) || !pluginState.value) return null;
  const keys = pluginState.value.shortcuts?.['execute']?.keys;
  return keys && keys.length > 0 ? keys : null;
});

const handleCardClick = () => {
  if (isExecutablePlugin(props.plugin)) {
    executePlugin(props.plugin);
  } else if (isModalPlugin(props.plugin)) {
    openModalPlugin(props.plugin);
  }
};

onMounted(async () => {
  if (props.plugin.icon && iconContainer.value) {
    props.plugin.icon(iconContainer.value);
  }

  // 플러그인 상태 로드
  pluginState.value = await pluginManagerProxy.getPluginState(props.plugin.id);
})

// 플러그인 실행
const executePlugin = async (plugin: ExecutablePlugin) => {
  // Background로 메시지 전송
  await browser.runtime.sendMessage({
    type: MessageType.EXECUTE_PLUGIN,
    pluginId : plugin.id,
  });

  window.close();
}

const openModalPlugin = async (plugin: ModalPlugin) => {
  await browser.runtime.sendMessage({
    type: MessageType.OPEN_MODAL,
    pluginId : plugin.id,
  });

  window.close();
}

</script>

<style scoped>
.plugin-card {
  padding: 16px 14px;
  border: 1px solid var(--border-color);
  background-color: var(--card-bg-color);
  transition: all 0.2s;
  border-radius: 16px;
  cursor: pointer;
}

.plugin-card:hover {
  border: 1px solid var(--purple);
  background-color: var(--card-bg-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.1);
}

.plugin-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
}

.plugin-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.plugin-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
}

.plugin-title {
  flex: 1;
}

.plugin-name {
  font-size: 14px;
  font-weight: 600;
}

.plugin-description {
  font-size: 12px;
  margin-top: 2px;
}

.plugin-title-wrap {
  display: flex;
  gap: 6px;
  margin-bottom: 2px;
}

.execute-shortcut {
  margin-top: 6px;
}
</style>
