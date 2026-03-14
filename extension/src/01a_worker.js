/**
 * 01a_worker.js — MONEXA FLOW WORKER
 * Procesamiento Off-Main-Thread para matching de reglas y Predictive UX.
 */

self.onmessage = function(e) {
    const { action, data } = e.data;

    if (action === 'PROCESS_ROW') {
        const { concepto, extra, debito, credito, rules, dbItems } = data;
        
        // 1. Matching de Reglas (Lógica de 06_scanner.js movida aquí)
        const normalizeStr = (s) => (s || '').toString().replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
        const c_clean = normalizeStr(concepto);
        const e_clean = normalizeStr(extra);

        const parseAmount = (s) => {
            if (!s) return NaN;
            // Limpieza específica para Itaú Uruguay: 
            // 1. Quitar moneda y espacios, dejando solo dígitos, comas, puntos y signos
            let clean = s.toString().replace(/[^\d,.-]/g, '');
            
            // 2. Si hay comas y puntos (1.250,50), es formato ES/UY: limpiar puntos (miles) y cambiar coma por punto (decimal)
            if (clean.includes(',') && clean.includes('.')) {
                clean = clean.replace(/\./g, '').replace(',', '.');
            } 
            // 3. Si hay solo comas (1250,5), es decimal
            else if (clean.includes(',')) {
                clean = clean.replace(',', '.');
            }
            // 4. Si hay solo puntos (1.500 o 1500.00)
            // En Uruguay/Itaú el punto suele ser miles. PERO en JS/HTML inputs suele ser decimal.
            // Heurística: Si hay 3 dígitos después del último punto, es miles. Si no, es decimal.
            else if (clean.includes('.')) {
                const parts = clean.split('.');
                const lastPart = parts[parts.length - 1];
                if (lastPart.length === 3) {
                    clean = clean.replace(/\./g, ''); // Era miles
                } else {
                    // Es decimal (formato internacional), lo dejamos como está
                }
            }
            return parseFloat(clean);
        };

        const sortedRules = [...rules].sort((a, b) => (b.importe ? 1 : 0) - (a.importe ? 1 : 0));

        const matchRule = sortedRules.find(r => {
            const r_pattern = normalizeStr(r.pattern);
            if (!r_pattern) return false;

            // Matching parcial de texto (v1.1 logic)
            const inText = c_clean.indexOf(r_pattern) !== -1 || e_clean.indexOf(r_pattern) !== -1;
            if (!inText) return false;

            // Si hay importe en la regla, debe coincidir
            if (r.importe) {
                const rN = parseAmount(r.importe);
                const txN = parseAmount(debito) || parseAmount(credito);
                return !isNaN(rN) && !isNaN(txN) && Math.abs(rN - txN) < 0.01;
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
            requestId: e.data.requestId, // 🛠️ FIJACIÓN CRÍTICA: Retornar ID para que el Scanner escuche
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
