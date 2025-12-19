/**
 * PluginRegistry - 플러그인 메타데이터의 Single Source of Truth
 *
 * 역할:
 * - 플러그인 등록 및 조회
 * - 타입별 플러그인 필터링
 * - 플러그인 레지스트리의 유일한 소유자
 *
 * 원칙:
 * - Singleton Pattern: 전역에서 단일 인스턴스
 * - Single Source of Truth: 플러그인 메타데이터는 여기에만 존재
 * - Immutability: 등록 후 플러그인 객체는 수정 불가
 */

import type { Plugin } from '@/types';

export class PluginRegistry {
  private static instance: PluginRegistry;

  // 플러그인 레지스트리 (유일한 소유자)
  private plugins: Map<string, Plugin> = new Map();

  private constructor() {}

  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry();
    }
    return PluginRegistry.instance;
  }

  /**
   * 플러그인 등록
   *
   * @param plugin - 등록할 플러그인
   * @throws {Error} 이미 동일한 ID의 플러그인이 등록된 경우
   */
  public register(plugin: Plugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`[PluginRegistry] Plugin ${plugin.id} is already registered. Overwriting.`);
    }
    this.plugins.set(plugin.id, plugin);
    console.log(`[PluginRegistry] Plugin registered: ${plugin.name} (${plugin.id})`);
  }

  /**
   * 플러그인 ID로 조회
   *
   * @param id - 플러그인 ID
   * @returns 플러그인 객체 또는 undefined
   */
  public get(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  /**
   * 모든 플러그인 조회
   *
   * @returns 모든 플러그인 배열
   */
  public getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 타입 가드를 사용하여 특정 타입의 플러그인만 필터링
   *
   * @param guard - 타입 가드 함수 (예: isPersistentPlugin, isModalPlugin)
   * @returns 필터링된 플러그인 배열
   *
   * @example
   * const modalPlugins = pluginRegistry.getByType(isModalPlugin);
   * const persistentPlugins = pluginRegistry.getByType(isPersistentPlugin);
   */
  public getByType<T extends Plugin>(guard: (plugin: Plugin) => plugin is T): T[] {
    return this.getAll().filter(guard);
  }

  /**
   * 카테고리별 플러그인 조회
   *
   * @param category - 플러그인 카테고리 ('inspector' | 'performance' | 'design' | 'utility')
   * @returns 해당 카테고리의 플러그인 배열
   */
  public getByCategory(category: Plugin['category']): Plugin[] {
    return this.getAll().filter((plugin) => plugin.category === category);
  }

  /**
   * 등록된 플러그인 개수
   *
   * @returns 플러그인 개수
   */
  public getCount(): number {
    return this.plugins.size;
  }

  /**
   * 플러그인 존재 여부 확인
   *
   * @param id - 플러그인 ID
   * @returns 존재 여부
   */
  public has(id: string): boolean {
    return this.plugins.has(id);
  }
}
