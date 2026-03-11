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
     * EVOLUCIÓN CONTABLE: Incluye moneda y cuenta para evitar duplicados en sistemas multi-empresa.
     */
    createFingerprint(concepto, importe, fecha, saldo = "", moneda = "UYU", cuenta = "GLOBAL") {
        const safeFecha    = (fecha    ?? "").toString().trim();
        const safeConcepto = (concepto ?? "").toString().trim().toUpperCase();
        const safeImporte  = (importe  ?? "").toString().trim();
        const safeSaldo    = (saldo    ?? "").toString().trim();
        const safeMoneda   = (moneda   ?? "UYU").toString().trim().toUpperCase();
        const safeCuenta   = (cuenta   ?? "DEFAULT").toString().trim().toUpperCase();

        // La firma ahora es única por sesión y contexto bancario
        const seed = `${safeCuenta}|${safeMoneda}|${safeFecha}|${safeConcepto}|${safeImporte}|${safeSaldo}`;
        let hash = 0;

        for (let i = 0; i < seed.length; i++) {
            const char = seed.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }

        return `it_acc_${Math.abs(hash)}`;
    },

    /**
     * Normaliza la moneda basándose en los símbolos típicos de Itaú.
     */
    normalizeCurrency(text = "") {
        const t = text.toUpperCase();
        if (t.includes('U$S') || t.includes('USD') || t.includes('DOLARES')) return 'USD';
        if (t.includes('$') || t.includes('UYU') || t.includes('PESOS')) return 'UYU';
        return 'UYU'; 
    },

    /**
     * Limpia importes bancarios (Itaú) para dejarlos como números operables.
     * Convierte "1.250,00" -> 1250.00
     */
    normalizeAmount(val = "") {
        if (!val) return 0;
        // Eliminar todo lo que no sea número, coma o punto
        const clean = val.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
    },

    /**
     * Determina el sentido contable del movimiento.
     */
    detectDirection(debito = "", credito = "") {
        if (debito && debito.trim() !== "") return 'OUT';
        if (credito && credito.trim() !== "") return 'IN';
        return 'UNKNOWN';
    },

    /**
     * Firma Digital de Auditoría (Audit Proof).
     * Genera un hash inmutable para un bloque de datos.
     */
    generateAuditSignature(data) {
        const seed = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) - hash) + seed.charCodeAt(i);
            hash |= 0;
        }
        const hex = Math.abs(hash).toString(16).toUpperCase();
        return `SIG-IT-${hex}-${new Date().getTime().toString(36).toUpperCase()}`;
    },

    /**
     * Verifica que un objeto de transacción tenga todos los campos requeridos.
     */
    validateSchema(item) {
        const required = ['fecha', 'concepto', 'status'];
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
