import {createApp} from "vue";
import App from "@/entrypoints/content/App.vue";
import router from "@/entrypoints/content/router";


export class ModalManager {

    private static instance: ModalManager;
    private openModalId: string | null = null;
    private app: ReturnType<typeof createApp> | null = null;

    private constructor() {
    }

    public static getInstance(): ModalManager {
        if (!ModalManager.instance) {
            ModalManager.instance = new ModalManager();
        }
        return ModalManager.instance;
    }

    public isOpen(pluginId: string): boolean {
        return this.openModalId === pluginId;
    }

    public isAnyOpen(): boolean {
        return this.app !== null;
    }

    public openModal(pluginId: string) {
        if (this.openModalId === pluginId) {
            this.removeModal();
            return;
        }
        if (this.app) {
            this.removeModal();
        }
        this.createModal(pluginId);
        this.openModalId = pluginId;
    }

    public removeModal() {
        if (this.app) {
            this.app.unmount();
            this.app = null;
        }
        const container = document.querySelector('#modal-container');
        container?.remove();
        this.openModalId = null;
    }

    private createModal(pluginId: string) {
        const container = document.createElement("div");
        container.id = "modal-container";
        document.body.appendChild(container);

        // // Shadow DOM 생성 (closed mode로 외부 접근 차단)
        // const shadowRoot = container.attachShadow({ mode: 'open' });
        //
        // // Shadow DOM 내부에 마운트용 div 생성
        // const mountPoint = document.createElement("div");
        // shadowRoot.appendChild(mountPoint);

        console.log("🔧 Mounting modal...");
        this.app = createApp(App)
            .provide('pluginId', pluginId)
            .use(router);
        this.app.mount(container);
    }


}

export const modalManager = ModalManager.getInstance();
