/**
 * PluginManagerProxy
 *
 * Options/Popup 등 background와 분리된 컨텍스트에서
 * PluginManager의 상태를 구독하기 위한 Proxy 클래스
 *
 * 역할:
 * - Background의 PluginManager 상태 변경을 실시간 구독
 * - RPC 방식으로 플러그인 목록/상태 조회
 */

import { MessageType } from "@/core/InstanceManager";
import type { AppState, Plugin, PluginState } from '@/types';

class PluginManagerProxy {
    private listeners = new Set<(state: AppState) => void>();
    private port?: globalThis.Browser.runtime.Port;
    private initialized = false;

    constructor() {
        // browser.runtime.connect가 실제로 구현된 환경에서만 초기화
        if (this.canConnect()) {
            this.initializePort();
        }
    }

    /**
     * browser.runtime.connect 사용 가능 여부 확인
     *
     * Pre-rendering 환경(Node.js + fake-browser)에서는 false 반환
     */
    private canConnect(): boolean {
        try {
            // Pre-rendering 환경 감지
            // - import.meta.env.SSR: Vite SSR/pre-rendering 모드
            // - typeof window === 'undefined': Node.js 환경
            if (import.meta.env?.SSR || typeof window === 'undefined') {
                return false;
            }

            return (
                typeof browser !== 'undefined' &&
                browser.runtime &&
                typeof browser.runtime.connect === 'function'
            );
        } catch {
            return false;
        }
    }

    /**
     * Port 초기화 및 이벤트 수신 설정
     */
    private initializePort() {
        if (this.initialized || !this.canConnect()) return;

        try {
            // background 이벤트 수신 포트 오픈
            this.port = browser.runtime.connect({ name: "plugin-events" });
            this.initialized = true;
            console.log('[PluginManagerProxy] Port connected');
        } catch (error) {
            console.warn('[PluginManagerProxy] Failed to connect port:', error);
            return;
        }

        // background → proxy 로 push된 이벤트 처리
        this.port.onMessage.addListener((msg) => {
            if (msg.type === "PLUGIN_STATE_CHANGED") {
                console.log('[PluginManagerProxy] State changed received:', msg.state);
                const state = msg.state as AppState;
                this.listeners.forEach((cb) => cb(state));
            }
        });

        this.port.onDisconnect.addListener(() => {
            console.log('[PluginManagerProxy] Port disconnected');
            this.port = undefined;
        });
    }

    //-----------------------------------------
    // RPC 메서드
    //-----------------------------------------

    /**
     * 플러그인 목록 가져오기
     */
    async getPlugins(): Promise<Plugin[]> {
        if (!this.ensureRuntime()) return [];

        const res = await browser.runtime.sendMessage({
            type: MessageType.GET_PLUGIN_LIST
        });
        return res.plugins as Plugin[];
    }

    /**
     * 플러그인 상태 가져오기
     */
    async getPluginState(pluginId: string): Promise<PluginState | undefined> {
        if (!this.ensureRuntime()) return undefined;

        const res = await browser.runtime.sendMessage({
            type: MessageType.GET_PLUGIN_STATE,
            pluginId
        });
        return res.config as PluginState | undefined;
    }

    /**
     * 모든 플러그인 상태 가져오기
     */
    async getPluginStates(): Promise<Record<string, PluginState>> {
        if (!this.ensureRuntime()) return {};

        const res = await browser.runtime.sendMessage({
            type: MessageType.GET_PLUGIN_STATES,
        });
        return res.configs as Record<string, PluginState>;
    }

    /**
     * 플러그인 토글
     */
    async togglePlugin(pluginId: string): Promise<void> {
        if (!this.ensureRuntime()) return;

        await browser.runtime.sendMessage({
            type: MessageType.TOGGLE_PLUGIN,
            pluginId
        });
    }

    /**
     * 플러그인 활성화
     */
    async enablePlugin(pluginId: string): Promise<void> {
        if (!this.ensureRuntime()) return;

        await browser.runtime.sendMessage({
            type: MessageType.ENABLE_PLUGIN,
            pluginId
        });
    }

    /**
     * 플러그인 비활성화
     */
    async disablePlugin(pluginId: string): Promise<void> {
        if (!this.ensureRuntime()) return;

        await browser.runtime.sendMessage({
            type: MessageType.DISABLE_PLUGIN,
            pluginId
        });
    }

    /**
     * 플러그인 설정값 업데이트
     */
    async updateSetting(pluginId: string, settingId: string, value: any): Promise<void> {
        if (!this.ensureRuntime()) return;

        await browser.runtime.sendMessage({
            type: MessageType.UPDATE_SETTING,
            pluginId,
            settingId,
            value
        });
    }

    /**
     * browser.runtime API 사용 가능 여부 확인
     */
    private ensureRuntime(): boolean {
        if (typeof browser === 'undefined' || !browser.runtime) {
            console.warn('[PluginManagerProxy] browser.runtime not available (pre-rendering environment)');
            return false;
        }

        // Port가 초기화되지 않았다면 초기화 시도
        if (!this.initialized) {
            this.initializePort();
        }

        return true;
    }

    //-----------------------------------------
    // Listener 관리 (Vue에서 그대로 사용 가능)
    //-----------------------------------------

    /**
     * 상태 변경 리스너 등록
     */
    addListener(listener: (state: AppState) => void): void {
        this.listeners.add(listener);
    }

    /**
     * 상태 변경 리스너 제거
     */
    removeListener(listener: (state: AppState) => void): void {
        this.listeners.delete(listener);
    }

    /**
     * Port 재연결 (필요시)
     */
    reconnect(): void {
        if (!this.port) {
            this.initializePort();
        }
    }

    /**
     * 특정 플러그인 가져오기
     */
    async getPlugin(pluginId: string): Promise<Plugin | undefined> {
        if (!this.ensureRuntime()) return undefined;

        const res = await browser.runtime.sendMessage({
            type: MessageType.GET_PLUGIN,
            pluginId
        });
        return res.plugin as Plugin | undefined;
    }

    /**
     * 플러그인 설정값 가져오기
     */
    async getPluginSettings(pluginId: string): Promise<Record<string, any>> {
        if (!this.ensureRuntime()) return {};

        const res = await browser.runtime.sendMessage({
            type: MessageType.GET_PLUGIN_SETTINGS,
            pluginId
        });
        return res.settings || {};
    }

}

export const pluginManagerProxy = new PluginManagerProxy();
