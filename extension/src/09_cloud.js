/**
 * 09_cloud_connector.js — MONEXA FLOW V2
 * Motor de sincronización remota para administración centralizada.
 * Permite al administrador bloquear/habilitar usuarios desde una URL externa.
 */

'use strict';

const CloudConnector = {
    /**
     * Sincroniza la lista de usuarios local con un servidor remoto.
     * En V2 el Admin configura una URL maestra.
     */
    async syncRemoteUsers() {
        try {
            const config = await DB_Engine.fetch(KEYS.SETTINGS, {});
            const masterUrl = config.remote_admin_url;

            if (!masterUrl || masterUrl.trim() === "") return false;

            let fetchUrl = masterUrl;

            // 1. Limpieza anti-copiado: Si el usuario pegó el código "Embed" (<script src="...">)
            if (fetchUrl.includes('<script') && fetchUrl.includes('src=')) {
                const match = fetchUrl.match(/src=["'](.*?)["']/);
                if (match) fetchUrl = match[1];
            }

            // 2. Convertir URL normal de Gist a URL Raw Content
            if (fetchUrl.includes('gist.github.com')) {
                fetchUrl = fetchUrl.replace('gist.github.com', 'gist.githubusercontent.com');
                fetchUrl = fetchUrl.replace(/\.js\s*$/, ''); // Quitar .js del final si vino del embed
                if (!fetchUrl.includes('/raw')) {
                    fetchUrl += '/raw/usuarios.json';
                }
            }

            // 3. V2 Cloud: Auto-fix para URLs Raw de GitHub Gist (quitar el hash para tener el "latest commit")
            if (fetchUrl.includes('gist.githubusercontent.com') && fetchUrl.includes('/raw/')) {
                const parts = fetchUrl.split('/');
                const rawIndex = parts.indexOf('raw');
                if (rawIndex !== -1 && parts.length > rawIndex + 2) {
                    parts.splice(rawIndex + 1, 1);
                    fetchUrl = parts.join('/');
                }
            }

            // 4. Integración Firebase Realtime Database
            if (fetchUrl.includes('firebaseio.com')) {
                if (!fetchUrl.endsWith('/')) fetchUrl += '/';
                fetchUrl += 'users.json';
            }

            // Anti-Caché agresivo para asegurar que tenemos los permisos de este segundo
            fetchUrl += (fetchUrl.includes('?') ? '&' : '?') + 't=' + Date.now();

            // Intentar descargar la lista maestra de usuarios
            const response = await fetch(fetchUrl, { cache: 'no-store' });
            if (!response.ok) throw new Error("Servidor no responde");

            const remoteUsers = await response.json();

            // En Firebase, si la base de datos está recién creada, responde con `null`
            if (remoteUsers === null && masterUrl.includes('firebaseio.com')) {
                const localUsers = await DB_Engine.fetch(KEYS.USERS, []);
                if (localUsers.length > 0) {
                    // Cargar nuestros administradores locales a la nube vacía para que nazca
                    await fetch(fetchUrl.split('?')[0], {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(localUsers)
                    });
                    console.log("Firebase inicializado con usuarios locales.");
                    return true;
                }
            }

            // Firebase podría devolver un objeto si los arrays se corrompen; lo convertimos a lista
            let finalUsers = [];
            if (typeof remoteUsers === 'object' && remoteUsers !== null) {
                finalUsers = Array.isArray(remoteUsers) ? remoteUsers.filter(u => u !== null) : Object.values(remoteUsers);
            }

            if (finalUsers.length > 0) {
                // Actualizar DB local con los permisos del servidor
                await DB_Engine.commit(KEYS.USERS, finalUsers);
                await Logger.info("V2: Usuarios sincronizados remotamente con éxito.");
                return true;
            }
        } catch (e) {
            console.warn("CloudConnector: Error en sincronización remota.", e.message);
        }
        return false;
    }
};
