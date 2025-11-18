

export class ModalManager {

    private static instance: ModalManager;

    private constructor() {
    }

    public static getInstance(): ModalManager {
        if (!ModalManager.instance) {
            ModalManager.instance = new ModalManager();
        }
        return ModalManager.instance;
    }


}

export const modalManager = ModalManager.getInstance();
