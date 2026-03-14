const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Worker normalizeText', () => {
    let normalizeText;

    beforeAll(() => {
        const filePath = path.join(__dirname, '../extension/src/01a_worker.js');
        const fileContent = fs.readFileSync(filePath, 'utf8');

        const context = {
            self: {
                onmessage: null,
                postMessage: null
            }
        };
        vm.createContext(context);

        const wrapper = `
            ${fileContent}
            globalThis.normalizeText = typeof normalizeText !== 'undefined' ? normalizeText : null;
        `;

        vm.runInContext(wrapper, context);
        normalizeText = context.normalizeText;

        if (!normalizeText) {
            throw new Error('normalizeText was not defined in the VM context');
        }
    });

    test('should normalize a regular string', () => {
        expect(normalizeText('hello world')).toBe('HELLO WORLD');
    });

    test('should handle null, undefined, and empty string', () => {
        expect(normalizeText(null)).toBe('');
        expect(normalizeText(undefined)).toBe('');
        expect(normalizeText('')).toBe('');
    });

    test('should convert to string and normalize numbers', () => {
        expect(normalizeText(12345)).toBe('12345');
    });

    test('should remove leading and trailing spaces', () => {
        expect(normalizeText('  test  ')).toBe('TEST');
    });

    test('should collapse multiple spaces into a single space', () => {
        expect(normalizeText('hello    world')).toBe('HELLO WORLD');
    });

    test('should replace non-breaking spaces (\\u00A0) with a regular space', () => {
        expect(normalizeText('hello\u00A0world')).toBe('HELLO WORLD');
    });

    test('should handle a complex string with various spaces and non-breaking spaces', () => {
        expect(normalizeText(' \u00A0  test \u00A0 string   with \u00A0 spaces  \u00A0 ')).toBe('TEST STRING WITH SPACES');
    });
});
