<template>
  <MenuView />
  <main>
    <RouterView />
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { pluginRegistry } from '@/plugins/registry';
import { storage } from 'wxt/utils/storage';
import PluginSettings from './components/PluginSettings.vue';
import ShortcutSettings from "@/entrypoints/options/components/ShortcutSettings.vue";
import MenuView from "@/entrypoints/options/components/MenuView.vue";

const selectedView = ref('general');
const plugins = ref(pluginRegistry.findAll());
const globalSettings = ref({
  autoUpdate: true,
  notifications: true,
});

const saveGlobalSettings = async () => {
  await storage.setItem('local:global:settings', globalSettings.value);
  alert('설정이 저장되었습니다!');
};

onMounted(async () => {
  // const saved = await storage.getItem('local:global:settings');
  // if (saved) {
  //   globalSettings.value = saved;
  // }
});
</script>

<style scoped>
main {
  padding-left: 260px;
  width: 100vw;
}
</style>
