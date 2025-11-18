<template>
  <div class="plugin-card" :class="{ 'has-execute': plugin.onExecute }" @click="handleCardClick">
    <div class="plugin-info">
      <div class="plugin-header">
        <div ref="iconContainer" class="plugin-icon"></div>
        <div class="plugin-title">
          <div class="plugin-title-wrap">
            <TierTag :tier="plugin.tier"/>
            <h3 class="plugin-name">{{ plugin.name }}</h3>
          </div>
          <p class="plugin-description">{{ plugin.description }}</p>
          <div v-if="executeShortcutKeys" class="execute-shortcut">
            <ShortcutBadge :keys="executeShortcutKeys" variant="badge" :font-size="10" />
          </div>
        </div>
      </div>
    </div>

    <div class="plugin-extra">
      <ToggleSwitch
        :model-value="enabled"
        @update:model-value="$emit('toggle', plugin.id)"
        @click.stop
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { Plugin, PluginState } from '@/types';
import { PluginManager } from '@/core';
import ToggleSwitch from '@/components/ToggleSwitch.vue';
import TierTag from '@/components/TierTag.vue';
import ShortcutBadge from '@/components/ShortcutBadge.vue';

const manager = PluginManager.getInstance();
const iconContainer = ref<HTMLDivElement>();
const pluginState = ref<PluginState | null>(null);

const props = defineProps<{
  plugin: Plugin;
  enabled: boolean;
}>();

const emit = defineEmits<{
  toggle: [pluginId: string];
  execute: [pluginId: string];
}>();

// 등록된 execute 단축키가 있는지 확인
const executeShortcutKeys = computed(() => {
  if (!props.plugin.onExecute || !pluginState.value) return null;
  const keys = pluginState.value.shortcuts?.['execute']?.keys;
  return keys && keys.length > 0 ? keys : null;
});

const handleCardClick = () => {
  if (props.plugin.onExecute) {
    emit('execute', props.plugin.id);
  }
};

onMounted(async () => {
  if (props.plugin.icon && iconContainer.value) {
    props.plugin.icon(iconContainer.value);
  }

  // 플러그인 상태 로드
  pluginState.value = await manager.getPluginState(props.plugin.id);
})

</script>

<style scoped>
.plugin-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 14px;
  border: 1px solid var(--border-color);
  background-color: var(--card-bg-color);
  transition: all 0.2s;
  border-radius: 16px;
  cursor: pointer;
}

.plugin-card.has-execute {
  cursor: pointer;
}

.plugin-card:hover {
  border: 1px solid var(--purple);
  background-color: var(--card-bg-hover);
  transform: translateY(-2px);
  z-index: 2;
}

.plugin-info {
  display: flex;
  align-items: start;
  justify-content: start;
  gap: 10px;
  flex: 1;
}

.plugin-header {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 4px;
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