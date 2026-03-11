/**
 * 09_cloud.js — MONEXA FLOW V2
 * Motor de sincronización remota para administración centralizada.
 * RESTRICCIÓN: Solo se sincroniza la lista de usuarios y sus estados de actividad.
 * Los datos de transacciones y reglas permanecen estrictamente LOCALES.
 */

'use strict';

const CloudConnector = {
    /**
     * Resuelve la URL remota base para Firebase (Solo para la rama de usuarios).
     */
    async _getFirebaseUrl() {
        const config = await DB_Engine.fetch(KEYS.SETTINGS, {});
        let masterUrl = config.remote_admin_url;
        if (!masterUrl || !masterUrl.includes('firebaseio.com')) return null;
        
        if (!masterUrl.endsWith('/')) masterUrl += '/';
        return `${masterUrl}users.json`;
    },

    /**
     * Empuja la lista de usuarios a la nube (para actualizar loginCount, lastActive, etc.)
     */
    async pushRemoteUsers(usersArray) {
        try {
            const url = await this._getFirebaseUrl();
            if (!url) return false;

            await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(usersArray)
            });
            return true;
        } catch (e) {
            console.warn(`CloudConnector.pushRemoteUsers:`, e.message);
            return false;
        }
    },

    /**
     * Sincronización Remota de Usuarios (Pull)
     * Descarga la lista maestra para validar permisos y actividad.
     */
    async syncRemoteUsers() {
        try {
            const config = await DB_Engine.fetch(KEYS.SETTINGS, {});
            const masterUrl = config.remote_admin_url;

            if (!masterUrl || masterUrl.trim() === "") return false;

            let fetchUrl = masterUrl;

            // 1. Limpieza anti-copiado
            if (fetchUrl.includes('<script') && fetchUrl.includes('src=')) {
                const match = fetchUrl.match(/src=["'](.*?)["']/);
                if (match) fetchUrl = match[1];
            }

            // 2. GitHub Gist (Legacy support for users list)
            if (fetchUrl.includes('gist.github.com')) {
                fetchUrl = fetchUrl.replace('gist.github.com', 'gist.githubusercontent.com');
                fetchUrl = fetchUrl.replace(/\.js\s*$/, '');
                if (!fetchUrl.includes('/raw')) fetchUrl += '/raw/usuarios.json';
            }

            // 3. Firebase (Path estándar de usuarios)
            if (fetchUrl.includes('firebaseio.com')) {
                if (!fetchUrl.endsWith('/')) fetchUrl += '/';
                fetchUrl += 'users.json';
            }

            fetchUrl += (fetchUrl.includes('?') ? '&' : '?') + 't=' + Date.now();

            const response = await fetch(fetchUrl, { cache: 'no-store' });
            if (!response.ok) throw new Error("Servidor no responde");

            const remoteUsers = await response.json();

            // Auto-inicialización si Firebase está vacío
            if (remoteUsers === null && masterUrl.includes('firebaseio.com')) {
                const localUsers = await DB_Engine.fetch(KEYS.USERS, []);
                if (localUsers.length > 0) {
                    await this.pushRemoteUsers(localUsers);
                    return true;
                }
            }

            let finalUsers = [];
            if (typeof remoteUsers === 'object' && remoteUsers !== null) {
                finalUsers = Array.isArray(remoteUsers) ? remoteUsers.filter(u => u !== null) : Object.values(remoteUsers);
            }

            if (finalUsers.length > 0) {
                // Actualizar DB local con los permisos del servidor (sin re-subir)
                await DB_Engine.commit(KEYS.USERS, finalUsers, false);
                return true;
            }
        } catch (e) {
            console.warn("CloudConnector: Error sync users.", e.message);
        }
        return false;
    }
};
