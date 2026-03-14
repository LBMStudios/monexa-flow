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

        const len = seed.length;
        for (let i = 0; i < len; i++) {
            const char = seed.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash | 0;
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
        const len = seed.length;
        for (let i = 0; i < len; i++) {
            hash = ((hash << 5) - hash) + seed.charCodeAt(i);
            hash = hash | 0;
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
    },

    /**
     * Motor de Inferencia Heurística (Ghost Action).
     * Analiza el historial para predecir qué etiqueta/nota pondría el usuario.
     */
    getPrediction(concepto, dbItems) {
        if (!concepto || !dbItems) return null;
        const c_target = concepto.toUpperCase().trim();
        const scores = {};

        // 1. Recolectar datos de transacciones procesadas manualmente
        for (const hash in dbItems) {
            const item = dbItems[hash];
            if (!item.tag || item.status === 'NONE') continue;

            const c_hist = (item.concepto || "").toUpperCase().trim();
            if (!c_hist) continue;

            // Simple match de "Comienza con" o "Contiene" para velocidad
            let matchScore = 0;
            if (c_hist === c_target) matchScore = 1.0;
            else if (c_target.includes(c_hist) || c_hist.includes(c_target)) matchScore = 0.8;
            
            if (matchScore > 0) {
                const key = `${item.tag}|${item.note || ""}`;
                scores[key] = (scores[key] || 0) + matchScore;
            }
        }

        // 2. Encontrar la combinación más frecuente
        let bestKey = null;
        let maxScore = 0;
        for (const key in scores) {
            if (scores[key] > maxScore) {
                maxScore = scores[key];
                bestKey = key;
            }
        }

        if (bestKey && maxScore >= 0.8) {
            const [tag, note] = bestKey.split('|');
            return { tag, note, confidence: maxScore };
        }

        return null;
    },

    /**
     * Detección Local de Anomalías (Tendencia Global: Seguridad Predictiva).
     * Analiza el historial para alertar si un nuevo movimiento supera
     * significativamente el promedio histórico para ese mismo concepto.
     *
     * @param {Object} transaction - La transacción actual (con concepto, importe, moneda).
     * @param {Object|Array} historyItems - Colección de transacciones históricas.
     * @param {number} thresholdMultiplier - Multiplicador sobre el promedio para considerar anomalía (ej: 2 = 200%).
     * @returns {Object|null} - Devuelve objeto con detalles de la anomalía o null si es normal.
     */
    detectAnomaly(transaction, historyItems, thresholdMultiplier = 2) {
        if (!transaction || !transaction.concepto || !transaction.importe || !historyItems) return null;

        const c_target = transaction.concepto.toUpperCase().trim();
        const t_amount = Math.abs(parseFloat(transaction.importe));
        const t_currency = transaction.moneda || 'UYU';

        if (isNaN(t_amount) || t_amount === 0) return null;

        let totalAmount = 0;
        let count = 0;

        // Iterar sobre el historial (soporta Array u Object)
        const items = Array.isArray(historyItems) ? historyItems : Object.values(historyItems);

        for (const item of items) {
            if (!item.concepto || !item.importe) continue;

            const c_hist = item.concepto.toUpperCase().trim();
            const i_currency = item.moneda || 'UYU';

            // Solo comparamos transacciones similares y en la misma moneda
            if (c_hist === c_target && i_currency === t_currency) {
                const amount = Math.abs(parseFloat(item.importe));
                if (!isNaN(amount) && amount > 0) {
                    totalAmount += amount;
                    count++;
                }
            }
        }

        // Necesitamos un mínimo de historial para establecer un patrón (ej. 3 transacciones)
        if (count >= 3) {
            const average = totalAmount / count;
            if (t_amount > average * thresholdMultiplier) {
                return {
                    isAnomaly: true,
                    average: average.toFixed(2),
                    currentAmount: t_amount.toFixed(2),
                    multiplier: (t_amount / average).toFixed(1) + 'x'
                };
            }
        }

        return null;
    }
};
