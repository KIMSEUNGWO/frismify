import type { Command } from './Command';
import type { CommandContext } from './CommandContext';
import { MessageType } from '@/core/InstanceManager';

export class StartNetworkThrottleCommand
  implements Command<MessageType.START_NETWORK_THROTTLE>
{
  readonly type = MessageType.START_NETWORK_THROTTLE;

  async execute(
    request: { downloadThroughput: number; uploadThroughput: number; latency: number },
    context: CommandContext
  ) {
    try {
      // Chrome DevTools Protocol을 사용하여 네트워크 스로틀링 설정
      // @ts-ignore - chrome.debugger API
      if (typeof chrome !== 'undefined' && chrome.debugger) {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]?.id) {
          const tabId = tabs[0].id;
          // @ts-ignore
          await chrome.debugger.attach({ tabId }, '1.3');
          // @ts-ignore
          await chrome.debugger.sendCommand({ tabId }, 'Network.emulateNetworkConditions', {
            offline: false,
            downloadThroughput: request.downloadThroughput,
            uploadThroughput: request.uploadThroughput,
            latency: request.latency,
          });
          console.log('✅ Network throttling started');
        }
      }
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to start network throttling:', error);
      return { success: false };
    }
  }
}
