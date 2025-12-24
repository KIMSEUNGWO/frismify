/**
 * 메시지 타입 안전성을 위한 타입 정의
 *
 * 모든 메시지 타입의 Request/Response 페이로드를 정의하여
 * TypeScript 컴파일 타임에 타입 체크를 수행합니다.
 */

import type { Plugin, PluginState, PluginSetting } from '@/types';
import { MessageType } from '@/core/InstanceManager';
import type { VideoItem } from '@/plugins/implementations/hls-downloader/types';

/**
 * Port 이름 Enum (하드코딩 제거)
 */
export enum PortName {
  PLUGIN_EVENTS = 'plugin-events',
}

/**
 * ParsedM3U8 structure (HLS Downloader용)
 */
export interface ParsedM3U8 {
  segments: string[];
  audioSegments: string[];
  videoSegments: string[];
  hasAudioTrack: boolean;
  hasVideoTrack: boolean;
  audioPlaylistUrl?: string;
  videoPlaylistUrl?: string;
}

/**
 * 각 메시지 타입별 Request/Response 페이로드 정의
 */
export interface MessagePayloads {
  // 플러그인 관리 (8개)
  [MessageType.GET_PLUGIN_LIST]: {
    request: void;
    response: { plugins: Plugin[] };
  };

  [MessageType.GET_PLUGIN]: {
    request: { pluginId: string };
    response: { plugin: Plugin | undefined };
  };

  [MessageType.GET_PLUGIN_STATE]: {
    request: { pluginId: string };
    response: { config: PluginState | undefined };
  };

  [MessageType.GET_PLUGIN_STATES]: {
    request: void;
    response: { configs: Record<string, PluginState> };
  };

  [MessageType.GET_PLUGIN_SETTINGS]: {
    request: { pluginId: string };
    response: { settings: Record<string, PluginSetting> | undefined };
  };

  [MessageType.TOGGLE_PLUGIN]: {
    request: { pluginId: string };
    response: { success: boolean };
  };

  [MessageType.ENABLE_PLUGIN]: {
    request: { pluginId: string };
    response: { success: boolean };
  };

  [MessageType.DISABLE_PLUGIN]: {
    request: { pluginId: string };
    response: { success: boolean };
  };

  [MessageType.UPDATE_SETTING]: {
    request: { pluginId: string; settingId: string; value: any };
    response: { success: boolean };
  };

  // 실행 및 모달 (2개)
  [MessageType.OPEN_MODAL]: {
    request: { pluginId: string };
    response: { success: boolean };
  };

  [MessageType.EXECUTE_PLUGIN]: {
    request: { pluginId: string };
    response: { success: boolean };
  };

  // 유틸리티 (4개)
  [MessageType.DOWNLOAD_IMAGE]: {
    request: { url: string; filename: string };
    response: { success: boolean };
  };

  [MessageType.GET_FILE_SIZE]: {
    request: { url: string };
    response: { size: number | null };
  };

  [MessageType.START_NETWORK_THROTTLE]: {
    request: { downloadThroughput: number; uploadThroughput: number; latency: number };
    response: { success: boolean };
  };

  [MessageType.STOP_NETWORK_THROTTLE]: {
    request: void;
    response: { success: boolean };
  };

  // HLS Downloader (5개)
  [MessageType.GET_M3U8_LIST]: {
    request: { tabId?: number };
    response: { m3u8List: VideoItem[] };
  };

  [MessageType.GET_SEGMENT_URL_LIST]: {
    request: { m3u8Url: string };
    response: { success: boolean; data?: ParsedM3U8; error?: string };
  };

  [MessageType.DOWNLOAD_SEGMENT]: {
    request: { segmentUrl: string };
    response: { success: boolean; data?: string; error?: string }; // base64 encoded
  };

  [MessageType.DOWNLOAD_HLS]: {
    request: { m3u8Url: string; filename: string };
    response: { success: boolean };
  };

  // 상태 변경 알림 (Port 전용, 1개) - MessageType에 없으므로 주석 처리
  // [MessageType.PLUGIN_STATE_CHANGED]: {
  //   request: { state: Record<string, PluginState> };
  //   response: void;
  // };

  // 내부 통신 (제거 예정)
  [MessageType.GET_SEGMENT_URL_LIST_RESULT]: {
    request: { requestId: string; success: boolean; data?: ParsedM3U8; error?: string };
    response: void;
  };

  [MessageType.DOWNLOAD_SEGMENT_RESULT]: {
    request: { requestId: string; success: boolean; data?: string; error?: string };
    response: void;
  };
}

/**
 * 타입 안전한 메시지 요청
 */
export type MessageRequest<T extends MessageType> = MessagePayloads[T]['request'];

/**
 * 타입 안전한 메시지 응답
 */
export type MessageResponse<T extends MessageType> = MessagePayloads[T]['response'];

/**
 * 타입 안전한 메시지 (요청 + 타입)
 */
export type TypedMessage<T extends MessageType> = {
  type: T;
} & (MessageRequest<T> extends void ? {} : MessageRequest<T>);
