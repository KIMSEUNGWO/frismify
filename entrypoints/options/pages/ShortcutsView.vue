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
        :key="plugin.meta.id"
        class="plugin-shortcut-section"
      >
        <div class="section-header">
          <div class="plugin-title-row">
            <div ref="iconContainer" class="plugin-icon-small"></div>
            <h2 class="plugin-name">{{ plugin.meta.name }}</h2>
            <span class="plugin-version">v{{ plugin.meta.version }}</span>
          </div>
        </div>

        <!-- 단축키 목록 -->
        <div class="shortcuts-grid">
          <div
            v-for="shortcut in plugin.meta.shortcuts"
            :key="shortcut.id"
            class="shortcut-item"
          >
            <div class="shortcut-info">
              <h3 class="shortcut-name">{{ shortcut.name }}</h3>
              <p class="shortcut-description">{{ shortcut.description }}</p>
            </div>

            <div class="shortcut-controls">
              <!-- 단축키 표시 -->
              <div class="shortcut-key">
                {{
                  getShortcutKey(config, shortcut.id) || formatShortcutForDisplay(shortcut.key)
                }}
              </div>

              <!-- 활성화/비활성화 토글 -->
              <ToggleSwitch
                :model-value="isShortcutEnabled(config, shortcut.id)"
                @update:model-value="toggleShortcut(plugin.meta.id, shortcut.id, $event)"
              />

              <!-- 커스터마이징 버튼 -->
              <button
                class="btn-customize"
                @click="openCustomizeDialog(plugin.meta.id, shortcut)"
              >
                Customize
              </button>

              <!-- 리셋 버튼 -->
              <button
                v-if="hasCustomShortcut(config, shortcut.id)"
                class="btn-reset"
                @click="resetShortcut(plugin.meta.id, shortcut.id)"
                title="Reset to default"
              >
                ↻
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 커스터마이징 다이얼로그 -->
    <div v-if="customizeDialog.isOpen" class="dialog-overlay" @click="closeCustomizeDialog">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h3>Customize Shortcut</h3>
          <button class="btn-close" @click="closeCustomizeDialog">×</button>
        </div>

        <div class="dialog-body">
          <p class="dialog-subtitle">{{ customizeDialog.shortcut?.name }}</p>
          <p class="dialog-description">{{ customizeDialog.shortcut?.description }}</p>

          <div class="key-input-group">
            <label>Shortcut</label>
            <input
              type="text"
              :value="isMac ? customizeDialog.customKey.mac : customizeDialog.customKey.windows"
              :placeholder="isMac ? 'e.g., ⌘⇧K' : 'e.g., Ctrl+Shift+K'"
              class="key-input"
              @keydown.prevent="captureKey(isMac ? 'mac' : 'windows', $event)"
              readonly
            />
          </div>

          <p class="hint">Press any key combination to set the shortcut</p>
        </div>

        <div class="dialog-footer">
          <button class="btn-secondary" @click="closeCustomizeDialog">Cancel</button>
          <button class="btn-primary" @click="saveCustomShortcut">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { pluginRegistry } from '@/plugins/registry';
import { settingsManager } from '@/utils/settings-manager';
import type { AppSettings } from '@/utils/settings-manager';
import type { PluginShortcut, PluginConfig } from '@/plugins/types';
import ToggleSwitch from '@/components/ToggleSwitch.vue';
import { formatShortcutForDisplay, toMacShortcutText, toWindowsShortcut } from '@/utils/shortcut-utils';
import { isMac } from '@/utils/platform';


const pluginsWithShortcuts = ref(
  pluginRegistry.getAllPluginsWithConfig().filter(({ plugin }) =>
    plugin.meta.shortcuts && plugin.meta.shortcuts.length > 0
  )
);

// 커스터마이징 다이얼로그 상태
const customizeDialog = ref<{
  isOpen: boolean;
  pluginId: string | null;
  shortcut: PluginShortcut | null;
  customKey: { windows: string; mac: string };
}>({
  isOpen: false,
  pluginId: null,
  shortcut: null,
  customKey: { windows: '', mac: '' },
});

