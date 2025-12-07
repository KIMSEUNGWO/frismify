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

export default defineBackground(async () => {
  console.log('🚀 Background script loaded');

  const ports = new Set<globalThis.Browser.runtime.Port>();

  // Port 연결 처리
  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== "plugin-events") return;
    console.log('[Background] Port connected:', port.name);
    ports.add(port);
    port.onDisconnect.addListener(() => {
      console.log('[Background] Port disconnected');
      ports.delete(port);
    });
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

  // 메시지 리스너 (통합 - 중복 제거)
  // CRITICAL: sendResponse + return true 패턴 사용 (async listener는 Promise를 자동으로 기다리지 않음)
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // async 로직을 IIFE로 감싸서 실행
    (async () => {
      try {
        switch (message.type) {
          case MessageType.TOGGLE_PLUGIN : {
            const {pluginId} = message;
            await pluginManager.togglePlugin(pluginId);
            console.log(`✅ Plugin ${pluginId} toggled`);
            sendResponse({success: true});
            break;
          }

          case MessageType.ENABLE_PLUGIN: {
            const {pluginId} = message;
            await pluginManager.enablePlugin(pluginId);
            console.log(`✅ Plugin ${pluginId} enabled`);
            sendResponse({success: true});
            break;
          }

          case MessageType.DISABLE_PLUGIN: {
            const {pluginId} = message;
            await pluginManager.disablePlugin(pluginId);
            console.log(`✅ Plugin ${pluginId} disabled`);
            sendResponse({success: true});
            break;
          }

          case MessageType.UPDATE_SETTING: {
            const {pluginId, settingId, value} = message;
            await pluginManager.updateSetting(pluginId, settingId, value);
            console.log(`✅ Plugin ${pluginId} setting ${settingId} updated`);
            sendResponse({success: true});
            break;
          }

          case MessageType.GET_PLUGIN_LIST: {
            sendResponse({
              plugins: pluginManager.getPlugins(),
            });
            break;
          }

          case MessageType.GET_PLUGIN: {
            const {pluginId} = message;
            const plugin = pluginManager.get(pluginId);
            sendResponse({
              plugin: plugin
            });
            break;
          }

          case MessageType.GET_PLUGIN_STATE: {
            const {pluginId} = message;
            const config = await pluginManager.getPluginState(pluginId);
            sendResponse({
              config: config
            });
            break;
          }

          case MessageType.GET_PLUGIN_STATES: {
            const configs = pluginManager.getPluginStates();
            sendResponse({
              configs: configs
            });
            break;
          }

          case MessageType.GET_PLUGIN_SETTINGS: {
            const {pluginId} = message;
            const settings = await pluginManager.getSettings(pluginId);
            sendResponse({
              settings: settings
            });
            break;
          }

          case MessageType.OPEN_MODAL: {
            const { pluginId } = message;
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            if (tabs[0]?.id) {
              await browser.tabs.sendMessage(tabs[0].id, {
                type: MessageType.OPEN_MODAL,
                pluginId
              });
            }
            console.log(`✅ Plugin ${pluginId} open modal message sent`);
            sendResponse({ success: true });
            break;
          }

          case MessageType.EXECUTE_PLUGIN: {
            const { pluginId } = message;
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            if (tabs[0]?.id) {
              await browser.tabs.sendMessage(tabs[0].id, {
                type: MessageType.EXECUTE_PLUGIN,
                pluginId,
              });
              console.log(`✅ Plugin ${pluginId} execute message sent`);
            }
            sendResponse({ success: true });
            break;
          }

          case MessageType.DOWNLOAD_IMAGE: {
            const { url, filename } = message;
            try {
              // browser.downloads API는 background script에서만 제대로 작동
              // 확장 프로그램 권한으로 CORS를 완전히 우회 가능
              await browser.downloads.download({
                url: url,
                filename: filename,
                saveAs: false,
                conflictAction: 'uniquify',
              });
              console.log(`✅ Image downloaded: ${filename}`);
              sendResponse({ success: true });
            } catch (error) {
              console.error('❌ Image download failed:', error);
              sendResponse({ success: false, error: String(error) });
            }
            break;
          }

          case MessageType.GET_FILE_SIZE: {
            const { url } = message;
            try {
              // Background Script는 CORS 제한 없이 리소스 접근 가능
              const response = await fetch(url, {
                method: 'HEAD',
                cache: 'force-cache',
              });

              const contentLength = response.headers.get('Content-Length');
              if (contentLength) {
                sendResponse({ success: true, size: parseInt(contentLength, 10) });
              } else {
                // Content-Length 없으면 GET으로 실제 다운로드
                const fullResponse = await fetch(url, { cache: 'force-cache' });
                const blob = await fullResponse.blob();
                sendResponse({ success: true, size: blob.size });
              }
            } catch (error) {
              console.error('❌ Get file size failed:', error);
              sendResponse({ success: false, error: String(error) });
            }
            break;
          }

          default:
            sendResponse(undefined);
        }
      } catch (error) {
        console.error('❌ Message handler error:', error);
        sendResponse({ success: false, error: String(error) });
      }
    })();

    // return true: sendResponse를 비동기로 호출할 것임을 명시
    return true;
  });
});
