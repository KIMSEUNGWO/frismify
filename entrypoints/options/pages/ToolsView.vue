<template>
  <div class="tools-view">
    <div class="tools-header">
      <h1>Tools</h1>
      <p class="subtitle">Configure and customize each tool's behavior and settings</p>
    </div>

    <!-- 플러그인 리스트 -->
    <div class="plugins-grid">
      <OptionPluginCard
          v-for="{ plugin, config } in pluginsWithConfig"
          :key="plugin.id"
          :plugin="plugin"
          :config="config"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { pluginManagerProxy } from '@/core/proxy/PluginManagerProxy';
import { allPlugins } from '@/plugins';
import type {AppState, PluginState, Plugin} from '@/types';
import OptionPluginCard from "@/entrypoints/options/components/OptionPluginCard.vue";

const pluginsWithConfig = ref<Array<{ plugin: Plugin; config: PluginState }>>([]);

// 플러그인과 설정 로드
// 로컬 allPlugins 정의와 Proxy로 가져온 상태를 조합
const loadPlugins = async () => {
  const result = [];

  for (const plugin of allPlugins) {
    const config = await pluginManagerProxy.getPluginState(plugin.id);
    if (config) {
      result.push({ plugin, config }); // 로컬 plugin 정의 사용 (icon 함수 포함)
    }
  }

  pluginsWithConfig.value = result;
};

// 설정 변경 감지 및 반영
const handleSettingsChange = async (state: AppState) => {
  console.log('설정 변경 감지!!');
  await loadPlugins();
};

onMounted(async () => {
  // 초기 데이터 로드
  await loadPlugins();

  // 설정 변경 리스너 등록
  pluginManagerProxy.addListener(handleSettingsChange);

  // 아이콘 그리기
  const containers = document.querySelectorAll('.plugin-icon-container');
  pluginsWithConfig.value.forEach(({ plugin }, index) => {
    if (containers[index] && plugin.icon) {
      plugin.icon(containers[index] as HTMLDivElement);
    }
  });
});

onUnmounted(() => {
  // 리스너 제거
  pluginManagerProxy.removeListener(handleSettingsChange);
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
</style>
