/**
 * 10_simulator.js — MONEXA LAB (ITAÚ EDITION)
 * Motor de pruebas de estrés para validación de alta performance.
 */

'use strict';

const MonexaLab = {
    /**
     * Inyecta N movimientos de prueba directamente al worker para estresar IndexedDB.
     */
    async injectStressData(count = 1000) {
        console.log(`[MonexaLab] Iniciando Stress Test: ${count} movimientos en Itaú...`);
        
        const data = [];
        const baseDate = new Date();
        const account = "CTA-ESTRES-ITAU-001";

        for (let i = 0; i < count; i++) {
            const date = new Date(baseDate.getTime() - (i * 3600000));
            const amount = (Math.random() * 5000).toFixed(2);
            const isOut = Math.random() > 0.3;
            
            data.push({
                fecha: date.toLocaleDateString('es-UY'),
                concepto: `TRANSACCION SIMULADA #${i} - ITAU LAB`,
                debito: isOut ? amount : "",
                credito: isOut ? "" : amount,
                saldo: "123456.78",
                moneda: Math.random() > 0.2 ? "PESOS" : "DOLARES",
                account: account
            });
        }

        // Enviar al worker para procesamiento masivo
        if (typeof WorkerEngine !== 'undefined') {
            WorkerEngine.processBatch(data);
            alert(`Stress Test Iniciado: Procesando ${count} movimientos en el motor de fondo.`);
        } else {
            console.error("[MonexaLab] WorkerEngine no disponible.");
        }
    }
};
