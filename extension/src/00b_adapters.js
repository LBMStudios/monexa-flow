/**
 * 00b_adapters.js — MONEXA FLOW ADAPTERS
 * Definiciones de selectores y lógica de mapeo para diferentes bancos.
 */

'use strict';

const BANK_ADAPTERS = {
    ITAU: {
        matches: ['itau.com.uy', 'itaulink.com.uy'],
        rowSelector: 'tr',
        tableContainer: '.tab-pane.active, #principal, .contenedor-tabla',
        minCells: 3,
        map: (cells) => {
            const clean = (c) => (c?.innerText || '').trim();
            return {
                fecha: clean(cells[0]),
                concepto: clean(cells[1]),
                debito: clean(cells[2]),
                credito: clean(cells[3]),
                saldo: clean(cells[4]),
                extraSelector: 'a, button, span.link'
            };
        }
    },
    SANTANDER: {
        matches: ['santander.com.uy'],
        rowSelector: '.movimiento-row', // Selector hipotético basado en estandares
        tableContainer: '.lista-movimientos',
        minCells: 2,
        map: (cells) => {
            const clean = (c) => (c?.innerText || '').trim();
            return {
                fecha: clean(cells[0]),
                concepto: clean(cells[1]),
                debito: clean(cells[2]),
                credito: clean(cells[3]),
                saldo: clean(cells[4])
            };
        }
    },
    BROU: {
        matches: ['brou.com.uy'],
        rowSelector: '.grid-row',
        tableContainer: '#grid Movimientos',
        minCells: 2,
        map: (cells) => {
            const clean = (c) => (c?.innerText || '').trim();
            return {
                fecha: clean(cells[0]),
                concepto: clean(cells[1]),
                debito: clean(cells[2]),
                credito: clean(cells[3]),
                saldo: clean(cells[4])
            };
        }
    }
};

const AdapterEngine = {
    getAdapter() {
        const host = window.location.hostname;
        for (const key in BANK_ADAPTERS) {
            const adapter = BANK_ADAPTERS[key];
            if (adapter.matches.some(m => host.includes(m))) {
                return adapter;
            }
        }
        return BANK_ADAPTERS.ITAU; // Fallback
    }
};
