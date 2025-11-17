<template>
  <div v-if="plugin">
    <div class="plugin-header">
      <span class="plugin-icon">{{ plugin.meta.icon }}</span>
      <div>
        <h2>{{ plugin.meta.name }}</h2>
        <p class="plugin-meta">
          v{{ plugin.meta.version }}
          <span v-if="plugin.meta.author">by {{ plugin.meta.author }}</span>
        </p>
      </div>
    </div>

    <p class="plugin-description">{{ plugin.meta.description }}</p>

    <div class="setting-group">
      <h3>플러그인 상태</h3>
      <label class="setting-item">
        <span>활성화</span>
        <input
            type="checkbox"
            v-model="enabled"
            @change="togglePlugin"
        />
      </label>
    </div>

    <div v-if="plugin.defaultSettings" class="setting-group">
      <h3>플러그인 설정</h3>
      <div
          v-for="(value, key) in settings"
          :key="key"
          class="setting-item"
      >
        <span>{{ formatSettingName(key) }}</span>
        <input
            v-if="typeof value === 'boolean'"
            type="checkbox"
            v-model="settings[key]"
        />
        <input
            v-else-if="typeof value === 'number'"
            type="number"
            v-model.number="settings[key]"
        />
        <input
            v-else
            type="text"
            v-model="settings[key]"
        />
      </div>
    </div>

    <button class="btn-primary" @click="saveSettings">
      설정 저장
    </button>
  </div>
  <div v-else>
    플러그인을 찾을 수 없습니다.
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { storage } from 'wxt/utils/storage';
import { pluginRegistry } from '@/plugins/registry';

const props = defineProps<{
  pluginId: string;
}>();

const plugin = computed(() => pluginRegistry.findById(props.pluginId));
const enabled = ref(false);
const settings = ref<Record<string, any>>({});

const formatSettingName = (key: string) => {
  return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
};

const loadSettings = async () => {
  if (!plugin.value) return;

  // 활성화 상태 로드
  enabled.value = await storage.getItem(`local:plugin:${props.pluginId}`) ?? false;

  // 설정 로드
  const saved = await storage.getItem(`local:plugin:${props.pluginId}:settings`);

  settings.value = saved || plugin.value.defaultSettings || {};
};

const togglePlugin = async () => {
  await storage.setItem(`local:plugin:${props.pluginId}`, enabled.value);

  // 백그라운드로 메시지 전송
  await browser.runtime.sendMessage({
    type: 'TOGGLE_PLUGIN',
    pluginId: props.pluginId,
    enabled: enabled.value,
  });
};

const saveSettings = async () => {
  await storage.setItem(
      `local:plugin:${props.pluginId}:settings`,
      settings.value
  );

  alert('설정이 저장되었습니다!');
};

watch(() => props.pluginId, loadSettings);

onMounted(loadSettings);
</script>

<style scoped>
.plugin-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.plugin-icon {
  font-size: 48px;
}

.plugin-header h2 {
  margin: 0;
  font-size: 28px;
}

.plugin-meta {
  margin: 4px 0 0 0;
  font-size: 14px;
  color: #6b7280;
}

.plugin-description {
  color: #4b5563;
  line-height: 1.6;
  margin-bottom: 32px;
}

.setting-group {
  margin-bottom: 32px;
  padding-bottom: 32px;
  border-bottom: 1px solid #e5e7eb;
}

.setting-group h3 {
  font-size: 18px;
  margin: 0 0 16px 0;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
}

.setting-item input[type="text"],
.setting-item input[type="number"] {
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  width: 200px;
}

.btn-primary {
  padding: 10px 24px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #2563eb;
}
</style>