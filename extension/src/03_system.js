/**
 * 03_system.js — MONEXA FLOW
 * Control de encendido / apagado del sistema (SystemControl).
 * Persiste el estado habilitado/deshabilitado en chrome.storage.local.
 * Depende de: 00_config.js (KEYS), 01_db.js (DB_Engine), 02_logger.js (Logger)
 */

'use strict';

const SystemControl = {
    // Estado maestro (Escaneo + Lógica Core)
    async isEnabled() {
        const userEnabled = await this.isUserEnabled();
        const activated = await LicenseSystem.isActivated();
        return userEnabled && activated;
    },

    // Solo el switch manual del usuario (para mostrar el launcher)
    async isUserEnabled() {
        const state = await DB_Engine.fetch(KEYS.SYSTEM_STATE, { enabled: true });
        return state.enabled !== false;
    },

    async setEnabled(enabled) {
        await DB_Engine.commit(KEYS.SYSTEM_STATE, { enabled: !!enabled });
        await Logger.info(`Sistema manual ${enabled ? "activado" : "desactivado"}`);
    },

    async toggle() {
        const enabled = await this.isUserEnabled();
        const next = !enabled;
        await this.setEnabled(next);
        return next;
    }
};
