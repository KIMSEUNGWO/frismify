/**
 * StorageManager - 간소화된 스토리지 관리
 *
 * 역할:
 * - browser.storage.local 래핑
 * - 타입 안전성
 * - 변경 감지 리스너
 *
 * 원칙:
 * - 단일 책임: 스토리지 읽기/쓰기만 담당
 * - 캡슐화: browser API 감춤
 * - 싱글톤: 모든 컨텍스트에서 동일 인스턴스
 */

import { browser } from 'wxt/browser';
import type { AppState } from '../types';

const STORAGE_KEY = 'prismify_state';

export class StorageManager {
  private static instance: StorageManager;
  private listeners: Set<(state: AppState) => void> = new Set();

  private constructor() {
    this.setupListener();
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  /**
   * 전체 상태 가져오기
   */
  public async getState(): Promise<AppState> {
    try {
      // 빌드 타임에는 browser API 없음
      if (typeof browser === 'undefined' || !browser?.storage) {
        return { plugins: {} };
      }

      const result = await browser.storage.local.get(STORAGE_KEY);
      return result[STORAGE_KEY] || { plugins: {} };
    } catch (error) {
      console.error('[StorageManager] Failed to get state:', error);
      return { plugins: {} };
    }
  }

  /**
   * 전체 상태 저장
   */
  public async setState(state: AppState): Promise<void> {
    try {
      if (typeof browser === 'undefined' || !browser?.storage) {
        console.warn('[StorageManager] Browser API not available');
        return;
      }

      console.log('[StorageManager] Setting state:', state);
      await browser.storage.local.set({ [STORAGE_KEY]: state });
      console.log('[StorageManager] State saved successfully');
    } catch (error) {
      console.error('[StorageManager] Failed to set state:', error);
      throw error;
    }
  }

  /**
   * 부분 상태 업데이트
   */
  public async updateState(updater: (state: AppState) => AppState): Promise<void> {
    const currentState = await this.getState();
    const newState = updater(currentState);
    await this.setState(newState);
  }

  /**
   * 변경 리스너 등록
   */
  public addListener(listener: (state: AppState) => void): void {
    this.listeners.add(listener);
  }

  /**
   * 변경 리스너 제거
   */
  public removeListener(listener: (state: AppState) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Storage 변경 감지 설정
   */
  private setupListener(): void {
    if (typeof browser === 'undefined' || !browser?.storage) {
      return;
    }

    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes[STORAGE_KEY]) {
        const newState = changes[STORAGE_KEY].newValue as AppState;
        if (newState) {
          this.notifyListeners(newState);
        }
      }
    });
  }

  /**
   * 리스너들에게 변경사항 알림
   */
  private notifyListeners(state: AppState): void {
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('[StorageManager] Listener error:', error);
      }
    });
  }

  /**
   * 전체 스토리지 초기화 (위험!)
   */
  public async clear(): Promise<void> {
    await this.setState({ plugins: {} });
    console.warn('[StorageManager] State cleared');
  }
}
