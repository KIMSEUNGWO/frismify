/**
 * PortManager
 *
 * Port 생명주기 관리 및 자동 재연결 기능을 제공합니다.
 * Chrome Service Worker 재시작 시 Port가 끊기는 문제를 해결합니다.
 */

import type { Browser } from '@wxt-dev/browser';

/**
 * Port 이름 열거형 (하드코딩 방지)
 */
export enum PortName {
  PLUGIN_EVENTS = 'plugin-events',
}

/**
 * 재연결 전략
 */
interface ReconnectStrategy {
  enabled: boolean;
  attempts: number;
  maxAttempts: number;
  onReconnect?: () => void;
}

/**
 * PortManager 클래스
 */
export class PortManager {
  private static instance: PortManager;

  private ports = new Map<PortName, Browser.runtime.Port>();
  private reconnectStrategies = new Map<PortName, ReconnectStrategy>();

  private constructor() {}

  public static getInstance(): PortManager {
    if (!PortManager.instance) {
      PortManager.instance = new PortManager();
    }
    return PortManager.instance;
  }

  /**
   * Port 연결
   * @param name - Port 이름
   * @returns 연결된 Port
   */
  public connect(name: PortName): Browser.runtime.Port {
    // 기존 Port가 있으면 반환
    const existingPort = this.ports.get(name);
    if (existingPort) {
      return existingPort;
    }

    // 새 Port 생성
    const port = browser.runtime.connect({ name });
    this.ports.set(name, port);

    console.log(`[PortManager] Port connected: ${name}`);

    // Disconnect 리스너 등록
    port.onDisconnect.addListener(() => {
      console.log(`[PortManager] Port disconnected: ${name}`);
      this.ports.delete(name);
      this.scheduleReconnect(name);
    });

    return port;
  }

  /**
   * Port 연결 해제
   * @param name - Port 이름
   */
  public disconnect(name: PortName): void {
    const port = this.ports.get(name);
    if (port) {
      port.disconnect();
      this.ports.delete(name);
      console.log(`[PortManager] Port manually disconnected: ${name}`);
    }
  }

  /**
   * 자동 재연결 활성화
   * @param name - Port 이름
   * @param maxAttempts - 최대 재시도 횟수 (기본값: 5)
   * @param onReconnect - 재연결 성공 시 콜백
   */
  public enableAutoReconnect(
    name: PortName,
    maxAttempts: number = 5,
    onReconnect?: () => void
  ): void {
    this.reconnectStrategies.set(name, {
      enabled: true,
      attempts: 0,
      maxAttempts,
      onReconnect,
    });
    console.log(`[PortManager] Auto-reconnect enabled for: ${name}`);
  }

  /**
   * 자동 재연결 비활성화
   * @param name - Port 이름
   */
  public disableAutoReconnect(name: PortName): void {
    const strategy = this.reconnectStrategies.get(name);
    if (strategy) {
      strategy.enabled = false;
      console.log(`[PortManager] Auto-reconnect disabled for: ${name}`);
    }
  }

  /**
   * Port 메시지 전송 (안전한 래퍼)
   * @param name - Port 이름
   * @param message - 전송할 메시지
   */
  public postMessage(name: PortName, message: any): void {
    const port = this.ports.get(name);
    if (!port) {
      console.error(`[PortManager] Port not connected: ${name}`);
      return;
    }

    try {
      port.postMessage(message);
    } catch (error) {
      console.error(`[PortManager] Failed to send message to ${name}:`, error);
    }
  }

  /**
   * 재연결 스케줄링 (Exponential Backoff)
   * @param name - Port 이름
   */
  private scheduleReconnect(name: PortName): void {
    const strategy = this.reconnectStrategies.get(name);

    if (!strategy || !strategy.enabled) {
      console.log(`[PortManager] Auto-reconnect disabled for: ${name}`);
      return;
    }

    if (strategy.attempts >= strategy.maxAttempts) {
      console.error(
        `[PortManager] Max reconnect attempts reached for: ${name}`
      );
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 10s (max)
    const delay = Math.min(1000 * Math.pow(2, strategy.attempts), 10000);
    strategy.attempts++;

    console.log(
      `[PortManager] Reconnecting ${name} in ${delay}ms (attempt ${strategy.attempts}/${strategy.maxAttempts})`
    );

    setTimeout(() => {
      try {
        this.connect(name);
        strategy.attempts = 0; // 성공 시 카운터 리셋
        console.log(`[PortManager] Reconnected successfully: ${name}`);
        strategy.onReconnect?.();
      } catch (error) {
        console.error(`[PortManager] Reconnect failed for ${name}:`, error);
      }
    }, delay);
  }

  /**
   * Port 상태 확인
   * @param name - Port 이름
   * @returns Port가 연결되어 있으면 true
   */
  public isConnected(name: PortName): boolean {
    return this.ports.has(name);
  }

  /**
   * 모든 Port 연결 해제
   */
  public disconnectAll(): void {
    this.ports.forEach((port, name) => {
      port.disconnect();
      console.log(`[PortManager] Disconnected: ${name}`);
    });
    this.ports.clear();
  }
}
