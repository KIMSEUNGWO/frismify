import {createApp} from "vue";
import App from "@/entrypoints/content/App.vue";
import { createModalRouter } from "@/entrypoints/content/router";
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import type { ModalPlugin } from '@/types';


export class ModalManager {

    private static instance: ModalManager;
    private modalStack: string[] = []; // Stack of plugin IDs
    private apps: Map<string, ReturnType<typeof createApp>> = new Map();
    private ctx?: ContentScriptContext; // Content script context
    private plugins: Map<string, ModalPlugin> = new Map(); // Plugin registry

    private readonly MODAL_CONTAINER = 'modal-container';
    private readonly PADDING = 20;
    private readonly MODAL_GAP = 10;

    private constructor() {}

    public static getInstance(): ModalManager {
        if (!ModalManager.instance) {
            ModalManager.instance = new ModalManager();
        }
        return ModalManager.instance;
    }

    public initialize(ctx: ContentScriptContext, plugins: ModalPlugin[]) {
        this.ctx = ctx;
        for (const plugin of plugins) {
            this.plugins.set(plugin.id, plugin);
        }
    }

    public isOpen(pluginId: string): boolean {
        return this.modalStack.includes(pluginId);
    }

    public isAnyOpen(): boolean {
        return this.modalStack.length > 0;
    }

    public getModalStack(): string[] {
        return [...this.modalStack];
    }

    public async openModal(pluginId: string) {
        // If already open, bring to front and highlight
        if (this.modalStack.includes(pluginId)) {
            this.bringToFront(pluginId);
            this.highlightModal(pluginId);
            return;
        }

        this.createModal(pluginId);
        this.modalStack.push(pluginId);
        this.notifyStackChange();

        // Call onOpen hook if exists
        const plugin = this.plugins.get(pluginId);
        if (plugin?.onOpen && this.ctx) {
            try {
                await plugin.onOpen(this.ctx);
                console.log(`✅ Modal onOpen called: ${pluginId}`);
            } catch (error) {
                console.error(`❌ Modal onOpen error (${pluginId}):`, error);
            }
        }
    }

    public async removeModal(pluginId?: string) {
        const targetId = pluginId ?? this.modalStack[this.modalStack.length - 1];
        if (!targetId) return;

        // Call onClose hook if exists
        const plugin = this.plugins.get(targetId);
        if (plugin?.onClose && this.ctx) {
            try {
                await plugin.onClose(this.ctx);
                console.log(`✅ Modal onClose called: ${targetId}`);
            } catch (error) {
                console.error(`❌ Modal onClose error (${targetId}):`, error);
            }
        }

        const app = this.apps.get(targetId);
        if (app) {
            app.unmount();
            this.apps.delete(targetId);
        }

        const modalElement = document.querySelector(`[data-modal-id="${targetId}"]`);
        modalElement?.remove();

        this.modalStack = this.modalStack.filter(id => id !== targetId);
        this.notifyStackChange();
    }

    public bringToFront(pluginId: string) {
        if (!this.modalStack.includes(pluginId)) return;

        this.modalStack = this.modalStack.filter(id => id !== pluginId);
        this.modalStack.push(pluginId);
        this.notifyStackChange();
    }

    public getModalIndex(pluginId: string): number {
        return this.modalStack.indexOf(pluginId);
    }

    public arrangeModals() {
        if (this.modalStack.length === 0) return;

        // Arrange modals in a vertical column pattern from top-right, expanding left
        let currentRight = this.PADDING;
        let currentY = this.PADDING;
        let columnWidth = 0;
        const maxHeight = window.innerHeight - this.PADDING;

        this.getModalStack()
            .reverse()
            .map(pluginId => document.querySelector(`[data-modal-id="${pluginId}"] .prismify-container`) as HTMLElement)
            .filter(element => element !== null)
            .forEach((element, index) => {
                const rect = element.getBoundingClientRect();

                // Check if we need to move to next column (left)
                if (currentY + rect.height > maxHeight && index > 0) {
                    currentRight += columnWidth + this.MODAL_GAP;
                    currentY = this.PADDING;  // Top은 항상 PADDING (화면 가장자리)
                    columnWidth = 0;
                }

                // Apply position with transition
                element.style.transition = "all 0.3s ease";
                element.style.right = `${currentRight}px`;
                element.style.top = `${currentY}px`;

                // Update tracking variables
                currentY += rect.height + this.MODAL_GAP;
                columnWidth = Math.max(columnWidth, rect.width);

                // Remove transition after animation
                setTimeout(() => {
                    element.style.transition = "";
                }, 300);
            })
    }

    private highlightModal(pluginId: string) {
        const element = document.querySelector(`[data-modal-id="${pluginId}"] .prismify-container`) as HTMLElement;
        if (!element) return;

        // Add highlight effect
        element.style.animation = "modal-highlight 0.6s ease";

        // Remove animation after it completes
        setTimeout(() => {
            element.style.animation = "";
        }, 600);
    }

    private createModal(pluginId: string) {
        const container = document.createElement("div");
        container.setAttribute('data-modal-id', pluginId);
        container.classList.add('prismify-modal-wrapper');

        const modalContainer = document.getElementById(this.MODAL_CONTAINER) || this.createModalContainer();
        modalContainer.appendChild(container);

        console.log(`🔧 Mounting modal for ${pluginId}...`);

        // 각 모달마다 독립적인 router 인스턴스 생성
        const modalRouter = createModalRouter();

        const app = createApp(App)
            .provide('pluginId', pluginId)
            .use(modalRouter);
        app.mount(container);
        this.apps.set(pluginId, app);
    }

    private createModalContainer(): HTMLElement {
        const container = document.createElement("div");
        container.id = this.MODAL_CONTAINER;
        document.body.appendChild(container);
        return container;
    }

    private notifyStackChange() {
        // Dispatch custom event for components to react
        window.dispatchEvent(new CustomEvent('modal-stack-change', {
            detail: { stack: this.getModalStack() }
        }));
    }
}

export const modalManager = ModalManager.getInstance();
