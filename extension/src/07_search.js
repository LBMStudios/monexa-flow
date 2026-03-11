/**
 * 07_search.js — MONEXA FLOW
 * Motor de búsqueda y filtrado (SearchMaster).
 * Busca en todas las transacciones auditadas por concepto, nota o tag.
 * Depende de: 00_config.js (KEYS), 01_db.js (DB_Engine)
 */

'use strict';

const SearchMaster = {
    /**
     * Realiza una búsqueda de texto libre sobre las transacciones almacenadas.
     * @param {string} term - Texto de búsqueda.
     * @returns {Array} - Registros que coinciden con el término.
     */
    async query(term) {
        const db = await DB_Engine.fetch(KEYS.TRANSACTIONS, { items: {} });
        const q = (term || "").toLowerCase();

        if (!q) return [];

        return Object.values(db.items || {}).filter(i =>
            (i.concepto || "").toLowerCase().includes(q) ||
            (i.extra || "").toLowerCase().includes(q) ||
            (i.note || "").toLowerCase().includes(q) ||
            (i.tag || "").toLowerCase().includes(q)
        );
    }
};
