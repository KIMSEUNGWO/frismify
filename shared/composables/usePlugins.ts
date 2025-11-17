import { ref, onMounted } from 'vue';
import { storage } from 'wxt/storage';
import { pluginRegistry } from '@/plugins/registry';
import type { Plugin } from '@/plugins/types';


export function usePlugins() {
    const plugins = ref<Plugin[]>([]);
    const pluginStates = ref<Record<string, boolean>>({});
    const loading = ref(true);

    const loadPlugins = () => {
        plugins.value = pluginRegistry.findAll();
    }

    const loadPluginStates = async () => {
        const states = Record<string, boolean>() = {};

        for (const plugin of plugins.value) {
            const enabled = await storage.getItem<boolean>(
                `local:plugin:${plugin.metadata.id}`,
                false
            );
            states[plugin.metadata.id] = enabled;
        }

        pluginStates.value = states;
        loading.value = false;
    }

    const togglePlugin = async (pluginId: string) => {
        const newState = !pluginStates.value[pluginId];

        await storage.setItem(`local:plugin:${pluginId}`, newState);

        await browser.runtime.sendMessage({
            type: 'TOGGLE_PLUGIN',
            pluginId,
            enabled: newState,
        });

        pluginStates.value[pluginId] = newState;
    };

    onMounted(async () => {
        loadPlugins();
        await loadPluginStates()
    })

    return {
        plugins,
        pluginStates,
        loading,
        togglePlugin,
        loadPlugins,
        loadPluginStates,
    }
}