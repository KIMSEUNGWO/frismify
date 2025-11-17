/**
 * ShortcutManager - 단축키 전담 관리
 *
 * 역할:
 * - 단축키 매칭
 * - 단축키 포매팅 (Mac/Windows)
 * - Chrome Commands API 커맨드 생성
 *
 * 원칙:
 * - 단일 책임: 단축키 관련 로직만
 * - 캡슐화: 플랫폼별 변환 로직 숨김
 * - 싱글톤: 전역 단일 인스턴스
 */

import type { ShortcutKey } from '../types';
import { Platform } from '../utils/platform';

export class ShortcutManager {
  private static instance: ShortcutManager;
  private platform: Platform;

  private constructor() {
    this.platform = Platform.getInstance();
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(): ShortcutManager {
    if (!ShortcutManager.instance) {
      ShortcutManager.instance = new ShortcutManager();
    }
    return ShortcutManager.instance;
  }

  /**
   * KeyboardEvent가 단축키와 일치하는지 확인
   */
  public matches(event: KeyboardEvent, keys: ShortcutKey[]): boolean {
    // 수정자 키 상태 확인
    const hasCmd = keys.includes('Cmd');
    const hasShift = keys.includes('Shift');
    const hasAlt = keys.includes('Alt');
    const hasCtrl = keys.includes('Ctrl');

    // Mac에서 Cmd는 metaKey, Windows에서는 ctrlKey
    const cmdMatches = this.platform.isMac
      ? event.metaKey === hasCmd
      : event.ctrlKey === hasCmd;

    const shiftMatches = event.shiftKey === hasShift;
    const altMatches = event.altKey === hasAlt;

    // Windows에서 Cmd가 있으면 Ctrl 체크 스킵 (Cmd가 이미 Ctrl로 매핑됨)
    const ctrlMatches = (!this.platform.isMac && hasCmd)
      ? true
      : event.ctrlKey === hasCtrl;

    // 일반 키 추출 (수정자가 아닌 키)
    const normalKey = keys.find(
      key => !['Cmd', 'Shift', 'Alt', 'Ctrl'].includes(key)
    );

    if (!normalKey) {
      return false;
    }

    const keyMatches = event.key.toUpperCase() === normalKey.toUpperCase();

    return cmdMatches && shiftMatches && altMatches && ctrlMatches && keyMatches;
  }

  /**
   * 단축키를 현재 플랫폼에 맞는 표시용 문자열로 변환
   * Mac: ⌘⇧P (심볼, 공백 없음)
   * Windows: Ctrl + Shift + P (텍스트, + 사이 공백)
   */
  public format(keys: ShortcutKey[]): string {
    if (this.platform.isMac) {
      return this.toMacSymbols(keys);
    } else {
      return this.toWindowsText(keys);
    }
  }

  /**
   * Chrome Commands API용 커맨드 객체 생성
   */
  public toCommand(keys: ShortcutKey[]): { windows: string; mac: string } {
    return {
      windows: this.toWindowsCommand(keys),
      mac: this.toMacCommand(keys),
    };
  }

  // ===== Private Methods =====

  /**
   * Mac 심볼 변환: ['Cmd', 'Shift', 'P'] -> '⌘⇧P'
   */
  private toMacSymbols(keys: ShortcutKey[]): string {
    const symbols: Record<string, string> = {
      Cmd: '⌘',
      Shift: '⇧',
      Alt: '⌥',
      Ctrl: '⌃',
    };

    return keys.map(key => symbols[key] || key.toUpperCase()).join('');
  }

  /**
   * Windows 텍스트 변환: ['Cmd', 'Shift', 'P'] -> 'Ctrl + Shift + P'
   */
  private toWindowsText(keys: ShortcutKey[]): string {
    const texts: Record<string, string> = {
      Cmd: 'Ctrl',
      Shift: 'Shift',
      Alt: 'Alt',
      Ctrl: 'Ctrl',
    };

    return keys.map(key => texts[key] || key).join(' + ');
  }

  /**
   * Mac 커맨드 텍스트: ['Cmd', 'Shift', 'P'] -> 'Command+Shift+P'
   * (Chrome Commands API용 - 심볼이 아닌 텍스트)
   */
  private toMacCommand(keys: ShortcutKey[]): string {
    const texts: Record<string, string> = {
      Cmd: 'Command',
      Shift: 'Shift',
      Alt: 'Alt',
      Ctrl: 'MacCtrl',
    };

    return keys.map(key => texts[key] || key).join('+');
  }

  /**
   * Windows 커맨드 텍스트: ['Cmd', 'Shift', 'P'] -> 'Ctrl+Shift+P'
   */
  private toWindowsCommand(keys: ShortcutKey[]): string {
    const texts: Record<string, string> = {
      Cmd: 'Ctrl',
      Shift: 'Shift',
      Alt: 'Alt',
      Ctrl: 'Ctrl',
    };

    return keys.map(key => texts[key] || key).join('+');
  }

  /**
   * 단축키 유효성 검사
   */
  public isValid(keys: ShortcutKey[]): boolean {
    if (keys.length === 0) {
      return false;
    }

    // 최소 하나의 수정자 키가 있어야 함
    const hasModifier = keys.some(key =>
      ['Cmd', 'Shift', 'Alt', 'Ctrl'].includes(key)
    );

    // 일반 키가 정확히 하나 있어야 함
    const normalKeys = keys.filter(
      key => !['Cmd', 'Shift', 'Alt', 'Ctrl'].includes(key)
    );

    return hasModifier && normalKeys.length === 1;
  }
}
