const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('00_config.js', () => {
    let context;

    beforeAll(() => {
        const filePath = path.join(__dirname, '../extension/src/00_config.js');
        const fileContent = fs.readFileSync(filePath, 'utf8');

        context = {
            console: console
        };
        vm.createContext(context);
        // Use var instead of const to make them available on the context object in VM
        const scriptCode = fileContent.replace(/const /g, 'var ');
        vm.runInContext(scriptCode, context);
    });

    test('PALETTE should contain expected colors', () => {
        expect(context.PALETTE).toBeDefined();
        expect(context.PALETTE.blue).toBe("#2563eb");
        expect(context.PALETTE.violet).toBe("#7c3aed");
        expect(context.PALETTE.red).toBe("#dc2626");
        expect(context.PALETTE.orange).toBe("#ea580c");
        expect(context.PALETTE.slate_400).toBe("#94a3b8");
        expect(context.PALETTE.success).toBe("#10b981");
    });

    test('STATUS_MAP should use PALETTE colors', () => {
        expect(context.STATUS_MAP).toBeDefined();
        expect(context.STATUS_MAP.PENDING.color).toBe(context.PALETTE.slate_400);
        expect(context.STATUS_MAP.VALID.color).toBe(context.PALETTE.success);
        expect(context.STATUS_MAP.WARN.color).toBe(context.PALETTE.amber);
        expect(context.STATUS_MAP.CRIT.color).toBe(context.PALETTE.rose);
    });

    test('RULE_COLORS should use PALETTE colors', () => {
        expect(context.RULE_COLORS).toBeDefined();
        expect(context.RULE_COLORS.verde.hex).toBe(context.PALETTE.success);
        expect(context.RULE_COLORS.azul.hex).toBe(context.PALETTE.blue);
        expect(context.RULE_COLORS.morado.hex).toBe(context.PALETTE.violet);
        expect(context.RULE_COLORS.rojo.hex).toBe(context.PALETTE.red);
        expect(context.RULE_COLORS.naranja.hex).toBe(context.PALETTE.orange);
        expect(context.RULE_COLORS.gris.hex).toBe(context.PALETTE.muted);
    });
});
