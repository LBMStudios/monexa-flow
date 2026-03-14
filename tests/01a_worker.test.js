const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('01a_worker.js - parseAmount', () => {
    let context;

    beforeAll(() => {
        const filePath = path.join(__dirname, '../extension/src/01a_worker.js');
        const fileContent = fs.readFileSync(filePath, 'utf8');

        // Create a mock worker context
        context = {
            console: console,
            self: {
                onmessage: null,
                postMessage: jest.fn()
            }
        };

        vm.createContext(context);

        // We want to extract 'parseAmount' which is defined with 'const'.
        // To make it accessible in our context, we replace 'const parseAmount'
        // with 'var parseAmount' so it gets bound to the global context.
        let scriptCode = fileContent.replace(/const parseAmount =/g, 'var parseAmount =');

        vm.runInContext(scriptCode, context);
    });

    test('should return NaN for null, undefined, or empty string', () => {
        expect(context.parseAmount(null)).toBeNaN();
        expect(context.parseAmount(undefined)).toBeNaN();
        expect(context.parseAmount('')).toBeNaN();
    });

    test('should parse standard numbers correctly', () => {
        expect(context.parseAmount('100')).toBe(100);
        expect(context.parseAmount('100.50')).toBe(100.5);
        expect(context.parseAmount('100.5')).toBe(100.5);
    });

    test('should parse ES/UY format correctly (dot for thousands, comma for decimal)', () => {
        expect(context.parseAmount('1.250,50')).toBe(1250.5);
        expect(context.parseAmount('1.000.250,50')).toBe(1000250.5);
        expect(context.parseAmount('1.250,5')).toBe(1250.5);
    });

    test('should parse formats with only comma as decimal separator', () => {
        expect(context.parseAmount('1250,50')).toBe(1250.5);
        expect(context.parseAmount('1250,5')).toBe(1250.5);
    });

    test('should parse formats with only dots as thousands separator (if exactly 3 digits follow)', () => {
        expect(context.parseAmount('1.250')).toBe(1250);
        expect(context.parseAmount('100.250')).toBe(100250);
    });

    test('should ignore non-numeric characters and handle strings gracefully', () => {
        expect(context.parseAmount('$ 1.250,50 USD')).toBe(1250.5);
        expect(context.parseAmount('Importe: 1.250,50')).toBe(1250.5);
        expect(context.parseAmount('-1.250,50')).toBe(-1250.5);
    });

    test('should parse numbers with multiple dots and commas gracefully', () => {
        // According to current regex logic, it cleans out non digits/dots/commas/hyphens
        // Then if it has dot and comma, replaces dots with empty string, comma with dot.
        expect(context.parseAmount('USD 1.234.567,89')).toBe(1234567.89);
    });
});
