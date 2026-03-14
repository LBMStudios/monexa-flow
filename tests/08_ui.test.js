const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('UI.refreshRulesList - escapeStr', () => {
    let escapeStr;

    beforeAll(() => {
        const filePath = path.join(__dirname, '../extension/src/08_ui.js');
        const fileContent = fs.readFileSync(filePath, 'utf8');

        // Extract the escapeStr function definition from the file using a regex that handles newlines or just reading the exact line.
        // It's on a single line, but my previous regex was matching up to the first semicolon. Let's look at the actual line.
        // const escapeStr = (s) => String(s || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
        const match = fileContent.match(/const escapeStr = [^\n]+/);
        if (!match) {
            throw new Error('Could not find escapeStr function definition in 08_ui.js');
        }

        const context = {};
        vm.createContext(context);
        vm.runInContext(`${match[0]}\n globalThis.escapeStr = escapeStr;`, context);
        escapeStr = context.escapeStr;
    });

    test('should escape HTML characters correctly', () => {
        expect(escapeStr('&')).toBe('&amp;');
        expect(escapeStr('<')).toBe('&lt;');
        expect(escapeStr('>')).toBe('&gt;');
        expect(escapeStr('"')).toBe('&quot;');
        expect(escapeStr("'")).toBe('&#39;');
    });

    test('should escape multiple HTML characters in a string', () => {
        expect(escapeStr('<script>alert("XSS & Co.")</script>')).toBe('&lt;script&gt;alert(&quot;XSS &amp; Co.&quot;)&lt;/script&gt;');
    });

    test('should handle null and undefined', () => {
        expect(escapeStr(null)).toBe('');
        expect(escapeStr(undefined)).toBe('');
    });

    test('should handle normal strings without modification', () => {
        expect(escapeStr('hello world')).toBe('hello world');
        expect(escapeStr('12345')).toBe('12345');
    });

    test('should handle numbers and other types by stringifying them', () => {
        expect(escapeStr(123)).toBe('123');
        expect(escapeStr(true)).toBe('true');
    });
});

describe('UI.refreshRulesList DOM injection', () => {
    let context;
    let UI;

    beforeAll(() => {
        const filePath = path.join(__dirname, '../extension/src/08_ui.js');
        const fileContent = fs.readFileSync(filePath, 'utf8');

        // Let's set up a complete mock for UI to test refreshRulesList specifically.
        // We will need RULE_COLORS, KEYS, DB_Engine
        context = {
            console: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
            document: {
                getElementById: jest.fn(),
                querySelectorAll: jest.fn(() => []),
            },
            KEYS: { RULES: 'rules' },
            RULE_COLORS: {
                verde: { hex: '#00FF00', label: 'Verde' },
                rojo: { hex: '#FF0000', label: 'Rojo' }
            },
            DB_Engine: {
                fetch: jest.fn()
            },
            Scanner: {
                reprocess: jest.fn()
            }
        };
        vm.createContext(context);

        // Remove use strict, map const to var so it gets attached to context, and run
        const scriptCode = fileContent.replace(/const /g, 'var ');
        vm.runInContext(scriptCode, context);
        UI = context.UI;
    });

    test('should populate rules list and escape malicious input in DOM', async () => {
        const mockDiv = { innerHTML: '' };
        context.document.getElementById.mockReturnValue(mockDiv);
        context.DB_Engine.fetch.mockResolvedValue([
            {
                pattern: '<script>alert(1)</script>',
                importe: '100">',
                label: 'Test&Label',
                note: 'Note"\'',
                color: 'verde'
            }
        ]);

        await UI.refreshRulesList();

        expect(context.document.getElementById).toHaveBeenCalledWith('mx-rules-list');
        expect(mockDiv.innerHTML).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
        expect(mockDiv.innerHTML).toContain('100&quot;&gt;');
        expect(mockDiv.innerHTML).toContain('Test&amp;Label');
        expect(mockDiv.innerHTML).toContain('Note&quot;&#39;');
        // Also check if <script> is NOT present directly
        expect(mockDiv.innerHTML).not.toContain('<script>');
    });

    test('should show empty state if no rules exist', async () => {
        const mockDiv = { innerHTML: '' };
        context.document.getElementById.mockReturnValue(mockDiv);
        context.DB_Engine.fetch.mockResolvedValue([]);

        await UI.refreshRulesList();

        expect(mockDiv.innerHTML).toContain('No hay reglas guardadas.');
    });
});
