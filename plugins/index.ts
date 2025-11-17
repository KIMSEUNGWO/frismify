
import { pluginRegistry } from '@/plugins/registry'
import { plugins } from "@/plugins/implementations";
import { settingsManager } from '@/utils/settings-manager';

plugins.filter(plugin => pluginRegistry.register(plugin))
    .forEach(async (plugin) => {
        // 설정 초기화 (처음 등록 시)
        // Storage를 먼저 확인하여 기존 설정이 있으면 유지
        await settingsManager.initializePlugin(plugin.meta);
        console.log(`✅ Registered plugin: ${plugin.meta.name} (${plugin.meta.id})`);
    })

// 개발 중 확인
console.log('📦 Total plugins loaded:', pluginRegistry.findAll().length);
console.log('⌨️ Plugins with shortcuts:', pluginRegistry.findAllWithHasShortcuts().length);