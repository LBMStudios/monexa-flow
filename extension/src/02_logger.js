/**
 * 02_logger.js — MONEXA FLOW
 * Módulo de logging e historial de eventos del sistema.
 * Escribe entradas en chrome.storage.local con un máximo de 1000 registros.
 * Depende de: 00_config.js (KEYS, VERSION), 01_db.js (DB_Engine)
 */

'use strict';

const Logger = {
    MAX_ENTRIES: 1000,

    async write(message, level = "INFO", action = "") {
        try {
            const logs = await DB_Engine.fetch(KEYS.LOGS, []);
            const entry = {
                timestamp: new Date().toISOString(),
                level: level,
                action: action,
                msg: String(message),
                version: typeof VERSION !== 'undefined' ? VERSION : "unknown"
            };

            logs.unshift(entry);
            if (logs.length > this.MAX_ENTRIES) logs.length = this.MAX_ENTRIES;
            await DB_Engine.commit(KEYS.LOGS, logs, false);
        } catch(e) { /* Failsafe, no loop de logs */ }
    },

    info(m, action = "")  { return this.write(m, "INFO", action); },
    warn(m, action = "")  { return this.write(m, "WARN", action); },
    error(m, action = "") { return this.write(m, "ERROR", action); }
};
