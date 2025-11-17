import type { Plugin, PluginMetaData, PluginConfig } from '@/plugins/types';
import { settingsManager } from '../utils/settings-manager';
import { toCommandShortcut } from '../utils/shortcut-utils';

/**
 * 플러그인 레지스트리
 * 모든 플러그인을 중앙에서 관리
 */
class PluginRegistry {
    private plugins: Map<string, Plugin> = new Map();

    /**
     * 플러그인이 등록되어 있는지 확인
     */
    has(plugin: Plugin): boolean {
        return this.plugins.has(plugin.meta.id);
    }

    /**
     * 플러그인 등록
     */
    register(plugin: Plugin): boolean {
        if (this.has(plugin)) {
            console.warn(`Plugin ${plugin.meta.id} is already registered`);
            return false;
        }
        // 플러그인 등록
        this.plugins.set(plugin.meta.id, plugin);
        return true;
    }

    /**
     * 플러그인 등록 해제
     */
    unregister(pluginId: string): void {
        this.plugins.delete(pluginId);
        console.log(`Plugin unregistered: ${pluginId}`);
    }

    /**
     * 모든 플러그인 가져오기
     */
    findAll(): Plugin[] {
        return Array.from(this.plugins.values());
    }

    /**
     * ID로 플러그인 찾기
     */
    findById(id: string): Plugin | undefined {
        return this.plugins.get(id);
    }

    /**
     * 카테고리별 플러그인 찾기
     */
    findByCategory(category: string): Plugin[] {
        return this.findAll().filter((x) => x.meta.category === category);
    }

    /**
     * 티어별 플러그인 찾기
     */
    findByTier(tier: 'free' | 'pro'): Plugin[] {
        return this.findAll().filter((plugin) => plugin.meta.tier === tier);
    }

    /**
     * 활성화된 플러그인만 가져오기
     */
    getEnabledPlugins(): Plugin[] {
        return this.findAll().filter((plugin) =>
            settingsManager.isPluginEnabled(plugin.meta.id)
        );
    }

    /**
     * 단축키가 있는 플러그인만 반환
     */
    findAllWithHasShortcuts(): Plugin[] {
        return this.findAll().filter((x) => x.shortcuts && x.shortcuts.length > 0);
    }

    /**
     * 카테고리 목록 가져오기
     */
    getCategories(): string[] {
        const categories = new Set(
            this.findAll()
                .map((p) => p.meta.category)
                .filter((x) => x !== undefined)
        );
        return Array.from(categories);
    }

    /**
     * Chrome Commands API용 단축키 목록 생성
     */
    getCommands(): Record<string, any> {
        const commands: Record<string, any> = {};

        this.findAll().forEach((plugin) => {
            if (plugin.shortcuts && plugin.shortcuts.length > 0) {
                plugin.shortcuts.forEach((shortcut) => {
                    // 구분자를 '__'로 변경하여 파싱 문제 해결
                    const commandName = `${plugin.meta.id}__${shortcut.id}`;
                    const platformKeys = toCommandShortcut(shortcut.key);
                    commands[commandName] = {
                        suggested_key: {
                            windows: platformKeys.windows,
                            mac: platformKeys.mac,
                        },
                        description: shortcut.description || shortcut.name,
                    };
                });
            }
        });

        return commands;
    }

    /**
     * 커맨드 이름에서 플러그인 ID와 단축키 ID 추출
     */
    parseCommandName(commandName: string): { pluginId: string; shortcutId: string } | null {
        // '__' 구분자로 분리
        const parts = commandName.split('__');
        if (parts.length !== 2) return null;

        const pluginId = parts[0];
        const shortcutId = parts[1];

        return { pluginId, shortcutId };
    }

    /**
     * 모든 플러그인을 설정과 함께 가져오기
     */
    getAllPluginsWithConfig(): Array<{ plugin: Plugin; config: PluginConfig }> {
        return this.findAll()
            .map((plugin) => {
                const config = settingsManager.getPluginConfig(plugin.meta.id);
                return config ? { plugin, config } : null;
            })
            .filter((item): item is { plugin: Plugin; config: PluginConfig } => item !== null);
    }

    /**
     * 플러그인 메타데이터만 가져오기
     */
    getPluginMeta(pluginId: string): PluginMetaData | undefined {
        return this.plugins.get(pluginId)?.meta;
    }

    /**
     * 모든 플러그인 메타데이터 가져오기
     */
    getAllPluginMetas(): PluginMetaData[] {
        return this.findAll().map((plugin) => plugin.meta);
    }

    /**
     * 플러그인 검색 (이름 또는 설명으로)
     */
    searchPlugins(query: string): Plugin[] {
        const lowerQuery = query.toLowerCase();
        return this.findAll().filter(
            (plugin) =>
                plugin.meta.name.toLowerCase().includes(lowerQuery) ||
                plugin.meta.description.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * 플러그인 개수 확인
     */
    getPluginCount(): number {
        return this.plugins.size;
    }

    /**
     * 활성화된 플러그인 개수 확인
     */
    getEnabledPluginCount(): number {
        return this.getEnabledPlugins().length;
    }

    // 하위 호환성을 위한 메서드 (기존 코드용)
    findByIdFromCommand(commandName: string): string | null {
        const result = this.parseCommandName(commandName);
        return result ? result.pluginId : null;
    }
}

export const pluginRegistry = new PluginRegistry();