import {createApp} from "vue";
import App from "@/entrypoints/content/App.vue";
import router from "@/entrypoints/content/router";


export class ModalManager {

    private static instance: ModalManager;
    private modalStack: string[] = []; // Stack of plugin IDs
    private apps: Map<string, ReturnType<typeof createApp>> = new Map();

    private constructor() {
    }

    public static getInstance(): ModalManager {
        if (!ModalManager.instance) {
            ModalManager.instance = new ModalManager();
        }
        return ModalManager.instance;
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

    public openModal(pluginId: string) {
        // If already open, bring to front
        if (this.modalStack.includes(pluginId)) {
            this.bringToFront(pluginId);
            return;
        }

        this.createModal(pluginId);
        this.modalStack.push(pluginId);
        this.notifyStackChange();
    }

    public removeModal(pluginId?: string) {
        const targetId = pluginId ?? this.modalStack[this.modalStack.length - 1];
        if (!targetId) return;

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

    private createModal(pluginId: string) {
        const container = document.createElement("div");
        container.setAttribute('data-modal-id', pluginId);
        container.classList.add('frismify-modal-wrapper');

        const modalContainer = document.getElementById('modal-container') || this.createModalContainer();
        modalContainer.appendChild(container);

        console.log(`🔧 Mounting modal for ${pluginId}...`);
        const app = createApp(App)
            .provide('pluginId', pluginId)
            .use(router);
        app.mount(container);
        this.apps.set(pluginId, app);
    }

    private createModalContainer(): HTMLElement {
        const container = document.createElement("div");
        container.id = "modal-container";
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
