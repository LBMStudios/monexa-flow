/**
 * 01a_worker.js — MONEXA FLOW WORKER
 * Procesamiento Off-Main-Thread para matching de reglas y Predictive UX.
 */

self.onmessage = function(e) {
    const { action, data } = e.data;

    if (action === 'PROCESS_ROW') {
        const { concepto, extra, debito, credito, rules, dbItems } = data;
        
        // 1. Matching de Reglas (Lógica de 06_scanner.js movida aquí)
        const c_clean = concepto.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
        const e_clean = extra.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
        const normalizeAmt = (s) => (s || '').replace(/[.\s]/g, '').replace(/,/g, '').trim();
        const sortedRules = [...rules].sort((a, b) => (b.importe ? 1 : 0) - (a.importe ? 1 : 0));

        const matchRule = sortedRules.find(r => {
            const r_clean = (r.pattern || "").replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
            if (!r_clean) return false;
            const matchConcepto = c_clean.includes(r_clean);
            const matchExtra = e_clean.includes(r_clean);
            if (!matchConcepto && !matchExtra) return false;
            if (r.importe) {
                const rAmt = normalizeAmt(r.importe);
                const txAmt = normalizeAmt(debito) || normalizeAmt(credito);
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
    const c_target = concepto.toUpperCase().trim();
    const scores = {};

    for (const hash in dbItems) {
        const item = dbItems[hash];
        if (!item.tag || item.status === 'NONE') continue;
        const c_hist = (item.concepto || "").toUpperCase().trim();
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
