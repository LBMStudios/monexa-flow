/**
 * 09_cloud.js — MONEXA FLOW V2
 * Motor de sincronización remota para administración centralizada.
 * RESTRICCIÓN: Solo se sincroniza la lista de usuarios y sus estados de actividad.
 * Los datos de transacciones y reglas permanecen estrictamente LOCALES.
 */

'use strict';

const CloudConnector = {
    /**
     * Resuelve la URL remota base para Firebase.
     */
    async _getFirebaseUrl() {
        if (this._cachedUrl) return this._cachedUrl;
        const config = await DB_Engine.fetch(KEYS.SETTINGS, {});
        let masterUrl = config.remote_admin_url || "https://monexa-b1a87-default-rtdb.firebaseio.com/";
        if (!masterUrl.includes('firebaseio.com')) return null;
        
        if (!masterUrl.endsWith('/')) masterUrl += '/';
        this._cachedUrl = `${masterUrl}users.json`;
        return this._cachedUrl;
    },

    /**
     * Empuja la lista de usuarios a la nube (para actualizar loginCount, lastActive, etc.)
     * [DISABLED] Sincronización a la nube deshabilitada, retorna éxito inmediatamente.
     */
    async pushRemoteUsers(usersArray) {
        return true;
    },

    /**
     * Sincronización Remota de Usuarios (Pull)
     * Descarga la lista maestra para validar permisos y actividad.
     * [DISABLED] Sincronización a la nube deshabilitada.
     */
    async syncRemoteUsers() {
        return true;
    },

    /**
     * Sincronización de Versión Maestra (Pull)
     * [DISABLED] Sincronización a la nube deshabilitada.
     */
    async syncRemoteVersion() {
        return null;
    },

    /**
     * Publicación de Versión Maestra (Push — Solo Admin)
     * [DISABLED] Sincronización a la nube deshabilitada.
     */
    async publishRemoteVersion(version, changelog = "") {
        return false;
    }
};
