import type { PluginConfig, PluginMetaData, PluginSettings } from '../plugins/types';
import { localStorage, STORAGE_KEYS } from './localStorage';

/**
 * 전체 설정 구조
 */
export interface AppSettings {
    plugins: {
        [pluginId: string]: PluginConfig;
    };
}

/**
 * 설정 관리자
 * Chrome Storage API를 사용하여 플러그인 설정을 저장/로드/관리
 */
export class SettingsManager {
    private static instance: SettingsManager;
    private settings: AppSettings = { plugins: {} };
    private listeners: Set<(settings: AppSettings) => void> = new Set();

    private constructor() {}

    static getInstance(): SettingsManager {
        if (!SettingsManager.instance) {
            SettingsManager.instance = new SettingsManager();
        }
        return SettingsManager.instance;
    }

    /**
     * 설정 초기화 (처음 로드)
     */
    async initialize(): Promise<void> {
        await this.loadSettings();
        this.setupStorageListener();
    }

    /**
     * Storage에서 설정 로드
     */
    private async loadSettings(): Promise<void> {
        try {
            // 빌드 타임에는 browser API가 없으므로 스킵
            if (typeof browser === 'undefined' || !browser?.storage) {
                return;
            }
            const result = await localStorage.getAppSettings();
            if (result) {
                this.settings = result;
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    /**
     * Storage 변경 감지 리스너 설정
     */
    private setupStorageListener(): void {
        // 빌드 타임에는 browser API가 없으므로 스킵
        if (typeof browser === 'undefined' || !browser?.storage) {
            return;
        }
        localStorage.onChanged((changes) => {
            if (changes[STORAGE_KEYS.APP_SETTINGS]) {
                this.settings = changes[STORAGE_KEYS.APP_SETTINGS].newValue || { plugins: {} };
                this.notifyListeners();
            }
        });
    }

    /**
     * 설정 저장
     */
    private async saveSettings(): Promise<void> {
        try {
            await localStorage.setAppSettings(this.settings);
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    /**
     * 플러그인 초기 설정 생성 (처음 등록 시)
     * Storage를 먼저 확인하여 기존 설정이 있으면 유지
     */
    async initializePlugin(meta: PluginMetaData): Promise<void> {
        // Storage에서 최신 설정 먼저 로드
        await this.loadSettings();

        // 이미 Storage에 설정이 있으면 스킵 (사용자가 설정한 값 유지)
        if (this.settings.plugins[meta.id]) {
            console.log(`[SettingsManager] Plugin ${meta.id} already configured, keeping existing settings`);
            return;
        }

        console.log(`[SettingsManager] Initializing plugin ${meta.id} with defaults`);

        const config: PluginConfig = {
            enabled: true, // 기본적으로 활성화
            settings: {},
            shortcuts: {},
        };

        // 기본 설정값 적용
        if (meta.settingOptions) {
            meta.settingOptions.forEach((option) => {
                config.settings![option.id] = option.defaultValue;
            });
        }

        // 기본 단축키 설정
        if (meta.shortcuts) {
            meta.shortcuts.forEach((shortcut) => {
                config.shortcuts![shortcut.id] = {
                    enabled: shortcut.enabled ?? true,
                };
            });
        }

        this.settings.plugins[meta.id] = config;
        await this.saveSettings();
    }

    /**
     * 플러그인 활성화/비활성화
     */
    async setPluginEnabled(pluginId: string, enabled: boolean): Promise<void> {
        if (!this.settings.plugins[pluginId]) {
            throw new Error(`Plugin ${pluginId} not found`);
        }

        this.settings.plugins[pluginId].enabled = enabled;
        await this.saveSettings();
        this.notifyListeners();
    }

    /**
     * 플러그인 설정값 업데이트
     */
    async updatePluginSettings(
        pluginId: string,
        settingId: string,
        value: any
    ): Promise<void> {
        if (!this.settings.plugins[pluginId]) {
            throw new Error(`Plugin ${pluginId} not found`);
        }

        if (!this.settings.plugins[pluginId].settings) {
            this.settings.plugins[pluginId].settings = {};
        }

        this.settings.plugins[pluginId].settings![settingId] = value;
        await this.saveSettings();
        this.notifyListeners();
    }

    /**
     * 플러그인 단축키 업데이트
     */
    async updatePluginShortcut(
        pluginId: string,
        shortcutId: string,
        customKey?: { windows: string; mac: string },
        enabled?: boolean
    ): Promise<void> {
        if (!this.settings.plugins[pluginId]) {
            throw new Error(`Plugin ${pluginId} not found`);
        }

        if (!this.settings.plugins[pluginId].shortcuts) {
            this.settings.plugins[pluginId].shortcuts = {};
        }

        const shortcutConfig = this.settings.plugins[pluginId].shortcuts![shortcutId] || {
            enabled: true,
        };

        if (customKey !== undefined) {
            shortcutConfig.customKey = customKey;
        }

        if (enabled !== undefined) {
            shortcutConfig.enabled = enabled;
        }

        this.settings.plugins[pluginId].shortcuts![shortcutId] = shortcutConfig;
        await this.saveSettings();
        this.notifyListeners();
    }

    /**
     * 플러그인 설정 가져오기
     */
    getPluginConfig(pluginId: string): PluginConfig | undefined {
        return this.settings.plugins[pluginId];
    }

    /**
     * 플러그인 설정값 가져오기
     */
    getPluginSettings(pluginId: string): PluginSettings {
        return this.settings.plugins[pluginId]?.settings || {};
    }

    /**
     * 플러그인 활성화 상태 확인
     */
    isPluginEnabled(pluginId: string): boolean {
        return this.settings.plugins[pluginId]?.enabled ?? false;
    }

    /**
     * 모든 설정 가져오기
     */
    getAllSettings(): AppSettings {
        return this.settings;
    }

    /**
     * 설정 변경 리스너 등록
     */
    addChangeListener(listener: (settings: AppSettings) => void): void {
        this.listeners.add(listener);
    }

    /**
     * 설정 변경 리스너 제거
     */
    removeChangeListener(listener: (settings: AppSettings) => void): void {
        this.listeners.delete(listener);
    }

    /**
     * 리스너들에게 변경사항 알림
     */
    private notifyListeners(): void {
        this.listeners.forEach((listener) => listener(this.settings));
    }

    /**
     * 설정 초기화 (모든 플러그인 기본값으로)
     */
    async resetAllSettings(): Promise<void> {
        this.settings = { plugins: {} };
        await this.saveSettings();
        this.notifyListeners();
    }

    /**
     * 특정 플러그인 설정 초기화
     */
    async resetPluginSettings(pluginId: string, meta: PluginMetaData): Promise<void> {
        delete this.settings.plugins[pluginId];
        await this.initializePlugin(meta);
        this.notifyListeners();
    }
}

/**
 * 싱글톤 인스턴스 내보내기
 */
export const settingsManager = SettingsManager.getInstance();