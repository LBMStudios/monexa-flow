/**
 * 01_db.js — MONEXA FLOW
 * Motor de almacenamiento atómico (DB_Engine).
 * Wrapper sobre chrome.storage.local con operaciones fetch / commit / purge.
 * Depende de: 00_config.js (KEYS), 02_logger.js (Logger)
 */

'use strict';

const DB_Engine = {
    _dbName: 'MonexaFlowDB',
    _storeName: 'DataStore',
    _db: null,

    /**
     * Inicializa la conexión a IndexedDB.
     */
    async _getDB() {
        if (this._db) return this._db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this._dbName, 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this._storeName)) {
                    db.createObjectStore(this._storeName);
                }
            };
            request.onsuccess = (e) => {
                this._db = e.target.result;
                resolve(this._db);
            };
            request.onerror = (e) => reject("Error opening IndexedDB");
        });
    },

    async fetch(key, fallback = null) {
        try {
            const db = await this._getDB();
            return new Promise((resolve) => {
                const transaction = db.transaction([this._storeName], 'readonly');
                const store = transaction.objectStore(this._storeName);
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result ?? fallback);
                request.onerror = () => resolve(fallback);
            });
        } catch (e) {
            console.warn("DB_Engine.fetch falló, usando chrome.storage como fallback", e);
            // Fallback para entornos donde IndexedDB falle (legacy)
            return new Promise(r => chrome.storage.local.get([key], res => r(res[key] ?? fallback)));
        }
    },

    async commit(key, data, doCloudSync = true) {
        try {
            const db = await this._getDB();
            const success = await new Promise((resolve) => {
                const transaction = db.transaction([this._storeName], 'readwrite');
                const store = transaction.objectStore(this._storeName);
                const request = store.put(data, key);
                request.onsuccess = () => resolve(true);
                request.onerror = () => resolve(false);
            });

            if (success) {
                // Sincronización Transparente con Firebase (SOLO METADATOS CRITICOS)
                if (doCloudSync && typeof CloudConnector !== 'undefined') {
                    if (key === KEYS.USERS) {
                        CloudConnector.pushRemoteUsers(data);
                    }
                }
                // Backup ligero en chrome.storage para redundancia
                chrome.storage.local.set({ [key]: data });
            }

            return success;
        } catch (e) {
            console.error("DB_Engine.commit error:", e);
            return false;
        }
    },

    async purge() {
        if (confirm("¿Desea eliminar TODAS las etiquetas, notas y reglas de auditoría? (Local-First)")) {
            try {
                const db = await this._getDB();
                const transaction = db.transaction([this._storeName], 'readwrite');
                const store = transaction.objectStore(this._storeName);
                store.delete(KEYS.TRANSACTIONS);
                store.delete(KEYS.RULES);
                
                await Logger.info("Local Audit Data Purged");
                window.location.reload();
            } catch (e) {
                console.warn("DB_Engine.purge error:", e);
            }
        }
    }
};
