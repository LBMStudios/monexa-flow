/**
 * 04_data.js — MONEXA FLOW
 * Motor de integridad y transformación de datos (DataCore).
 * Genera fingerprints únicos por transacción, valida esquemas y sanitiza texto.
 * Sin dependencias externas.
 */

'use strict';

const DataCore = {
    /**
     * Crea un hash único (fingerprint) para identificar una transacción.
     * Basado en la combinación fecha + concepto + importe.
     */
    createFingerprint(concepto, importe, fecha) {
        const safeFecha    = (fecha    ?? "").toString().trim();
        const safeConcepto = (concepto ?? "").toString().trim().toUpperCase();
        const safeImporte  = (importe  ?? "").toString().trim();

        const seed = `${safeFecha}|${safeConcepto}|${safeImporte}`;
        let hash = 0;

        for (let i = 0; i < seed.length; i++) {
            const char = seed.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }

        return `mx_sig_${Math.abs(hash)}`;
    },

    /**
     * Verifica que un objeto de transacción tenga todos los campos requeridos.
     */
    validateSchema(item) {
        const required = ['fecha', 'concepto', 'importe', 'status'];
        return required.every(field => Object.prototype.hasOwnProperty.call(item, field));
    },

    /**
     * Escapa caracteres HTML para evitar XSS al inyectar texto en innerHTML.
     */
    sanitizeText(text) {
        const div = document.createElement('div');
        div.textContent = text ?? "";
        return div.innerHTML.replace(/"/g, '&quot;');
    }
};
