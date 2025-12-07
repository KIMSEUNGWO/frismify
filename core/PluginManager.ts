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

import type { Plugin, PluginState, AppState } from '@/types';
import { StorageManager } from './StorageManager';

export class PluginManager {
  private static instance: PluginManager;

  // 의존성 (내부에서만 사용)
  private storage: StorageManager;

  // 플러그인 레지스트리
  private plugins: Map<string, Plugin> = new Map();

  private constructor() {
    this.storage = StorageManager.getInstance();
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
   * 기본 단축키 없음 - 사용자가 직접 등록하는 방식
   */
  private getDefaultShortcuts(plugin: Plugin): Record<string, any> {
    return {}; // 빈 객체 반환
  }

  /**
   * 모든 플러그인 가져오기
   */
  public getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
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
   * 모든 플러그인 전체 상태 가져오기
   */
  public async getPluginStates(): Promise<Record<string, PluginState>> {
    const state = await this.storage.getState();
    return state.plugins;
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
          state.plugins[pluginId].shortcuts[shortcutId] = {};
          console.log('[PluginManager] Created new shortcut state');
        }
        // Vue Proxy를 일반 배열로 변환 (Chrome storage 호환성)
        state.plugins[pluginId].shortcuts[shortcutId].keys = Array.from(customKeys);
        console.log('[PluginManager] Updated keys:', state.plugins[pluginId].shortcuts[shortcutId]);
      } else {
        console.error('[PluginManager] Plugin not found in state:', pluginId);
      }
      return state;
    });

    console.log('[PluginManager] updateShortcutKeys completed');
  }

  /**
   * 단축키 삭제 (keys를 undefined로 설정)
   */
  public async deleteShortcutKeys(
    pluginId: string,
    shortcutId: string
  ): Promise<void> {
    await this.storage.updateState(state => {
      if (state.plugins[pluginId]?.shortcuts?.[shortcutId]) {
        delete state.plugins[pluginId].shortcuts[shortcutId].keys;
      }
      return state;
    });
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

  // ========================================
  // 유틸리티
  // ========================================

  /**
   * 플러그인 개수
   */
  public getPluginCount(): number {
    return this.plugins.size;
  }

  get(pluginId: string) : Plugin | undefined {
    return this.plugins.get(pluginId);
  }
}

