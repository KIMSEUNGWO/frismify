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

    // HLS Segment Fetch Port 처리
    if (port.name === "segment-fetch") {
      console.log('[Background] Segment fetch port connected');

      port.onMessage.addListener(async (message) => {
        if (message.type === MessageType.GET_SEGMENT_URL_LIST) {
          const { m3u8Url } = message;
          const requestId = crypto.randomUUID();

          // Port와 requestId 매핑 저장 (응답용)
          pendingSegmentRequests.set(requestId, port);

          try {
            // 현재 active tab 가져오기
            const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
            if (!tab.id) {
              throw new Error('No active tab found');
            }

            await browser.scripting.executeScript({
              target: { tabId: tab.id },
              world: "MAIN",
              func: (url, id) => {
                // ⭐ async 제거 - 동기 함수로 변경
                fetch(url)
                  .then(res => res.text())
                  .then(text => {
                    const lists: string[] = text.split('\n')
                      .map(line => line.trim())
                      .filter(line => line.startsWith('http'));

                    window.postMessage({
                      type: 'GET_SEGMENT_URL_LIST',
                      requestId: id,
                      data: lists
                    }, "*");
                  })
                  .catch(error => {
                    window.postMessage({
                      type: 'GET_SEGMENT_URL_LIST',
                      requestId: id,
                      error: String(error)
                    }, "*");
                  });
              },
              args: [m3u8Url, requestId],
            });
          } catch (error) {
            console.error('❌ executeScript failed:', error);
            port.postMessage({
              type: MessageType.GET_SEGMENT_URL_LIST_RESULT,
              success: false,
              error: String(error)
            });
            pendingSegmentRequests.delete(requestId);
          }
        }

        // Segment 다운로드 처리
        if (message.type === MessageType.DOWNLOAD_SEGMENT) {
          const { segmentUrl } = message;
          const requestId = crypto.randomUUID();

          // Port와 requestId 매핑 저장
          pendingSegmentRequests.set(requestId, port);

          try {
            const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
            if (!tab.id) {
              throw new Error('No active tab found');
            }

            await browser.scripting.executeScript({
              target: { tabId: tab.id },
              world: "MAIN",
              func: (url, id) => {
                fetch(url)
                  .then(res => res.arrayBuffer())
                  .then(buffer => {
                    // ArrayBuffer를 base64로 인코딩
                    const bytes = new Uint8Array(buffer);
                    let binary = '';
                    for (let i = 0; i < bytes.length; i++) {
                      binary += String.fromCharCode(bytes[i]);
                    }
                    const base64 = btoa(binary);

                    window.postMessage({
                      type: 'DOWNLOAD_SEGMENT',
                      requestId: id,
                      data: base64
                    }, "*");
                  })
                  .catch(error => {
                    window.postMessage({
                      type: 'DOWNLOAD_SEGMENT',
                      requestId: id,
                      error: String(error)
                    }, "*");
                  });
              },
              args: [segmentUrl, requestId],
            });
          } catch (error) {
            console.error('❌ Segment download failed:', error);
            port.postMessage({
              type: MessageType.DOWNLOAD_SEGMENT_RESULT,
              success: false,
              error: String(error)
            });
            pendingSegmentRequests.delete(requestId);
          }
        }
      });

      port.onDisconnect.addListener(() => {
        console.log('[Background] Segment fetch port disconnected');
        // 해당 Port의 pending requests 제거
        for (const [requestId, p] of pendingSegmentRequests.entries()) {
          if (p === port) {
            pendingSegmentRequests.delete(requestId);
          }
        }
      });
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

          case MessageType.START_NETWORK_THROTTLE: {
            const { downloadThroughput, uploadThroughput, latency } = message;
            try {
              const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
              if (!tab.id) {
                throw new Error('No active tab found');
              }

              // Attach debugger to current tab
              await browser.debugger.attach({ tabId: tab.id }, '1.3');

              // Enable network domain
              await browser.debugger.sendCommand({ tabId: tab.id }, 'Network.enable');

              // Emulate network conditions
              await browser.debugger.sendCommand(
                { tabId: tab.id },
                'Network.emulateNetworkConditions',
                {
                  offline: false,
                  downloadThroughput,
                  uploadThroughput,
                  latency,
                }
              );

              console.log('✅ Network throttling started');
              sendResponse({ success: true });
            } catch (error) {
              console.error('❌ Network throttling failed:', error);
              sendResponse({ success: false, error: String(error) });
            }
            break;
          }

          case MessageType.STOP_NETWORK_THROTTLE: {
            try {
              const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
              if (!tab.id) {
                throw new Error('No active tab found');
              }

              // Disable network conditions (restore normal speed)
              await browser.debugger.sendCommand(
                { tabId: tab.id },
                'Network.emulateNetworkConditions',
                {
                  offline: false,
                  downloadThroughput: -1, // unlimited
                  uploadThroughput: -1,   // unlimited
                  latency: 0,
                }
              );

              // Detach debugger
              await browser.debugger.detach({ tabId: tab.id });

              console.log('✅ Network throttling stopped');
              sendResponse({ success: true });
            } catch (error) {
              console.error('❌ Stop network throttling failed:', error);
              sendResponse({ success: false, error: String(error) });
            }
            break;
          }

          case MessageType.GET_M3U8_LIST: {
            // sender.tab.id를 사용하여 현재 탭의 m3u8 목록 반환
            const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
            if (!tab.id) {
              sendResponse({ success: false, data: [] });
              break;
            }
            const m3u8List = detectedM3u8Map.get(tab.id) || [];
            sendResponse({ success: true, data: m3u8List });
            break;
          }

          case MessageType.GET_SEGMENT_URL_LIST: {
            const { m3u8Url } = message;

            // CORS, Authority 우회
            // Background, Content Script 모두 권한 문제때문에 데이터를 가져오지 못함
            // 따라서 Page 에서 fetch 요청 ( Page 에서 요청하는 것은 원본 웹에서 요청하는 것과 구분할 수 없는 점을 이용)
            // Background 와 Page 는 완전 분리되어있기 때문에 Background(GET_SEGMENT_URL_LIST) -> Page -> Content Script -> Background(GET_SEGMENT_URL_LIST_RESULT) 순서로 데이터 요청
            // 1. GET_SEGMENT_URL_LIST : Request를 임시저장 후 Page 에 fetch 메소드 요청
            // 2. Page : fetch 요청하고 데이터 반환
            // 3. Content Script Event Listener 에서 데이터 수신 후 Background로 데이터 송신
            // 4. GET_SEGMENT_URL_LIST_RESULT : GET_SEGMENT_URL_LIST 에서 Request를 가져와 데이터를 담아 기존 흐름대로 반환
            try {
              const tabId = sender.tab!.id!;
              const requestId = crypto.randomUUID();
              pendingRequests.set(requestId, sendResponse);

              browser.scripting.executeScript({
                target: { tabId: tabId },
                world: "MAIN", // ⭐ 중요
                func: async (url, id) => {
                  const res = await fetch(url);
                  const text = await res.text();

                  // Parse M3U8 using simple parser
                  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
                  const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);

                  const result: any = {
                    segments: [],
                    audioSegments: [],
                    videoSegments: [],
                    hasAudioTrack: false,
                    hasVideoTrack: false,
                  };

                  let currentAudioUrl: string | null = null;
                  let currentVideoUrl: string | null = null;

                  for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];

                    // Check for audio/video track definitions
                    if (line.startsWith('#EXT-X-MEDIA:')) {
                      if (line.includes('TYPE=AUDIO')) {
                        result.hasAudioTrack = true;
                        const uriMatch = line.match(/URI="([^"]+)"/);
                        if (uriMatch) {
                          currentAudioUrl = uriMatch[1].startsWith('http')
                            ? uriMatch[1]
                            : baseUrl + uriMatch[1];
                        }
                      }
                    }

                    // Check for stream info (video variants)
                    if (line.startsWith('#EXT-X-STREAM-INF:')) {
                      result.hasVideoTrack = true;
                      const nextLine = lines[i + 1];
                      if (nextLine && !nextLine.startsWith('#')) {
                        currentVideoUrl = nextLine.startsWith('http')
                          ? nextLine
                          : baseUrl + nextLine;
                      }
                    }

                    // Collect segment URLs (for simple playlists)
                    if (!line.startsWith('#') && (line.endsWith('.ts') || line.endsWith('.m4s'))) {
                      const segmentUrl = line.startsWith('http') ? line : baseUrl + line;
                      result.segments.push(segmentUrl);
                    }
                  }

                  // If this is a master playlist with separate audio/video
                  if (result.hasAudioTrack && currentAudioUrl) {
                    result.audioPlaylistUrl = currentAudioUrl;
                  }
                  if (result.hasVideoTrack && currentVideoUrl) {
                    result.videoPlaylistUrl = currentVideoUrl;
                  }

                  window.postMessage({
                    type: MessageType.GET_SEGMENT_URL_LIST,
                    requestId: id,
                    data: result
                  }, "*");
                },
                args: [m3u8Url, requestId],
              });

              return true;
            } catch (e) {
              console.error('❌ M3U8 List download failed:', e);
              sendResponse({ success: false, error: String(e) });
            }
            break;
          }

          case MessageType.GET_SEGMENT_URL_LIST_RESULT: {
            // Port 기반 요청 확인
            const port = pendingSegmentRequests.get(message.requestId);
            if (port) {
              try {
                port.postMessage({
                  type: MessageType.GET_SEGMENT_URL_LIST_RESULT,
                  success: true,
                  data: message.data,
                  error: message.error
                });
              } catch (error) {
                console.error('❌ Failed to send segment result via port:', error);
              }
              pendingSegmentRequests.delete(message.requestId);
              break;
            }

            // 기존 sendMessage 기반 요청 (fallback)
            const resolve = pendingRequests.get(message.requestId);
            if (resolve) {
              resolve({
                success: true,
                data: message.data
              });
              pendingRequests.delete(message.requestId);
            }
            break;
          }

          case MessageType.DOWNLOAD_SEGMENT_RESULT: {
            // Port 기반 요청 확인
            const port = pendingSegmentRequests.get(message.requestId);
            if (port) {
              try {
                port.postMessage({
                  type: MessageType.DOWNLOAD_SEGMENT_RESULT,
                  success: !message.error,
                  data: message.data,
                  error: message.error
                });
              } catch (error) {
                console.error('❌ Failed to send segment download result via port:', error);
              }
              pendingSegmentRequests.delete(message.requestId);
            }
            break;
          }

          case MessageType.DOWNLOAD_HLS: {
            const { m3u8Url, filename } = message;
            try {
              // HLS 다운로드는 Modal에서 처리하고,
              // Background는 최종 blob을 downloads API로 저장
              sendResponse({ success: true });
            } catch (error) {
              console.error('❌ HLS download failed:', error);
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

const pendingRequests = new Map<
    string,
    (response: { success: boolean; data?: any; error?: string }) => void
>();

// Port 기반 Segment Fetch 요청 관리
const pendingSegmentRequests = new Map<string, globalThis.Browser.runtime.Port>();
