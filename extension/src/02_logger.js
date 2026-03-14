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
            let logs = await DB_Engine.fetch(KEYS.LOGS, []);
            if (!Array.isArray(logs)) logs = [];
            const entry = {
                timestamp: new Date().toISOString(),
                level: level,
                action: action,
                msg: String(message),
                version: VERSION
            };
            logs.push(entry);
            if (logs.length > this.MAX_ENTRIES) logs.shift();
            await DB_Engine.commit(KEYS.LOGS, logs);
        } catch (err) {
            console.error("Logger failure:", err);
        }
    },

    info(m, action = "")  { return this.write(m, "INFO", action); },
    warn(m, action = "")  { return this.write(m, "WARN", action); },
    error(m, action = "") { return this.write(m, "ERROR", action); }
};
