/**
 * Background Script
 *
 * 역할:
 * - 플러그인 등록
 * - 플러그인 toggle 메시지 처리
 * - Chrome Commands (단축키) 처리
 */

import {PluginManager} from '@/core';
import {registerPlugins} from '@/plugins';
import {MessageType} from "@/core/InstanceManager";
import { detectedM3u8Map } from '@/plugins/implementations/hls-downloader';
import { PluginRegistry } from '@/core/PluginRegistry';
import { CommandRegistry } from '@/core/CommandRegistry';
import { MessageBus } from '@/core/MessageBus';
import { StorageManager } from '@/core/StorageManager';
import { BackgroundFetchService } from '@/core/BackgroundFetchService';

// Command 클래스들 import
import { GetPluginListCommand } from '@/core/commands/GetPluginListCommand';
import { GetPluginCommand } from '@/core/commands/GetPluginCommand';
import { GetPluginStateCommand } from '@/core/commands/GetPluginStateCommand';
import { GetPluginStatesCommand } from '@/core/commands/GetPluginStatesCommand';
import { GetPluginSettingsCommand } from '@/core/commands/GetPluginSettingsCommand';
import { TogglePluginCommand } from '@/core/commands/TogglePluginCommand';
import { EnablePluginCommand } from '@/core/commands/EnablePluginCommand';
import { DisablePluginCommand } from '@/core/commands/DisablePluginCommand';
import { UpdateSettingCommand } from '@/core/commands/UpdateSettingCommand';
import { OpenModalCommand } from '@/core/commands/OpenModalCommand';
import { ExecutePluginCommand } from '@/core/commands/ExecutePluginCommand';
import { DownloadImageCommand } from '@/core/commands/DownloadImageCommand';
import { GetFileSizeCommand } from '@/core/commands/GetFileSizeCommand';
import { StartNetworkThrottleCommand } from '@/core/commands/StartNetworkThrottleCommand';
import { StopNetworkThrottleCommand } from '@/core/commands/StopNetworkThrottleCommand';
import { GetSegmentUrlListCommand } from '@/core/commands/GetSegmentUrlListCommand';
import { DownloadSegmentCommand } from '@/core/commands/DownloadSegmentCommand';

export default defineBackground(async () => {
  console.log('🚀 Background script loaded');

  const ports = new Set<globalThis.Browser.runtime.Port>();

  // Port 연결 처리
  browser.runtime.onConnect.addListener((port) => {
    if (port.name === "plugin-events") {
      console.log('[Background] Port connected:', port.name);
      ports.add(port);
      port.onDisconnect.addListener(() => {
        console.log('[Background] Port disconnected');
        ports.delete(port);
      });
      return;
    }

  });

  const pluginManager = PluginManager.getInstance();
  // 플러그인 등록
  await registerPlugins();

  console.log('📦 Registered plugins:', pluginManager.getPlugins().map(p => p.name));

  // PluginManager 상태 변경 리스너 등록 → 모든 포트로 broadcast
  pluginManager.addListener((newState) => {
    console.log('[Background] State changed, broadcasting to', ports.size, 'ports');
    ports.forEach((port) => {
      try {
        port.postMessage({
          type: "PLUGIN_STATE_CHANGED",
          state: newState
        });
      } catch (e) {
        console.error('[Background] Failed to send to port:', e);
        ports.delete(port);
      }
    });
  });

  // ========================================
  // Command Pattern 초기화
  // ========================================

  const commandRegistry = CommandRegistry.getInstance();
  const pluginRegistry = PluginRegistry.getInstance();
  const storageManager = StorageManager.getInstance();
  const backgroundFetchService = BackgroundFetchService.getInstance();

  // Command 등록
  commandRegistry.registerAll([
    // 플러그인 관리 (9개)
    new GetPluginListCommand(),
    new GetPluginCommand(),
    new GetPluginStateCommand(),
    new GetPluginStatesCommand(),
    new GetPluginSettingsCommand(),
    new TogglePluginCommand(),
    new EnablePluginCommand(),
    new DisablePluginCommand(),
    new UpdateSettingCommand(),

    // 실행 (2개)
    new OpenModalCommand(),
    new ExecutePluginCommand(),

    // 유틸리티 (4개)
    new DownloadImageCommand(),
    new GetFileSizeCommand(),
    new StartNetworkThrottleCommand(),
    new StopNetworkThrottleCommand(),

    // HLS Downloader (2개)
    new GetSegmentUrlListCommand(),
    new DownloadSegmentCommand(),
  ]);

  console.log(`📦 ${commandRegistry.getCount()} commands registered`);

  // CommandContext 생성
  const commandContext = {
    pluginManager,
    pluginRegistry,
    storageManager,
    backgroundFetchService,
  };

  // MessageBus 초기화 (400줄 switch문 대체!)
  const messageBus = MessageBus.getInstance();
  messageBus.initializeHandlers(commandRegistry, commandContext);

  console.log('✅ MessageBus initialized - Command Pattern active');

});
