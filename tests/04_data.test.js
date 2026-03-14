const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('DataCore.normalizeAmount', () => {
    let DataCore;

    beforeAll(() => {
        const filePath = path.join(__dirname, '../extension/src/04_data.js');
        const fileContent = fs.readFileSync(filePath, 'utf8');

        // Remove 'use strict' if present to allow global assignment if it were not a const
        // But here it is a 'const DataCore = { ... }' in the top level.
        // In VM context, top level const/let don't always end up in the context object directly
        // if not explicitly assigned to global or just using 'var' or nothing.

        const context = {
            document: {
                createElement: () => ({
                    set textContent(val) { this.innerHTML = val; },
                    innerHTML: ''
                })
            },
            console: console
        };
        vm.createContext(context);

        // Wrap the code to return DataCore or assign it to global
        const wrapper = `
            ${fileContent}
            globalThis.DataCore = DataCore;
        `;

        vm.runInContext(wrapper, context);
        DataCore = context.DataCore;

        if (!DataCore) {
            // Try another way if it failed
            DataCore = vm.runInContext(fileContent + '; DataCore;', context);
        }

        if (!DataCore) {
            throw new Error('DataCore was not defined in the VM context');
        }
    });

    test('should handle valid Itaú formatted amounts (e.g., "1.250,00")', () => {
        expect(DataCore.normalizeAmount("1.250,00")).toBe(1250.00);
        expect(DataCore.normalizeAmount("10.000,50")).toBe(10000.50);
        expect(DataCore.normalizeAmount("1.234.567,89")).toBe(1234567.89);
    });

    test('should handle amounts without thousands separators', () => {
        expect(DataCore.normalizeAmount("1250,00")).toBe(1250.00);
        expect(DataCore.normalizeAmount("500,75")).toBe(500.75);
    });

    test('should handle simple integer strings', () => {
        expect(DataCore.normalizeAmount("500")).toBe(500);
        expect(DataCore.normalizeAmount("1000")).toBe(1000);
    });

    test('should handle negative amounts', () => {
        expect(DataCore.normalizeAmount("-1.250,00")).toBe(-1250.00);
        expect(DataCore.normalizeAmount("-500")).toBe(-500);
    });

    test('should handle amounts with currency symbols and spaces', () => {
        expect(DataCore.normalizeAmount("U$S 1.250,00")).toBe(1250.00);
        expect(DataCore.normalizeAmount("$ 500,00")).toBe(500.00);
        expect(DataCore.normalizeAmount("UYU 100")).toBe(100);
    });

    test('should return 0 for empty or null-like values', () => {
        expect(DataCore.normalizeAmount("")).toBe(0);
        expect(DataCore.normalizeAmount(null)).toBe(0);
        expect(DataCore.normalizeAmount(undefined)).toBe(0);
    });

    test('should return 0 for non-numeric strings', () => {
        expect(DataCore.normalizeAmount("abc")).toBe(0);
        expect(DataCore.normalizeAmount("---")).toBe(0);
    });

    test('should handle amounts with only decimals', () => {
        expect(DataCore.normalizeAmount("0,50")).toBe(0.50);
        expect(DataCore.normalizeAmount(",75")).toBe(0.75);
    });
});
