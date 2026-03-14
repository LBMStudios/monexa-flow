/**
 * 01_db.js — MONEXA FLOW
 * Motor de almacenamiento atómico (DB_Engine).
 * Usa chrome.storage.local (compartido entre TODOS los contextos de la extensión).
 * Incluye migración automática desde IndexedDB para preservar datos existentes.
 * Depende de: 00_config.js (KEYS)
 */

'use strict';

const DB_Engine = {

    _migrated: false,

    /**
     * Migración ONE-TIME: copia todos los datos de IndexedDB → chrome.storage.local.
     * Solo se ejecuta una vez y luego marca la migración como completada.
     */
    async _migrateFromIndexedDB() {
        if (this._migrated) return;
        this._migrated = true;

        try {
            // Verificar si ya se migró
            const check = await new Promise(resolve => {
                chrome.storage.local.get(['_mx_idb_migrated'], r => {
                    resolve(r._mx_idb_migrated === true);
                });
            });

            if (check) return; // Ya migrado

            // Intentar abrir IndexedDB
            const db = await new Promise((resolve, reject) => {
                const request = indexedDB.open('MonexaFlowDB', 1);
                request.onupgradeneeded = (e) => {
                    // Si upgradeneeded se dispara, la DB no existía → no hay datos
                    e.target.transaction.abort();
                    reject('NO_DATA');
                };
                request.onsuccess = (e) => resolve(e.target.result);
                request.onerror = () => reject('IDB_ERROR');
            });

            // Leer todos los datos del ObjectStore
            const allData = await new Promise((resolve, reject) => {
                try {
                    const tx = db.transaction(['DataStore'], 'readonly');
                    const store = tx.objectStore('DataStore');
                    const allKeys = store.getAllKeys();
                    const allValues = store.getAll();

                    tx.oncomplete = () => {
                        const keys = allKeys.result;
                        const values = allValues.result;
                        const data = {};
                        keys.forEach((k, i) => { data[k] = values[i]; });
                        resolve(data);
                    };
                    tx.onerror = () => reject('TX_ERROR');
                } catch (e) {
                    reject('STORE_NOT_FOUND');
                }
            });

            // Escribir todo en chrome.storage.local
            const keyCount = Object.keys(allData).length;
            if (keyCount > 0) {
                allData['_mx_idb_migrated'] = true;
                await new Promise(resolve => {
                    chrome.storage.local.set(allData, () => resolve());
                });
                console.log(`[Monexa] Migración IndexedDB → chrome.storage.local completada: ${keyCount} llaves migradas.`);
            } else {
                // Marcar como migrado aunque no haya datos
                await new Promise(resolve => {
                    chrome.storage.local.set({ '_mx_idb_migrated': true }, () => resolve());
                });
            }

            db.close();
        } catch (e) {
            if (e !== 'NO_DATA' && e !== 'STORE_NOT_FOUND') {
                console.warn("[Monexa] Migración IndexedDB no necesaria o falló:", e);
            }
            // Marcar como migrado para no reintentar
            try {
                await new Promise(resolve => {
                    chrome.storage.local.set({ '_mx_idb_migrated': true }, () => resolve());
                });
            } catch (_) {}
        }
    },

    /**
     * Lee un valor de la base de datos local compartida.
     */
    async fetch(key, fallback = null) {
        try {
            await this._migrateFromIndexedDB();
            
            return new Promise((resolve) => {
                chrome.storage.local.get([key], (result) => {
                    if (chrome.runtime.lastError) {
                        console.error("DB_Engine.fetch error:", chrome.runtime.lastError);
                        resolve(fallback);
                        return;
                    }
                    const val = result[key];
                    resolve(val !== undefined && val !== null ? val : fallback);
                });
            });
        } catch (e) {
            console.error("DB_Engine.fetch falló para la llave:", key, e);
            return fallback;
        }
    },

    /**
     * Escribe un valor en la base de datos local compartida.
     */
    async commit(key, data) {
        try {
            return new Promise((resolve) => {
                chrome.storage.local.set({ [key]: data }, () => {
                    if (chrome.runtime.lastError) {
                        console.error("DB_Engine.commit error:", chrome.runtime.lastError);
                        resolve(false);
                        return;
                    }
                    resolve(true);
                });
            });
        } catch (e) {
            console.error("DB_Engine.commit error:", e);
            return false;
        }
    },

    async purge() {
        if (confirm("¿Desea eliminar TODAS las etiquetas, notas y reglas de auditoría? (Local-First)")) {
            try {
                await new Promise((resolve) => {
                    chrome.storage.local.remove([KEYS.TRANSACTIONS, KEYS.RULES], () => {
                        resolve(true);
                    });
                });
                
                if (typeof Logger !== 'undefined') await Logger.info("Local Audit Data Purged");
                window.location.reload();
            } catch (e) {
                console.warn("DB_Engine.purge error:", e);
            }
        }
    },

    async clearEverything() {
        try {
            return new Promise((resolve) => {
                chrome.storage.local.clear(() => {
                    if (chrome.runtime.lastError) {
                        resolve(false);
                        return;
                    }
                    resolve(true);
                });
            });
        } catch (e) {
            console.error("DB_Engine.clearEverything error:", e);
            return false;
        }
    }
};
