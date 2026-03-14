/**
 * 09_updates.js — MONEXA FLOW
 * Sistema automático de detección de actualizaciones.
 * Comprueba cada 12 horas si hay una nueva versión disponible en el repositorio.
 */

'use strict';

const UpdateSystem = {
    UPDATE_URL: "https://raw.githubusercontent.com/lbmstudios/monexa-flow/main/landing/version.json",

    /**
     * Verifica si hay una nueva versión y actualiza el estado local.
     */
    async check() {
        try {
            const status = await DB_Engine.fetch(KEYS.UPDATE_STATUS, { lastCheck: 0, newVersion: null });
            const now = Date.now();
            
            // Throttling: Solo comprobar cada 12 horas si no hay nada pendiente
            if (now - status.lastCheck < 12 * 60 * 60 * 1000 && !status.newVersion) {
                return status;
            }

            let latestVersion = null;
            let changelog = "";
            let zipUrl = "";

            // PRIORIDAD 1: Nube propia (Firebase)
            if (typeof CloudConnector !== 'undefined') {
                const cloudVer = await CloudConnector.syncRemoteVersion();
                if (cloudVer) {
                    latestVersion = cloudVer.version;
                    changelog = cloudVer.changelog;
                    zipUrl = cloudVer.url;
                }
            }

            // PRIORIDAD 2: Recurso estático (GitHub) como fallback
            // [DISABLED] Fetch externo desactivado para entorno local estricto.
            /*
            if (!latestVersion) {
                const response = await fetch(this.UPDATE_URL + "?t=" + now);
                if (response.ok) {
                    const data = await response.json();
                    latestVersion = data.version;
                    changelog = data.changelog || "";
                    zipUrl = data.url || "";
                }
            }
            */

            if (latestVersion && latestVersion !== VERSION) {
                status.newVersion = latestVersion;
                status.changelog = changelog;
                status.url = zipUrl;
            } else {
                status.newVersion = null;
            }

            status.lastCheck = now;
            await DB_Engine.commit(KEYS.UPDATE_STATUS, status);
            return status;
        } catch (e) {
            console.warn("[Monexa Update] Error check:", e.message);
            return null;
        }
    },

    /**
     * Devuelve el estado actual de la actualización (cacheado).
     */
    async getStatus() {
        return await DB_Engine.fetch(KEYS.UPDATE_STATUS, { newVersion: null });
    }
};
