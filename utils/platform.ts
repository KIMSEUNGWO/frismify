/**
 * 플랫폼 메타정보 클래스
 * 운영체제 정보를 제공하는 싱글톤 클래스
 */

export type PlatformType = 'mac' | 'windows' | 'linux' | 'unknown';

export class Platform {
  private static instance: Platform;
  private readonly _type: PlatformType;
  private readonly _userAgent: string;
  private readonly _platform: string;

  private constructor() {
    if (typeof navigator === 'undefined') {
      this._type = 'unknown';
      this._userAgent = '';
      this._platform = '';
      return;
    }

    this._userAgent = navigator.userAgent;
    this._platform = navigator.platform;
    this._type = this.detectPlatform();
  }

  /**
   * Platform 싱글톤 인스턴스 반환
   */
  public static getInstance(): Platform {
    if (!Platform.instance) {
      Platform.instance = new Platform();
    }
    return Platform.instance;
  }

  /**
   * 플랫폼 타입 감지
   */
  private detectPlatform(): PlatformType {
    const platform = this._platform.toLowerCase();
    const userAgent = this._userAgent.toLowerCase();

    // Mac 감지
    if (platform.includes('mac') || userAgent.includes('macintosh')) {
      return 'mac';
    }

    // Windows 감지
    if (platform.includes('win') || userAgent.includes('windows')) {
      return 'windows';
    }

    // Linux 감지
    if (platform.includes('linux') || userAgent.includes('linux')) {
      return 'linux';
    }

    return 'unknown';
  }

  /**
   * 플랫폼 타입 반환
   */
  public get type(): PlatformType {
    return this._type;
  }

  /**
   * Mac 여부 확인
   */
  public get isMac(): boolean {
    return this._type === 'mac';
  }

  /**
   * Windows 여부 확인
   */
  public get isWindows(): boolean {
    return this._type === 'windows';
  }

  /**
   * Linux 여부 확인
   */
  public get isLinux(): boolean {
    return this._type === 'linux';
  }

  /**
   * 알 수 없는 플랫폼 여부 확인
   */
  public get isUnknown(): boolean {
    return this._type === 'unknown';
  }

  /**
   * navigator.platform 값 반환
   */
  public get platformString(): string {
    return this._platform;
  }

  /**
   * navigator.userAgent 값 반환
   */
  public get userAgent(): string {
    return this._userAgent;
  }

  /**
   * 플랫폼 이름 반환 (사용자 친화적)
   */
  public get name(): string {
    switch (this._type) {
      case 'mac':
        return 'macOS';
      case 'windows':
        return 'Windows';
      case 'linux':
        return 'Linux';
      default:
        return 'Unknown';
    }
  }

  /**
   * 플랫폼 정보를 문자열로 반환
   */
  public toString(): string {
    return `Platform(type=${this._type}, name=${this.name})`;
  }
}

/**
 * 전역 플랫폼 인스턴스
 */
export const platform = Platform.getInstance();

/**
 * 헬퍼 함수들 (하위 호환성)
 */
export const isMac = (): boolean => platform.isMac;
export const isWindows = (): boolean => platform.isWindows;
export const isLinux = (): boolean => platform.isLinux;