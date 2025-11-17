/**
 * PluginManager - 플러그인 통합 관리 (Facade)
 *
 * 역할:
 * - 플러그인 등록/조회
 * - 플러그인 활성화/비활성화
 * - 플러그인 설정 관리
 * - 플러그인 라이프사이클 관리
 * - Chrome Commands 생성
 *
 * 원칙:
 * - Facade Pattern: 단일 진입점
 * - 단일 책임: 플러그인 관련 모든 작업
 * - 캡슐화: 내부 구현(Storage, Shortcut) 숨김
 * - 싱글톤: 모든 컨텍스트에서 동일 인스턴스
 */

import type { Plugin, PluginState, AppState } from '../types';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { StorageManager } from './StorageManager';
import { ShortcutManager } from './ShortcutManager';

export class PluginManager {
  private static instance: PluginManager;

  // 의존성 (내부에서만 사용)
  private storage: StorageManager;
  private shortcut: ShortcutManager;

  // 플러그인 레지스트리
  private plugins: Map<string, Plugin> = new Map();

  // 활성 플러그인 cleanup 함수들
  private cleanupCallbacks: Map<string, (() => void | Promise<void>)[]> = new Map();

  private constructor() {
    this.storage = StorageManager.getInstance();
    this.shortcut = ShortcutManager.getInstance();
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  // ========================================
  // 플러그인 등록/조회
  // ========================================

  /**
   * 플러그인 등록
   */
  public async register(plugin: Plugin): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      console.warn(`[PluginManager] Plugin ${plugin.id} already registered`);
      return;
    }

    this.plugins.set(plugin.id, plugin);
    console.log(`[PluginManager] Plugin registered: ${plugin.id}`);

