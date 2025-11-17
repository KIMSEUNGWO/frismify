/**
 * 중앙화된 스토리지 관리 클래스
 * 모든 스토리지 키를 상수로 관리하고 타입 안전한 메서드 제공
 */

import { browser } from 'wxt/browser';

/**
 * 스토리지 키 상수
 */
export const STORAGE_KEYS = {
  /**
   * 전체 앱 설정 (SettingsManager에서 사용)
   */
  APP_SETTINGS: 'appSettings',

  /**
   * 플러그인 활성화 상태 키 생성
   * @param pluginId 플러그인 ID
   * @returns 'local:plugin:{pluginId}'
   */
  pluginEnabled: (pluginId: string) => `local:plugin:${pluginId}` as const,

  /**
   * 플러그인별 설정 키 생성 (레거시, SettingsManager 사용 권장)
   * @param pluginId 플러그인 ID
   * @returns 'local:plugin:{pluginId}:settings'
   * @deprecated Use SettingsManager instead
   */
  pluginSettings: (pluginId: string) => `local:plugin:${pluginId}:settings` as const,

  /**
   * 커스텀 키 생성 (네임스페이스 포함)
   * @param namespace 네임스페이스 (예: 'plugin', 'user', 'temp')
   * @param key 키 이름
   * @returns 'local:{namespace}:{key}'
   */
  custom: (namespace: string, key: string) => `local:${namespace}:${key}` as const,
} as const;

/**
 * 스토리지 타입 정의
 */
export interface StorageData {
  // 앱 전체 설정
  'appSettings': any; // AppSettings 타입 (settings-manager.ts에서 정의)

  // 플러그인 활성화 상태 (동적 키)
  [key: `local:plugin:${string}`]: boolean;

  // 플러그인 설정 (동적 키, 레거시)
  [key: `local:plugin:${string}:settings`]: any;

  // 커스텀 키 (동적)
  [key: `local:${string}:${string}`]: any;
}

/**
 * 스토리지 관리 클래스
 */
export class Storage {
  private static instance: Storage;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Storage 싱글톤 인스턴스 반환
   */
  public static getInstance(): Storage {
    if (!Storage.instance) {
      Storage.instance = new Storage();
    }
    return Storage.instance;
  }

  /**
   * browser.storage.local 직접 접근 (하위 호환성)
   */
  public get local() {
    return browser.storage.local;
  }

  /**
   * 값 가져오기 (타입 안전)
   * @param key 스토리지 키
   * @returns 저장된 값 또는 undefined
   */
  public async get<K extends keyof StorageData>(
    key: K
  ): Promise<StorageData[K] | undefined> {
    try {
      return await browser.storage.local.get(key);
    } catch (error) {
      console.error(`[Storage] Error getting key "${key}":`, error);
      return undefined;
    }
  }

  /**
   * 값 설정 (타입 안전)
   * @param key 스토리지 키
   * @param value 저장할 값
   */
  public async set<K extends keyof StorageData>(
    key: K,
    value: StorageData[K]
  ): Promise<void> {
    try {
      browser.storage.local.set(key, value);
    } catch (error) {
      console.error(`[Storage] Error setting key "${key}":`, error);
      throw error;
    }
  }

  /**
   * 값 삭제
   * @param key 스토리지 키
   */
  public async remove<K extends keyof StorageData>(key: K): Promise<void> {
    try {
      await browser.storage.local.remove(key.toString());
    } catch (error) {
      console.error(`[Storage] Error removing key "${key}":`, error);
      throw error;
    }
  }

  /**
   * 여러 값 가져오기
   * @param keys 스토리지 키 배열
   * @returns 키-값 객체
   */
  public async getMultiple<K extends keyof StorageData>(
    keys: K[]
  ): Promise<Partial<Pick<StorageData, K>>> {
    try {
      const result = await this.local.get(keys);
      return result as Partial<Pick<StorageData, K>>;
    } catch (error) {
      console.error('[Storage] Error getting multiple keys:', error);
      return {};
    }
  }

  /**
   * 여러 값 설정
   * @param items 키-값 객체
   */
  public async setMultiple(items: Partial<StorageData>): Promise<void> {
    try {
      await this.local.set(items);
    } catch (error) {
      console.error('[Storage] Error setting multiple items:', error);
      throw error;
    }
  }

  /**
   * 전체 스토리지 초기화 (위험!)
   */
  public async clear(): Promise<void> {
    try {
      await this.local.clear();
      console.warn('[Storage] All storage cleared!');
    } catch (error) {
      console.error('[Storage] Error clearing storage:', error);
      throw error;
    }
  }

  // ===== 플러그인 전용 헬퍼 메서드 =====

  /**
   * 플러그인 활성화 상태 가져오기
   * @param pluginId 플러그인 ID
   * @returns 활성화 상태 (기본: false)
   */
  public async getPluginEnabled(pluginId: string): Promise<boolean> {
    const key = STORAGE_KEYS.pluginEnabled(pluginId);
    return (await this.get(key)) ?? false;
  }

  /**
   * 플러그인 활성화 상태 설정
   * @param pluginId 플러그인 ID
   * @param enabled 활성화 여부
   */
  public async setPluginEnabled(pluginId: string, enabled: boolean): Promise<void> {
    const key = STORAGE_KEYS.pluginEnabled(pluginId);
    await this.set(key, enabled);
  }

  /**
   * 플러그인 설정 가져오기 (레거시)
   * @param pluginId 플러그인 ID
   * @returns 플러그인 설정
   * @deprecated Use SettingsManager instead
   */
  public async getPluginSettings(pluginId: string): Promise<any> {
    const key = STORAGE_KEYS.pluginSettings(pluginId);
    return await this.get(key);
  }

  /**
   * 플러그인 설정 저장 (레거시)
   * @param pluginId 플러그인 ID
   * @param settings 플러그인 설정
   * @deprecated Use SettingsManager instead
   */
  public async setPluginSettings(pluginId: string, settings: any): Promise<void> {
    const key = STORAGE_KEYS.pluginSettings(pluginId);
    await this.set(key, settings);
  }

  /**
   * 앱 전체 설정 가져오기
   * @returns 앱 설정
   */
  public async getAppSettings(): Promise<any> {
    const result = await this.get(STORAGE_KEYS.APP_SETTINGS);

    if (result.appSettings) {
      return result.appSettings;
    }
    return { plugins: {} }
  }

  /**
   * 앱 전체 설정 저장
   * @param settings 앱 설정
   */
  public async setAppSettings(settings: any): Promise<void> {
    await this.local.set({ appSettings: settings });
  }

  /**
   * 스토리지 변경 감지 리스너 등록
   * @param callback 변경 감지 콜백
   */
  public onChanged(
    callback: (changes: { [key: string]: Browser.storage.StorageChange }) => void
  ): void {
    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local') {
        callback(changes);
      }
    });
  }

  /**
   * 디버그: 전체 스토리지 내용 출력
   */
  public async debug(): Promise<void> {
    const all = await this.local.get();
    console.log('[Storage Debug] All storage:', all);
  }
}

/**
 * 전역 스토리지 인스턴스
 */
export const localStorage = Storage.getInstance();

/**
 * 스토리지 키 상수 export (편의성)
 */
export { STORAGE_KEYS as KEYS };