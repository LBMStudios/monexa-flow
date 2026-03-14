/**
 * 01a_worker.js — MONEXA FLOW WORKER
 * Procesamiento Off-Main-Thread para matching de reglas y Predictive UX.
 */

/**
 * Normaliza texto para comparaciones robustas: elimina NBSP, colapsa espacios, trim y Uppercase.
 */
const normalizeText = (s) => (s || '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();

const parseAmount = (s) => {
    if (s === undefined || s === null || s === '') return NaN;
    // Limpieza específica para Itaú Uruguay:
    // 1. Quitar moneda y espacios, dejando solo dígitos, comas, puntos y signos
    let clean = s.toString().replace(/[^\d,.-]/g, '');

    // 2. Si hay comas y puntos (1.250,50), es formato ES/UY: limpiar puntos (miles) y cambiar coma por punto (decimal)
    if (clean.includes(',') && clean.includes('.')) {
        clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (clean.includes(',')) {
        clean = clean.replace(',', '.');
    } else if (clean.includes('.')) {
        const parts = clean.split('.');
        const lastPart = parts[parts.length - 1];
        if (lastPart.length === 3) {
            clean = clean.replace(/\./g, '');
        }
    }
    return parseFloat(clean);
};

self.onmessage = function(e) {
    const { action, data } = e.data;

    if (action === 'PROCESS_ROW') {
        const { concepto, extra, debito, credito, rules, dbItems } = data;
        
        // 1. Matching de Reglas (Lógica de 06_scanner.js movida aquí)
        const c_clean = normalizeText(concepto);
        const e_clean = normalizeText(extra);

        const sortedRules = [...rules].sort((a, b) => (b.importe ? 1 : 0) - (a.importe ? 1 : 0));

        const matchRule = sortedRules.find(r => {
            const r_clean = normalizeText(r.pattern);
            if (!r_clean) return false;
            const matchConcepto = c_clean.includes(r_clean);
            const matchExtra = e_clean.includes(r_clean);
            if (!matchConcepto && !matchExtra) return false;
            if (r.importe) {
                const rAmt = parseAmount(r.importe);
                const txAmt = parseAmount(debito) || parseAmount(credito);
                return rAmt === txAmt;
            }
            return true;
        });

        // 2. Predictive UX (Lógica de 04_data.js movida aquí)
        let prediction = null;
        if (!matchRule) {
            prediction = getPrediction(concepto, dbItems);
        }

        self.postMessage({
            action: 'ROW_PROCESSED',
            result: {
                matchRule: matchRule ? { label: matchRule.label, note: matchRule.note, color: matchRule.color } : null,
                prediction
            }
        });
    }
};

function getPrediction(concepto, dbItems) {
    if (!concepto || !dbItems) return null;
    const c_target = normalizeText(concepto);
    const scores = {};

    for (const hash in dbItems) {
        const item = dbItems[hash];
        if (!item.tag || item.status === 'NONE') continue;
        const c_hist = normalizeText(item.concepto);
        if (!c_hist) continue;

        let matchScore = 0;
        if (c_hist === c_target) matchScore = 1.0;
        else if (c_target.includes(c_hist) || c_hist.includes(c_target)) matchScore = 0.8;
        
        if (matchScore > 0) {
            const key = `${item.tag}|${item.note || ""}`;
            scores[key] = (scores[key] || 0) + matchScore;
        }
    }

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
}