    // Storage에 초기 상태가 없으면 생성
    await this.initializePluginState(plugin);
  }

  /**
   * 플러그인 초기 상태 생성 (Storage에 없을 때만)
   */
  private async initializePluginState(plugin: Plugin): Promise<void> {
    const state = await this.storage.getState();

    // 이미 상태가 있으면 스킵 (사용자 설정 유지)
    if (state.plugins[plugin.id]) {
      console.log(`[PluginManager] Plugin ${plugin.id} state exists, skipping initialization`);
      return;
    }

    // 기본 상태 생성
    const defaultState: PluginState = {
      enabled: false, // 기본: 비활성화
      settings: this.getDefaultSettings(plugin),
      shortcuts: this.getDefaultShortcuts(plugin),
    };

    state.plugins[plugin.id] = defaultState;
    await this.storage.setState(state);

    console.log(`[PluginManager] Plugin ${plugin.id} initialized with default state`);
  }

  /**
   * 플러그인의 기본 설정값 가져오기
   */
  private getDefaultSettings(plugin: Plugin): Record<string, any> {
    if (!plugin.settings) return {};

    const defaults: Record<string, any> = {};
    for (const [key, setting] of Object.entries(plugin.settings)) {
      defaults[key] = setting.defaultValue;
    }
    return defaults;
  }

  /**
   * 플러그인의 기본 단축키 상태 가져오기
   */
  private getDefaultShortcuts(plugin: Plugin): Record<string, any> {
    if (!plugin.shortcuts) return {};

    const defaults: Record<string, any> = {};
    for (const [id] of Object.entries(plugin.shortcuts)) {
      defaults[id] = {
        enabled: true,
        customKeys: undefined, // 커스텀 키 없음
      };
    }
    return defaults;
  }

  /**
   * 모든 플러그인 가져오기
   */
  public getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * ID로 플러그인 찾기
   */
  public getPlugin(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  /**
   * 카테고리별 플러그인 찾기
   */
  public getPluginsByCategory(category: string): Plugin[] {
    return this.getPlugins().filter(p => p.category === category);
  }

  /**
   * 티어별 플러그인 찾기
   */
  public getPluginsByTier(tier: 'free' | 'pro'): Plugin[] {
    return this.getPlugins().filter(p => p.tier === tier);
  }

  // ========================================
  // 플러그인 상태 관리
  // ========================================

  /**
   * 플러그인 활성화/비활성화
   */
  public async togglePlugin(pluginId: string): Promise<void> {
    const state = await this.storage.getState();
    const pluginState = state.plugins[pluginId];

    if (!pluginState) {
      throw new Error(`Plugin ${pluginId} not found in state`);
    }

    pluginState.enabled = !pluginState.enabled;
    await this.storage.setState(state);

    console.log(`[PluginManager] Plugin ${pluginId}: ${pluginState.enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * 플러그인 활성화
   */
  public async enablePlugin(pluginId: string): Promise<void> {
    await this.storage.updateState(state => {
      if (state.plugins[pluginId]) {
        state.plugins[pluginId].enabled = true;
      }
      return state;
    });
  }

  /**
   * 플러그인 비활성화
   */
  public async disablePlugin(pluginId: string): Promise<void> {
    await this.storage.updateState(state => {
      if (state.plugins[pluginId]) {
        state.plugins[pluginId].enabled = false;
      }
      return state;
    });
  }

  /**
   * 플러그인 활성화 상태 확인
   */
  public async isEnabled(pluginId: string): Promise<boolean> {
    const state = await this.storage.getState();
    return state.plugins[pluginId]?.enabled ?? false;
  }

  /**
   * 활성화된 플러그인만 가져오기
   */
  public async getEnabledPlugins(): Promise<Plugin[]> {
    const state = await this.storage.getState();
    return this.getPlugins().filter(p => state.plugins[p.id]?.enabled);
  }

  // ========================================
  // 플러그인 설정 관리
  // ========================================

  /**
   * 플러그인 설정 가져오기
   */
  public async getSettings(pluginId: string): Promise<Record<string, any>> {
    const state = await this.storage.getState();
    return state.plugins[pluginId]?.settings ?? {};
  }

  /**
   * 플러그인 설정 업데이트
   */
  public async updateSetting(
    pluginId: string,
    settingKey: string,
    value: any
  ): Promise<void> {
    await this.storage.updateState(state => {
      if (state.plugins[pluginId]) {
        state.plugins[pluginId].settings[settingKey] = value;
      }
      return state;
    });
  }

  /**
   * 플러그인 전체 상태 가져오기
   */
  public async getPluginState(pluginId: string): Promise<PluginState | undefined> {
    const state = await this.storage.getState();
    return state.plugins[pluginId];
  }

  /**
   * 단축키 커스텀 키 업데이트
   */
  public async updateShortcutKeys(
    pluginId: string,
    shortcutId: string,
    customKeys: any[]
  ): Promise<void> {
    console.log('[PluginManager] updateShortcutKeys called:', { pluginId, shortcutId, customKeys });

    await this.storage.updateState(state => {
      if (state.plugins[pluginId]) {
        // shortcut 상태가 없으면 생성
        if (!state.plugins[pluginId].shortcuts[shortcutId]) {
          state.plugins[pluginId].shortcuts[shortcutId] = { enabled: true };
          console.log('[PluginManager] Created new shortcut state');
        }
        // Vue Proxy를 일반 배열로 변환 (Chrome storage 호환성)
        state.plugins[pluginId].shortcuts[shortcutId].customKeys = Array.from(customKeys);
        console.log('[PluginManager] Updated customKeys:', state.plugins[pluginId].shortcuts[shortcutId]);
      } else {
        console.error('[PluginManager] Plugin not found in state:', pluginId);
      }
      return state;
    });

    console.log('[PluginManager] updateShortcutKeys completed');
  }

  /**
   * 단축키 활성화/비활성화
   */
  public async toggleShortcut(
    pluginId: string,
    shortcutId: string,
    enabled: boolean
  ): Promise<void> {
    await this.storage.updateState(state => {
      if (state.plugins[pluginId]) {
        if (!state.plugins[pluginId].shortcuts[shortcutId]) {
          state.plugins[pluginId].shortcuts[shortcutId] = { enabled: true };
        }
        state.plugins[pluginId].shortcuts[shortcutId].enabled = enabled;
      }
      return state;
    });
  }

  /**
   * 단축키 커스텀 키 리셋
   */
  public async resetShortcutKeys(
    pluginId: string,
    shortcutId: string
  ): Promise<void> {
    await this.storage.updateState(state => {
      if (state.plugins[pluginId] && state.plugins[pluginId].shortcuts[shortcutId]) {
        delete state.plugins[pluginId].shortcuts[shortcutId].customKeys;
      }
      return state;
    });
  }

  // ========================================
  // 플러그인 라이프사이클
  // ========================================

  /**
   * 플러그인 활성화 (Content Script에서 호출)
   */
  public async activate(
    pluginId: string,
    ctx: ContentScriptContext
  ): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not registered`);
    }

    const isEnabled = await this.isEnabled(pluginId);
    if (!isEnabled) {
      console.log(`[PluginManager] Plugin ${pluginId} is disabled, skipping activation`);
      return;
    }

    // onActivate 호출
    if (plugin.onActivate) {
      try {
        await plugin.onActivate(ctx);
        console.log(`[PluginManager] Plugin ${pluginId} activated`);

        // cleanup 콜백 저장
        if (plugin.onCleanup) {
          if (!this.cleanupCallbacks.has(pluginId)) {
            this.cleanupCallbacks.set(pluginId, []);
          }
          this.cleanupCallbacks.get(pluginId)!.push(plugin.onCleanup);
        }
      } catch (error) {
        console.error(`[PluginManager] Failed to activate plugin ${pluginId}:`, error);
      }
    }
  }

  /**
   * 플러그인 정리 (Context 무효화 시)
   */
  public async cleanup(pluginId: string): Promise<void> {
    const callbacks = this.cleanupCallbacks.get(pluginId);
    if (!callbacks) return;

    for (const callback of callbacks) {
      try {
        await callback();
      } catch (error) {
        console.error(`[PluginManager] Cleanup error for ${pluginId}:`, error);
      }
    }

    this.cleanupCallbacks.delete(pluginId);
    console.log(`[PluginManager] Plugin ${pluginId} cleaned up`);
  }

  /**
   * 모든 플러그인 정리
   */
  public async cleanupAll(): Promise<void> {
    const pluginIds = Array.from(this.cleanupCallbacks.keys());
    for (const pluginId of pluginIds) {
      await this.cleanup(pluginId);
    }
  }

  // ========================================
  // Chrome Commands API
  // ========================================

  /**
   * Chrome Commands API용 단축키 목록 생성
   */
  public getCommands(): Record<string, any> {
    const commands: Record<string, any> = {};

    this.plugins.forEach(plugin => {
      if (!plugin.shortcuts) return;

      Object.entries(plugin.shortcuts).forEach(([shortcutId, shortcut]) => {
        const commandName = `${plugin.id}__${shortcutId}`;
        const platformKeys = this.shortcut.toCommand(shortcut.keys);

        commands[commandName] = {
          suggested_key: {
            windows: platformKeys.windows,
            mac: platformKeys.mac,
          },
          description: shortcut.description || shortcut.name,
        };
      });
    });

    return commands;
  }

  /**
   * 커맨드 이름 파싱 (pluginId__shortcutId -> { pluginId, shortcutId })
   */
  public parseCommand(commandName: string): { pluginId: string; shortcutId: string } | null {
    const parts = commandName.split('__');
    if (parts.length !== 2) return null;

    return {
      pluginId: parts[0],
      shortcutId: parts[1],
    };
  }

  /**
   * 커맨드 핸들러 실행 (Background에서 호출)
   */
  public async handleCommand(
    commandName: string,
    ctx: ContentScriptContext
  ): Promise<void> {
    const parsed = this.parseCommand(commandName);
    if (!parsed) {
      console.warn(`[PluginManager] Invalid command name: ${commandName}`);
      return;
    }

    const { pluginId, shortcutId } = parsed;
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !plugin.shortcuts) {
      console.warn(`[PluginManager] Plugin or shortcut not found: ${commandName}`);
      return;
    }

    const shortcut = plugin.shortcuts[shortcutId];
    if (!shortcut) {
      console.warn(`[PluginManager] Shortcut not found: ${shortcutId}`);
      return;
    }

    // 활성화 상태 확인
    const isEnabled = await this.isEnabled(pluginId);
    if (!isEnabled) {
      console.log(`[PluginManager] Plugin ${pluginId} disabled, ignoring command`);
      return;
    }

    // 단축키 핸들러 실행
    try {
      await shortcut.handler(new KeyboardEvent('keydown'), ctx);
      console.log(`[PluginManager] Command executed: ${commandName}`);
    } catch (error) {
      console.error(`[PluginManager] Command handler error (${commandName}):`, error);
    }
  }

  // ========================================
  // 리스너 관리
  // ========================================

  /**
   * 상태 변경 리스너 등록
   */
  public addListener(listener: (state: AppState) => void): void {
    this.storage.addListener(listener);
  }

  /**
   * 상태 변경 리스너 제거
   */
  public removeListener(listener: (state: AppState) => void): void {
    this.storage.removeListener(listener);
  }

  // ========================================
  // 유틸리티
  // ========================================

  /**
   * 플러그인 개수
   */
  public getPluginCount(): number {
    return this.plugins.size;
  }

  /**
   * 활성화된 플러그인 개수
   */
  public async getEnabledPluginCount(): Promise<number> {
    const enabled = await this.getEnabledPlugins();
    return enabled.length;
  }

  /**
   * 플러그인 검색
   */
  public searchPlugins(query: string): Plugin[] {
    const lowerQuery = query.toLowerCase();
    return this.getPlugins().filter(
      p =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * 디버그 정보
   */
  public async getDebugInfo(): Promise<any> {
    const state = await this.storage.getState();
    return {
      totalPlugins: this.plugins.size,
      registeredPlugins: Array.from(this.plugins.keys()),
      state,
    };
  }

  /**
   * 플러그인 상태 강제 재초기화 (디버깅용)
   */
  public async reinitializePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not registered`);
    }

    const state = await this.storage.getState();

    // 기본 상태로 재생성
    const defaultState: PluginState = {
      enabled: state.plugins[pluginId]?.enabled ?? false, // 기존 enabled 상태 유지
      settings: this.getDefaultSettings(plugin),
      shortcuts: this.getDefaultShortcuts(plugin),
    };

    state.plugins[pluginId] = defaultState;
    await this.storage.setState(state);

    console.log(`[PluginManager] Plugin ${pluginId} reinitialized`);
  }

  /**
   * 모든 플러그인 상태 재초기화 (Storage 초기화)
   */
  public async reinitializeAll(): Promise<void> {
    const plugins = Array.from(this.plugins.values());

    const newState: AppState = {
      plugins: {},
    };

    for (const plugin of plugins) {
      newState.plugins[plugin.id] = {
        enabled: false,
        settings: this.getDefaultSettings(plugin),
        shortcuts: this.getDefaultShortcuts(plugin),
      };
    }

    await this.storage.setState(newState);
    console.log(`[PluginManager] All plugins reinitialized (${plugins.length} plugins)`);
  }
}



export const pluginManager = PluginManager.getInstance();
