/**
 * 09_cloud.js — MONEXA FLOW (Offline Edition)
 * Motor de sincronización desactivado para garantizar soberanía de datos.
 */

'use strict';

const CloudConnector = {
    async _getFirebaseUrl() { return null; },
    async pushRemoteUsers(usersArray) { 
        console.log("[Monexa Cloud] Sincronización desactivada (Modo Soberano).");
        return true; 
    },
    async syncRemoteUsers() { 
        console.log("[Monexa Cloud] Sincronización desactivada.");
        return true; 
    },
    async syncRemoteVersion() { return null; },
    async publishRemoteVersion(version, changelog = "") { return false; }
};
