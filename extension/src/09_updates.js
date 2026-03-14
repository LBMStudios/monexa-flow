/**
 * 09_updates.js — MONEXA FLOW
 * Sistema automático de detección de actualizaciones.
 * Comprueba cada 12 horas si hay una nueva versión disponible en el repositorio.
 */

'use strict';

const UpdateSystem = {
    // URL removida — Modo Soberano: sin conexiones externas

    /**
     * Verifica si hay una nueva versión y actualiza el estado local.
     */
    async check() {
        // v1.3.9 — Sistema de actualizaciones online DESACTIVADO
        // Las actualizaciones en Modo Soberano se realizan cargando manualmente el nuevo .zip
        console.log("[Monexa Update] Modo Offline: Búsqueda de actualizaciones desactivada.");
        return null;
    },

    /**
     * Devuelve el estado actual de la actualización (cacheado).
     */
    async getStatus() {
        return await DB_Engine.fetch(KEYS.UPDATE_STATUS, { newVersion: null });
    }
};
