const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('DataCore.getPrediction', () => {
    let DataCore;

    beforeAll(() => {
        // Load the 04_data.js file into a sandboxed environment
        let code = fs.readFileSync(path.join(__dirname, '../extension/src/04_data.js'), 'utf8');
        // Make DataCore accessible on the global sandbox object
        code = code.replace('const DataCore =', 'globalThis.DataCore =');
        const sandbox = { Math, Date, Object, parseFloat, isNaN, JSON, document: { createElement: () => ({}) } }; // mock document for sanitizeText
        vm.createContext(sandbox);
        vm.runInContext(code, sandbox);
        DataCore = sandbox.DataCore;
    });

    test('returns null if concepto is missing', () => {
        const dbItems = {
            'hash1': { tag: 'FOOD', status: 'OK', concepto: 'Supermercado' }
        };
        expect(DataCore.getPrediction(null, dbItems)).toBeNull();
        expect(DataCore.getPrediction('', dbItems)).toBeNull();
        expect(DataCore.getPrediction(undefined, dbItems)).toBeNull();
    });

    test('returns null if dbItems is missing or empty', () => {
        expect(DataCore.getPrediction('Supermercado', null)).toBeNull();
        expect(DataCore.getPrediction('Supermercado', undefined)).toBeNull();
    });

    test('returns null if no items match above threshold', () => {
        const dbItems = {
            'hash1': { tag: 'FOOD', status: 'OK', concepto: 'Panaderia' },
            'hash2': { tag: 'TECH', status: 'OK', concepto: 'Apple Store' }
        };
        // No match with target string 'Supermercado'
        expect(DataCore.getPrediction('Supermercado', dbItems)).toBeNull();
    });

    test('returns null if items match but status is NONE or no tag is set', () => {
        const dbItems = {
            'hash1': { tag: 'FOOD', status: 'NONE', concepto: 'Supermercado' },
            'hash2': { tag: null, status: 'OK', concepto: 'Supermercado' }
        };
        expect(DataCore.getPrediction('Supermercado', dbItems)).toBeNull();
    });

    test('returns exact match (score 1.0) with confidence', () => {
        const dbItems = {
            'hash1': { tag: 'FOOD', note: 'comida', status: 'OK', concepto: 'SUPERMERCADO TATA' }
        };
        const result = DataCore.getPrediction('SUPERMERCADO TATA', dbItems);
        expect(result).toEqual({ tag: 'FOOD', note: 'comida', confidence: 1.0 });
    });

    test('returns partial match (score 0.8) with confidence', () => {
        const dbItems = {
            'hash1': { tag: 'FOOD', note: 'comida', status: 'OK', concepto: 'SUPERMERCADO TATA MONTEVIDEO' }
        };
        // "SUPERMERCADO TATA" is included in "SUPERMERCADO TATA MONTEVIDEO"
        const result = DataCore.getPrediction('SUPERMERCADO TATA', dbItems);
        expect(result).toEqual({ tag: 'FOOD', note: 'comida', confidence: 0.8 });
    });

    test('returns match with highest cumulative score', () => {
        const dbItems = {
            'hash1': { tag: 'FOOD', note: 'comida', status: 'OK', concepto: 'SUPERMERCADO' },
            'hash2': { tag: 'GROCERY', note: 'super', status: 'OK', concepto: 'SUPERMERCADO' },
            'hash3': { tag: 'FOOD', note: 'comida', status: 'OK', concepto: 'SUPERMERCADO' }
        };

        // FOOD|comida has 2 exact matches (score 1.0 + 1.0 = 2.0)
        // GROCERY|super has 1 exact match (score 1.0)
        const result = DataCore.getPrediction('SUPERMERCADO', dbItems);
        expect(result).toEqual({ tag: 'FOOD', note: 'comida', confidence: 2.0 });
    });

    test('handles empty note gracefully', () => {
        const dbItems = {
            'hash1': { tag: 'FOOD', status: 'OK', concepto: 'SUPERMERCADO' } // no note
        };
        const result = DataCore.getPrediction('SUPERMERCADO', dbItems);
        expect(result).toEqual({ tag: 'FOOD', note: '', confidence: 1.0 });
    });

    test('ignores case differences', () => {
        const dbItems = {
            'hash1': { tag: 'FOOD', note: 'comida', status: 'OK', concepto: 'SuPeRmErCaDo TaTa' }
        };
        const result = DataCore.getPrediction('supermercado tata', dbItems);
        expect(result).toEqual({ tag: 'FOOD', note: 'comida', confidence: 1.0 });
    });
});