// 설정 변경 감지
const handleSettingsChange = (settings: AppSettings) => {
  pluginsWithShortcuts.value = pluginRegistry.getAllPluginsWithConfig().filter(({ plugin }) =>
    plugin.meta.shortcuts && plugin.meta.shortcuts.length > 0
  );
};

// 단축키 활성화 여부 확인
const isShortcutEnabled = (config: PluginConfig, shortcutId: string): boolean => {
  return config.shortcuts?.[shortcutId]?.enabled ?? true;
};

// 커스텀 단축키 가져오기
const getShortcutKey = (config: PluginConfig, shortcutId: string): string | null => {
  const customKey = config.shortcuts?.[shortcutId]?.customKey;
  if (!customKey) return null;
  return isMac() ? customKey.mac : customKey.windows;
};

// 커스텀 단축키 존재 여부
const hasCustomShortcut = (config: PluginConfig, shortcutId: string): boolean => {
  return !!config.shortcuts?.[shortcutId]?.customKey;
};

// 단축키 활성화/비활성화
const toggleShortcut = async (pluginId: string, shortcutId: string, enabled: boolean) => {
  await settingsManager.updatePluginShortcut(pluginId, shortcutId, undefined, enabled);
};

// 커스터마이징 다이얼로그 열기
const openCustomizeDialog = (pluginId: string, shortcut: PluginShortcut) => {
  const config = settingsManager.getPluginConfig(pluginId);
  const customKey = config?.shortcuts?.[shortcut.id]?.customKey;

  customizeDialog.value = {
    isOpen: true,
    pluginId,
    shortcut,
    customKey: customKey || {
      windows: toWindowsShortcut(shortcut.key),
      mac: toMacShortcutText(shortcut.key),
    },
  };
};

// 커스터마이징 다이얼로그 닫기
const closeCustomizeDialog = () => {
  customizeDialog.value = {
    isOpen: false,
    pluginId: null,
    shortcut: null,
    customKey: { windows: '', mac: '' },
  };
};

