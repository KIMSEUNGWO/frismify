import {ContentScriptContext} from "wxt/utils/content-script-context";
import type { Plugin } from '@/plugins/types';

export default class ActivePlugins {

    private _ctx: ContentScriptContext;
    private _map: Map<string, Plugin> = new Map();

    constructor(ctx: ContentScriptContext) {
        this._ctx = ctx;
    }

    has(plugin: Plugin): boolean {
        return this._map.has(plugin.meta.id);
    }

    _set(plugin: Plugin) {
        this._map.set(plugin.meta.id, plugin);
    }

    set ctx(value: ContentScriptContext) {
        this._ctx = value;
    }



    async activate(plugin: Plugin) {
        if (this.has(plugin)) {
            console.log(`⚠️ Plugin ${plugin.meta.name} already active`);
            return;
        }
        try {
            await plugin.execute(this.ctx);
            this._set(plugin);
            console.log(`✅ Plugin activated: ${plugin.meta.name}`);
        } catch (error) {
            console.error(`❌ Failed to activate ${plugin.meta.name}:`, error);
        }
    }

    async deactivatePlugin(plugin: Plugin) {
        if (!this.has(plugin)) {
            console.log(`⚠️ Plugin ${plugin.meta.id} not active`);
            return;
        }

        try {
            await plugin.cleanup?.();
            this._map.delete(plugin.meta.id);
            console.log(`❌ Plugin deactivated: ${plugin.meta.name}`);
        } catch (error) {
            console.error(`❌ Failed to deactivate ${plugin.meta.name}:`, error);
        }
    }

    async onInvalidated() {
        this._map.values().forEach((plugin) => {
            this.deactivatePlugin(plugin)
        });
    }
}

