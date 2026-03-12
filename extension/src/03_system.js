/**
 * 03_system.js — MONEXA FLOW
 * Control de encendido / apagado del sistema (SystemControl).
 * Persiste el estado habilitado/deshabilitado en chrome.storage.local.
 * Depende de: 00_config.js (KEYS), 01_db.js (DB_Engine), 02_logger.js (Logger)
 */

'use strict';

const SystemControl = {
    async isEnabled() {
        const activated = await LicenseSystem.isActivated();
        if (!activated) return false;

        const state = await DB_Engine.fetch(KEYS.SYSTEM_STATE, { enabled: true });
        return state.enabled !== false;
    },

    async setEnabled(enabled) {
        await DB_Engine.commit(KEYS.SYSTEM_STATE, { enabled: !!enabled });
        await Logger.info(`Sistema ${enabled ? "activado" : "desactivado"}`);
    },

    async toggle() {
        const enabled = await this.isEnabled();
        const next = !enabled;
        await this.setEnabled(next);
        return next;
    }
};
