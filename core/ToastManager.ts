/**
 * ToastManager - Singleton for managing toast notifications
 *
 * Displays toast messages in the bottom-right corner of the screen.
 * Supports different types (success, error, info, warning) and auto-dismiss.
 */

import { type Plugin } from '@/types';
import { PluginRegistry } from './PluginRegistry';
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number; // milliseconds, 0 = no auto-dismiss
}

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  element: HTMLDivElement;
  timeoutId?: number;
  isDismissing?: boolean; // Flag to prevent duplicate dismiss calls
}

export class ToastManager {
  private static instance: ToastManager;
  private container: HTMLDivElement | null = null;
  private toasts: Map<string, Toast> = new Map();
  private nextId = 0;
  private pluginRegistry: PluginRegistry;

  private constructor() {
    this.pluginRegistry = PluginRegistry.getInstance();
  }

  static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager();
    }
    return ToastManager.instance;
  }

  /**
   * Initialize toast container (call once when content script loads)
   */
  initialize(): void {
    if (this.container) return;

    this.container = document.createElement('div');
    this.container.id = 'prismify-toast-container';
    this.container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 2147483646;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
    `;

    document.body.appendChild(this.container);
  }

  /**
   * Show a toast notification
   */
  show(options: ToastOptions, pluginId?: string): string {
    if (!this.container) {
      this.initialize();
    }

    const id = `toast-${this.nextId++}`;
    const type = options.type || 'info';
    const duration = options.duration !== undefined ? options.duration : 3000;

    const toastElement = this.createToastElement(options.message, type, pluginId);
    this.container!.appendChild(toastElement);

    const toast: Toast = {
      id,
      message: options.message,
      type,
      duration,
      element: toastElement,
    };

    this.toasts.set(id, toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toastElement.style.transform = 'translateX(0)';
      toastElement.style.opacity = '1';
    });

    // Auto-dismiss if duration > 0
    if (duration > 0) {
      toast.timeoutId = window.setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  /**
   * Dismiss a toast by ID
   */
  dismiss(id: string): void {
    const toast = this.toasts.get(id);
    if (!toast) return;

    // Prevent duplicate dismiss calls
    if (toast.isDismissing) return;
    toast.isDismissing = true;

    // Clear timeout if exists
    if (toast.timeoutId) {
      clearTimeout(toast.timeoutId);
      toast.timeoutId = undefined;
    }

    // Animate out
    toast.element.style.transform = 'translateX(400px)';
    toast.element.style.opacity = '0';

    // Remove after animation completes
    setTimeout(() => {
      // Double-check element still exists
      if (toast.element && toast.element.parentNode) {
        toast.element.parentNode.removeChild(toast.element);
      }
      this.toasts.delete(id);
    }, 350); // Slightly longer than animation duration to ensure completion
  }

  /**
   * Dismiss all toasts
   */
  dismissAll(): void {
    for (const id of this.toasts.keys()) {
      this.dismiss(id);
    }
  }

  /**
   * Cleanup (remove container)
   */
  cleanup(): void {
    this.dismissAll();
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
  }

  /**
   * Shorthand methods
   */
  success(message: string, duration?: number, pluginId?: string): string {
    return this.show({ message, type: 'success', duration}, pluginId);
  }

  error(message: string, duration?: number, pluginId?: string): string {
    return this.show({ message, type: 'error', duration }, pluginId);
  }

  info(message: string, duration?: number, pluginId?: string): string {
    return this.show({ message, type: 'info', duration }, pluginId);
  }

  warning(message: string, duration?: number, pluginId?: string): string {
    return this.show({ message, type: 'warning', duration }, pluginId);
  }

  /**
   * Create toast DOM element
   */
  private createToastElement(message: string, type: ToastType, pluginId?: string): HTMLDivElement {
    // Find plugin if pluginId is provided
    const plugin = pluginId ? this.pluginRegistry.get(pluginId) : undefined;

    const toast = document.createElement('div');
    toast.style.cssText = `
      display: flex;
      align-items: flex-start;
      gap: 12px;
      min-width: 300px;
      max-width: 400px;
      padding: 16px 20px;
      border: 2px solid ${this.getBackgroundColor(type)};
      background: rgba(17, 17, 27, 0.95);
      backdrop-filter: blur(10px);
      color: white;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      line-height: 1.4;
      pointer-events: auto;
      cursor: pointer;
      transform: translateX(400px);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;

    // Plugin Icon (if available)
    if (plugin) {
      const pluginIconContainer = document.createElement('div');
      pluginIconContainer.style.cssText = `
        flex-shrink: 0;
        width: 36px;
        height: 36px;
        border-radius: 8px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      // Render plugin icon
      if (plugin.icon) {
        plugin.icon(pluginIconContainer);
      }

      toast.appendChild(pluginIconContainer);
    }

    // Content container (plugin name + message)
    const contentContainer = document.createElement('div');
    contentContainer.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    `;

    // Plugin name (if available)
    if (plugin) {
      const pluginNameEl = document.createElement('div');
      pluginNameEl.style.cssText = `
        font-size: 12px;
        color: #94A3B8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      `;
      pluginNameEl.textContent = plugin.name;
      contentContainer.appendChild(pluginNameEl);
    }

    // Message
    const messageEl = document.createElement('div');
    messageEl.style.cssText = `
      font-size: 14px;
      word-break: break-word;
    `;
    messageEl.textContent = message;
    contentContainer.appendChild(messageEl);

    // Status Icon (success/error/warning/info)
    const statusIcon = document.createElement('div');
    statusIcon.style.cssText = `
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: ${plugin ? '8px' : '0px'};
    `;
    statusIcon.innerHTML = this.getIcon(type);

    toast.appendChild(contentContainer);
    toast.appendChild(statusIcon);

    // Click to dismiss
    toast.addEventListener('click', () => {
      const toastId = Array.from(this.toasts.entries()).find(
        ([_, t]) => t.element === toast
      )?.[0];
      if (toastId) {
        this.dismiss(toastId);
      }
    });

    // Hover to pause auto-dismiss
    toast.addEventListener('mouseenter', () => {
      const toastData = Array.from(this.toasts.entries()).find(
        ([_, t]) => t.element === toast
      )?.[1];
      if (toastData?.timeoutId) {
        clearTimeout(toastData.timeoutId);
        toastData.timeoutId = undefined;
      }
    });

    return toast;
  }

  private getBackgroundColor(type: ToastType): string {
    switch (type) {
      case 'success':
        return '#22C55E';
      case 'error':
        return '#EF4444';
      case 'warning':
        return '#FB923C';
      case 'info':
      default:
        return '#06B6D4';
    }
  }

  private getIcon(type: ToastType): string {
    switch (type) {
      case 'success':
        return `<svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10.6577 1.31605C13.1915 0.808133 15.822 1.13718 18.1522 2.25445C18.6916 2.51307 18.9195 3.16018 18.6611 3.6996C18.4024 4.23896 17.7553 4.46684 17.2159 4.20847C15.3095 3.29435 13.1571 3.02492 11.0841 3.4404C9.01092 3.85598 7.12828 4.93429 5.72137 6.51267C4.31468 8.09095 3.45936 10.0838 3.28387 12.1906C3.10839 14.2977 3.62267 16.4051 4.74912 18.1945C5.87556 19.9837 7.55314 21.3582 9.5289 22.111C11.5047 22.8637 13.6716 22.9542 15.7031 22.3681C17.7346 21.7819 19.5207 20.5507 20.7918 18.861C22.0627 17.1713 22.75 15.1143 22.75 13C22.75 12.4017 23.235 11.9166 23.8333 11.9166C24.4317 11.9166 24.9167 12.4017 24.9167 13C24.9167 15.5842 24.0761 18.0981 22.5226 20.1633C20.9691 22.2284 18.7868 23.7325 16.304 24.449C13.8211 25.1655 11.1725 25.0558 8.75766 24.1359C6.34283 23.2158 4.29247 21.5355 2.9157 19.3487C1.53894 17.1617 0.910129 14.5861 1.12461 12.0108C1.33912 9.43552 2.38531 6.99977 4.10483 5.07069C5.82433 3.14173 8.12403 1.82399 10.6577 1.31605Z" fill="#22C55E"/>
          <path d="M23.0674 3.56736C23.4903 3.14446 24.1761 3.14463 24.5993 3.56736C25.0222 3.99024 25.022 4.67611 24.5993 5.09926L14.533 15.1762C13.687 16.023 12.3135 16.0237 11.4671 15.1772L8.98406 12.6932C8.56112 12.2701 8.56104 11.5843 8.98406 11.1613C9.4071 10.7384 10.0929 10.7384 10.516 11.1613L13 13.6453L23.0674 3.56736Z" fill="#22C55E"/>
        </svg>`;
      case 'error':
        return `<svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10.6577 1.31605C13.1915 0.808133 15.822 1.13718 18.1522 2.25445C18.6916 2.51307 18.9195 3.16018 18.6611 3.6996C18.4024 4.23896 17.7553 4.46684 17.2159 4.20847C15.3095 3.29435 13.1571 3.02492 11.0841 3.4404C9.01092 3.85598 7.12828 4.93429 5.72137 6.51267C4.31468 8.09095 3.45936 10.0838 3.28387 12.1906C3.10839 14.2977 3.62267 16.4051 4.74912 18.1945C5.87556 19.9837 7.55314 21.3582 9.5289 22.111C11.5047 22.8637 13.6716 22.9542 15.7031 22.3681C17.7346 21.7819 19.5207 20.5507 20.7918 18.861C22.0627 17.1713 22.75 15.1143 22.75 13C22.75 12.4017 23.235 11.9166 23.8333 11.9166C24.4317 11.9166 24.9167 12.4017 24.9167 13C24.9167 15.5842 24.0761 18.0981 22.5226 20.1633C20.9691 22.2284 18.7868 23.7325 16.304 24.449C13.8211 25.1655 11.1725 25.0558 8.75766 24.1359C6.34283 23.2158 4.29247 21.5355 2.9157 19.3487C1.53894 17.1617 0.910129 14.5861 1.12461 12.0108C1.33912 9.43552 2.38531 6.99977 4.10483 5.07069C5.82433 3.14173 8.12403 1.82399 10.6577 1.31605Z" fill="#EF4444"/>
            <path d="M14.9424 9.52569C15.3655 9.10262 16.0512 9.10262 16.4743 9.52569C16.8974 9.94876 16.8974 10.6345 16.4743 11.0576L11.0576 16.4743C10.6346 16.8973 9.9488 16.8973 9.52573 16.4743C9.10266 16.0512 9.10266 15.3654 9.52573 14.9424L14.9424 9.52569Z" fill="#EF4444"/>
            <path d="M9.52573 9.52569C9.9488 9.10262 10.6346 9.10262 11.0576 9.52569L16.4743 14.9424C16.8974 15.3654 16.8974 16.0512 16.4743 16.4743C16.0512 16.8973 15.3655 16.8973 14.9424 16.4743L9.52573 11.0576C9.10266 10.6345 9.10266 9.94876 9.52573 9.52569Z" fill="#EF4444"/>
        </svg>`;
      case 'warning':
        return `<svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12.9982 2.05835C13.5567 2.05839 14.1059 2.20224 14.5925 2.47624C15.0183 2.71593 15.3834 3.04836 15.6621 3.44743L15.7764 3.62305L24.9562 18.9463L24.9646 18.9611C25.2484 19.4525 25.3989 20.0102 25.4005 20.5776C25.402 21.145 25.254 21.7034 24.9731 22.1963C24.6921 22.6891 24.2866 23.0998 23.7977 23.3875C23.3087 23.6752 22.7527 23.8299 22.1854 23.8361H3.80999C3.24262 23.8298 2.6867 23.6753 2.19768 23.3875C1.7087 23.0998 1.30331 22.6892 1.02231 22.1963C0.741337 21.7034 0.59442 21.145 0.595959 20.5776C0.597548 20.0102 0.748055 19.4525 1.03183 18.9611L1.0403 18.9463L10.219 3.62305C10.5087 3.14547 10.9172 2.75027 11.4039 2.47624C11.8906 2.20232 12.4398 2.05835 12.9982 2.05835ZM12.9982 4.22502C12.812 4.22502 12.6283 4.27332 12.4661 4.36466C12.304 4.456 12.1679 4.58754 12.0715 4.74658L2.90756 20.0444C2.81305 20.2081 2.76324 20.3939 2.76263 20.5829C2.7621 20.7719 2.8109 20.9583 2.90439 21.1225C2.99806 21.2868 3.13386 21.4243 3.29689 21.5203C3.45985 21.6161 3.64529 21.6674 3.83432 21.6694H22.1621C22.3512 21.6673 22.5366 21.6162 22.6996 21.5203C22.8626 21.4243 22.9973 21.2868 23.091 21.1225C23.1846 20.9582 23.2343 20.772 23.2338 20.5829C23.2332 20.3939 23.1823 20.2081 23.0878 20.0444L13.9239 4.74658L13.8446 4.63232C13.758 4.52392 13.6509 4.43315 13.5293 4.36466C13.3671 4.27336 13.1843 4.22506 12.9982 4.22502Z" fill="#FB923C"/>
            <path d="M11.9167 15.1667V10.8333C11.9167 10.235 12.4018 9.75002 13.0001 9.75002C13.5984 9.75002 14.0834 10.235 14.0834 10.8333V15.1667C14.0834 15.765 13.5984 16.25 13.0001 16.25C12.4018 16.25 11.9167 15.765 11.9167 15.1667Z" fill="#FB923C"/>
            <path d="M14.0834 18.4167C14.0834 19.015 13.5984 19.5 13.0001 19.5C12.4018 19.5 11.9167 19.015 11.9167 18.4167C11.9167 17.8184 12.4018 17.3333 13.0001 17.3333C13.5984 17.3333 14.0834 17.8184 14.0834 18.4167Z" fill="#FB923C"/>
        </svg>`;
      case 'info':
      default:
        return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9.838 1.21485C12.1769 0.746002 14.605 1.04973 16.756 2.08106C17.2538 2.31979 17.4642 2.91712 17.2257 3.41505C16.987 3.91292 16.3896 4.12327 15.8917 3.88477C14.1319 3.04097 12.1451 2.79227 10.2316 3.17579C8.31787 3.5594 6.58004 4.55476 5.28136 6.01173C3.98287 7.4686 3.19335 9.30812 3.03136 11.2529C2.86937 13.198 3.3441 15.1432 4.38389 16.7949C5.42369 18.4465 6.97222 19.7153 8.796 20.4102C10.6198 21.105 12.62 21.1885 14.4952 20.6475C16.3705 20.1064 18.0192 18.9699 19.1925 17.4102C20.3657 15.8505 21.0001 13.9517 21.0001 12C21.0001 11.4477 21.4478 11 22.0001 11C22.5524 11 23.0001 11.4477 23.0001 12C23.0001 14.3855 22.2242 16.706 20.7901 18.6123C19.3562 20.5186 17.3418 21.907 15.0499 22.5684C12.758 23.2297 10.3132 23.1285 8.08409 22.2793C5.85502 21.43 3.96237 19.879 2.69151 17.8604C1.42065 15.8416 0.840213 13.4642 1.03819 11.0869C1.2362 8.70974 2.20192 6.46136 3.78917 4.68067C5.3764 2.90009 7.4992 1.68371 9.838 1.21485Z" fill="#06B6D4"/>
          <path d="M12.0001 10C12.5524 10 13.0001 10.5227 13.0001 11.167V15.833C13.0001 16.4773 12.5524 17 12.0001 17C11.4478 17 11.0001 16.4773 11.0001 15.833V11.167C11.0001 10.5227 11.4478 10 12.0001 10ZM12.0001 7.00001C12.5524 7.00001 13.0001 7.44772 13.0001 8.00001C13.0001 8.55229 12.5524 9.00001 12.0001 9.00001C11.4478 9.00001 11.0001 8.55229 11.0001 8.00001C11.0001 7.44772 11.4478 7.00001 12.0001 7.00001Z" fill="#06B6D4"/>
        </svg>`;
    }
  }
}

// Export singleton instance
export const toastManager = ToastManager.getInstance();