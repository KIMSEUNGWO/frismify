<template>
  <div class="plugin-card">
    <div class="plugin-info">
      <div class="plugin-header">
        <div ref="iconContainer" class="plugin-icon"></div>
        <div class="plugin-title">
          <div class="plugin-title-wrap">
            <TierTag :tier="plugin.meta.tier"/>
            <h3 class="plugin-name">{{ plugin.meta.name }}</h3>
          </div>
          <p class="plugin-description">{{ plugin.meta.description }}</p>
        </div>
      </div>
    </div>

    <div class="plugin-extra">
      <ToggleSwitch
        :model-value="enabled"
        @update:model-value="$emit('toggle', plugin.meta.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Plugin } from '@/plugins/types';
import ToggleSwitch from '@/components/ToggleSwitch.vue';
import TierTag from "@/components/TierTag.vue";

const iconContainer = ref<HTMLDivElement>();

const props = defineProps<{
  plugin: Plugin;
  enabled: boolean;
}>();

defineEmits<{
  toggle: [pluginId: string];
}>();

onMounted(() => {
  props.plugin.meta.drawIcon(iconContainer.value!);
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

.plugin-name {
  font-size: 14px;
  font-weight: 600;
}

.plugin-description {
  font-size: 12px;
}

.plugin-title-wrap {
  display: flex;
  gap: 6px;
  margin-bottom: 2px;
}
</style>