// 키 조합 캡처
const captureKey = (platform: 'windows' | 'mac', event: KeyboardEvent) => {
  const parts: string[] = [];

  // Chrome Commands API 호환 텍스트 형식으로 저장
  if (platform === 'mac') {
    if (event.metaKey) parts.push('Command');
    if (event.ctrlKey) parts.push('MacCtrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
  } else {
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
  }

  // 실제 키 추가 (modifier 키가 아닌 경우)
  if (!['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
    parts.push(event.key.toUpperCase());
  }

  if (parts.length > 0) {
    // 저장은 텍스트 형식으로, 표시는 formatShortcutForDisplay가 알아서 처리
    customizeDialog.value.customKey[platform] = parts.join('+');
  }
};

// 커스텀 단축키 저장
const saveCustomShortcut = async () => {
  if (!customizeDialog.value.pluginId || !customizeDialog.value.shortcut) return;

  // 현재 OS가 아닌 다른 OS의 단축키는 기존 값 유지
  const config = settingsManager.getPluginConfig(customizeDialog.value.pluginId);
  const existingCustomKey = config?.shortcuts?.[customizeDialog.value.shortcut.id]?.customKey;

  const newCustomKey = {
    windows: isMac()
      ? (existingCustomKey?.windows || toWindowsShortcut(customizeDialog.value.shortcut.key))
      : customizeDialog.value.customKey.windows,
    mac: isMac()
      ? customizeDialog.value.customKey.mac
      : (existingCustomKey?.mac || toMacShortcutText(customizeDialog.value.shortcut.key)),
  };

  await settingsManager.updatePluginShortcut(
    customizeDialog.value.pluginId,
    customizeDialog.value.shortcut.id,
    newCustomKey,
    undefined
  );

  closeCustomizeDialog();
};

// 단축키 리셋
const resetShortcut = async (pluginId: string, shortcutId: string) => {
  await settingsManager.updatePluginShortcut(pluginId, shortcutId, undefined, true);

  // customKey를 undefined로 설정하기 위해 config 직접 수정
  const config = settingsManager.getPluginConfig(pluginId);
  if (config?.shortcuts?.[shortcutId]) {
    delete config.shortcuts[shortcutId].customKey;
  }
};

onMounted(async () => {
  await settingsManager.initialize();
  settingsManager.addChangeListener(handleSettingsChange);

  pluginsWithShortcuts.value = pluginRegistry.getAllPluginsWithConfig().filter(({ plugin }) =>
    plugin.meta.shortcuts && plugin.meta.shortcuts.length > 0
  );

  // 아이콘 그리기
  pluginsWithShortcuts.value.forEach(({ plugin }, index) => {
    const containers = document.querySelectorAll('.plugin-icon-small');
    if (containers[index]) {
      plugin.meta.drawIcon(containers[index] as HTMLDivElement);
    }
  });
});

onUnmounted(() => {
  settingsManager.removeChangeListener(handleSettingsChange);
});
</script>

<style scoped>
.shortcuts-view {
  padding: 32px;
  max-width: 1200px;
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
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
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
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--card-bg-hover, #f9fafb);
  border-radius: 8px;
  gap: 16px;
}

.shortcut-info {
  flex: 1;
}

.shortcut-name {
  font-size: 14px;
  font-weight: 500;
  margin: 0 0 4px 0;
  color: var(--font-color-1, #1a1a1a);
}

.shortcut-description {
  font-size: 12px;
  color: var(--font-color-2, #666);
  margin: 0;
}

.shortcut-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.shortcut-key {
  padding: 6px 12px;
  background: var(--card-bg-color, #fff);
  border: 1px solid var(--border-color, #d1d5db);
  border-radius: 6px;
  font-size: 13px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-weight: 500;
  color: var(--purple, #8b5cf6);
  min-width: 120px;
  text-align: center;
}

.btn-customize {
  padding: 6px 12px;
  background: var(--purple, #8b5cf6);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-customize:hover {
  background: #7c3aed;
}

.btn-reset {
  padding: 6px 10px;
  background: var(--border-color, #e5e7eb);
  color: var(--font-color-1, #1a1a1a);
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-reset:hover {
  background: #d1d5db;
}

/* Dialog */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: var(--card-bg-color, #fff);
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--font-color-1, #1a1a1a);
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--font-color-2, #666);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: var(--border-color, #e5e7eb);
}

.dialog-body {
  padding: 24px;
}

.dialog-subtitle {
  font-size: 16px;
  font-weight: 500;
  margin: 0 0 4px 0;
  color: var(--font-color-1, #1a1a1a);
}

.dialog-description {
  font-size: 14px;
  color: var(--font-color-2, #666);
  margin: 0 0 24px 0;
}

.key-input-group {
  margin-bottom: 16px;
}

.key-input-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--font-color-1, #1a1a1a);
}

.key-input {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid var(--border-color, #d1d5db);
  border-radius: 6px;
  font-size: 14px;
  font-family: 'Monaco', 'Menlo', monospace;
  background: var(--card-bg-hover, #f9fafb);
  color: var(--font-color-1, #1a1a1a);
  transition: all 0.2s;
}

.key-input:focus {
  outline: none;
  border-color: var(--purple, #8b5cf6);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}

.hint {
  font-size: 12px;
  color: var(--font-color-2, #666);
  margin: 12px 0 0 0;
  font-style: italic;
}

.dialog-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color, #e5e7eb);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-primary,
.btn-secondary {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--purple, #8b5cf6);
  color: white;
}

.btn-primary:hover {
  background: #7c3aed;
}

.btn-secondary {
  background: var(--border-color, #e5e7eb);
  color: var(--font-color-1, #1a1a1a);
}

.btn-secondary:hover {
  background: #d1d5db;
}
</style>