import type { Command } from './Command';
import type { CommandContext } from './CommandContext';
import { MessageType } from '@/core/InstanceManager';

export class StopNetworkThrottleCommand implements Command<MessageType.STOP_NETWORK_THROTTLE> {
  readonly type = MessageType.STOP_NETWORK_THROTTLE;

  async execute(request: void, context: CommandContext) {
    try {
      // Chrome DevTools Protocol을 사용하여 네트워크 스로틀링 해제
      // @ts-ignore - chrome.debugger API
      if (typeof chrome !== 'undefined' && chrome.debugger) {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]?.id) {
          const tabId = tabs[0].id;
          // @ts-ignore
          await chrome.debugger.sendCommand({ tabId }, 'Network.emulateNetworkConditions', {
            offline: false,
            downloadThroughput: -1,
            uploadThroughput: -1,
            latency: 0,
          });
          // @ts-ignore
          await chrome.debugger.detach({ tabId });
          console.log('✅ Network throttling stopped');
        }
      }
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to stop network throttling:', error);
      return { success: false };
    }
  }
}
