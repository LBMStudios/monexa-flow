/**
 * 01_db.js — MONEXA FLOW
 * Motor de almacenamiento atómico (DB_Engine).
 * Wrapper sobre chrome.storage.local con operaciones fetch / commit / purge.
 * Depende de: 00_config.js (KEYS), 02_logger.js (Logger)
 */

'use strict';

const DB_Engine = {
    _getStorageArea(key) {
        // En V1, movemos todo a local para máxima privacidad y evitar latencias de red
        // que causaban bucles en el inicio de sesión.
        return chrome.storage.local;
    },

    async fetch(key, fallback = null) {
        return new Promise((resolve) => {
            try {
                if (!chrome.runtime?.id) { resolve(fallback); return; }
                const storage = this._getStorageArea(key);
                storage.get([key], (res) => {
                    if (chrome.runtime.lastError) {
                        console.warn(`Error Fetching ${key}:`, chrome.runtime.lastError.message);
                        resolve(fallback);
                        return;
                    }
                    resolve(res[key] ?? fallback);
                });
            } catch (e) {
                console.warn("DB_Engine.fetch — contexto invalido:", e.message);
                resolve(fallback);
            }
        });
    },

    async commit(key, data, doCloudSync = true) {
        return new Promise((resolve) => {
            try {
                if (!chrome.runtime?.id) { resolve(false); return; }
                const storage = this._getStorageArea(key);
                storage.set({ [key]: data }, () => {
                    if (chrome.runtime.lastError) {
                        console.warn(`Error Committing ${key}:`, chrome.runtime.lastError.message);
                        resolve(false);
                        return;
                    }
                    
                    // Sincronización Transparente con Firebase (SOLO USUARIOS)
                    if (doCloudSync && typeof CloudConnector !== 'undefined') {
                        if (key === KEYS.USERS) {
                            CloudConnector.pushRemoteUsers(data);
                        }
                    }

                    resolve(true);
                });
            } catch (e) {
                console.warn("DB_Engine.commit — contexto invalido:", e.message);
                resolve(false);
            }
        });
    },

    async purge() {
        if (confirm("¿Desea eliminar TODAS las etiquetas, notas y reglas de auditoría? Esta acción no afectará a los usuarios registrados ni la configuración del sistema.")) {
            try {
                if (!chrome.runtime?.id) { alert("Extensión no disponible. Recargue la página."); return; }

                // Borrar transacciones (local)
                await this.commit(KEYS.TRANSACTIONS, { items: {} });

                // Borrar reglas (sync)
                await this.commit(KEYS.RULES, []);

                await Logger.info("Audit Data Purged by Admin");
                window.location.reload();
            } catch (e) {
                console.warn("DB_Engine.purge — error:", e.message);
            }
        }
    }
};
