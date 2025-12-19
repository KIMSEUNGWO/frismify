import {isPersistentPlugin, type Plugin} from "@/types";
import {pluginManagerProxy} from "@/core/proxy/PluginManagerProxy";
import type {ContentScriptContext} from "wxt/utils/content-script-context";
import { PluginRegistry } from "./PluginRegistry";


interface EventTarget {
    target: Element;
    event: ElementEventMap;
    handler: any;
    options? : boolean | AddEventListenerOptions
}
export class EventManager {

    private listeners: EventTarget[] = [];

    add<K extends keyof ElementEventMap>(target:Element, event:K, handler:(this: Element, ev: ElementEventMap[K]) => any, options?: boolean | AddEventListenerOptions) {
        const eventTarget: EventTarget = {target, event, handler, options};
        this._add(eventTarget);
        this.listeners.push(eventTarget);
    }

    removeAll() {
        this.listeners.forEach(listener => this._remove(listener));
        this.listeners = [];
    }

    removeByTargetAndEvent<K extends keyof ElementEventMap>(target: Element, event:K) {
        this.listeners = this.listeners.filter(listener => {
            if (listener.target === target && listener.event === event) {
                this._remove(listener);
                return false;
            }
            return true;
        });
    }

    removeByTarget(target: Element) {
        this.listeners = this.listeners.filter(listener => {
            if (listener.target === target) {
                this._remove(listener);
                return false;
            }
            return true;
        })
    }

    private _add(eventTarget: EventTarget) {
        eventTarget.target.addEventListener(eventTarget.event, eventTarget.handler, eventTarget.options);
    }
    private _remove(eventTarget: EventTarget) {
        eventTarget.target.removeEventListener(eventTarget.event, eventTarget.handler, eventTarget.options);
    }
}



export class ActiveManager {

    private activatedPluginIds: Set<string> = new Set();
    private pluginRegistry: PluginRegistry;

    constructor() {
        this.pluginRegistry = PluginRegistry.getInstance();
    }

    async initialize(ctx: ContentScriptContext) {
        const persistentPlugins = this.pluginRegistry.getByType(isPersistentPlugin);

        for (const plugin of persistentPlugins) {
            try {
                const state = await pluginManagerProxy.getPluginState(plugin.id);
                if (state?.enabled) {
                    await plugin.onActivate(ctx);
                    this.activatedPluginIds.add(plugin.id);
                    console.log(`✅ Plugin activated: ${plugin.name}`);
                }
            } catch (error) {
                console.error(`❌ Failed to activate plugin ${plugin.id}:`, error);
            }
        }
    }

    async invalidated() {
        for (const pluginId of this.activatedPluginIds) {
            const plugin = this.pluginRegistry.get(pluginId);
            if (plugin && isPersistentPlugin(plugin)) {
                try {
                    await plugin.onCleanup();
                    console.log(`🧹 Plugin cleaned up: ${plugin.name}`);
                } catch (error) {
                    console.error(`❌ Failed to cleanup plugin ${pluginId}:`, error);
                }
            }
        }
        this.activatedPluginIds.clear();
    }
}