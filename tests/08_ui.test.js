const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('UI._recalculateGap', () => {
    let UI;
    let dbEngineFetchMock;
    let contextDocument;

    beforeEach(() => {
        const filePath = path.join(__dirname, '../extension/src/08_ui.js');
        const fileContent = fs.readFileSync(filePath, 'utf8');

        dbEngineFetchMock = jest.fn();

        contextDocument = {
            getElementById: jest.fn(() => null),
            createElement: () => ({})
        };

        const context = {
            document: contextDocument,
            console: {
                log: jest.fn(),
                error: jest.fn()
            },
            DB_Engine: {
                fetch: dbEngineFetchMock
            },
            KEYS: {
                TRANSACTIONS: 'transactions'
            },
            Date: Date,
            Math: Math,
            isNaN: isNaN,
            setTimeout: setTimeout,
            STATUS_MAP: {
                VALID: { color: 'green', text: 'OK' },
                WARN: { color: 'yellow', text: 'WARN' },
                CRITICAL: { color: 'red', text: 'CRIT' }
            }
        };
        vm.createContext(context);

        const wrapper = `
            ${fileContent}
            globalThis.UI = UI;
        `;

        try {
            vm.runInContext(wrapper, context);
            UI = context.UI;
        } catch (e) {
            console.error(e);
        }
    });

    test('should return early if _officialBalance is undefined', async () => {
        UI._officialBalance = undefined;
        await UI._recalculateGap();
        expect(dbEngineFetchMock).not.toHaveBeenCalled();
    });

    test('should return early if _officialBalance is NaN', async () => {
        UI._officialBalance = NaN;
        await UI._recalculateGap();
        expect(dbEngineFetchMock).not.toHaveBeenCalled();
    });

    test('should return early if less than 500ms since last calculation', async () => {
        UI._officialBalance = 1000;
        UI._lastGapCalc = Date.now() - 100; // 100ms ago
        await UI._recalculateGap();
        expect(dbEngineFetchMock).not.toHaveBeenCalled();
    });

    test('should proceed if more than 500ms since last calculation', async () => {
        UI._officialBalance = 1000;
        UI._lastGapCalc = Date.now() - 600; // 600ms ago
        dbEngineFetchMock.mockResolvedValue({ items: {} });

        await UI._recalculateGap();

        expect(dbEngineFetchMock).toHaveBeenCalled();
    });

    test('should calculate internal sum correctly with IN and OUT transactions and non-zero gap', async () => {
        UI._officialBalance = 1000;
        UI._lastGapCalc = 0; // Force recalculation

        dbEngineFetchMock.mockResolvedValue({
            items: {
                t1: { amount: 500, direction: 'IN' },
                t2: { amount: 200, direction: 'OUT' },
                t3: { amount: 100, direction: 'IN' }
            }
        });

        const mockIntVal = { textContent: '' };
        const mockGapRow = { style: { display: '' } };
        const mockGapVal = { textContent: '' };
        const mockStatus = { className: '', textContent: '', style: {} };
        const mockCard = { style: {} };

        contextDocument.getElementById.mockImplementation((id) => {
            if (id === 'mx-internal-val') return mockIntVal;
            if (id === 'mx-gap-row') return mockGapRow;
            if (id === 'mx-gap-val') return mockGapVal;
            if (id === 'mx-integrity-status') return mockStatus;
            if (id === 'mx-integrity-card') return mockCard;
            return null;
        });

        await UI._recalculateGap();

        // Internal sum should be 500 - 200 + 100 = 400
        expect(mockIntVal.textContent).toContain('400');

        // Official balance is 1000, internal sum is 400. Gap is 600.
        expect(mockGapVal.textContent).toContain('600');
        expect(mockStatus.textContent).toBe('BRECHA');
        expect(mockStatus.style.background).toBe('#991b1b');
        expect(mockStatus.style.color).toBe('#f87171');
        expect(mockCard.style.borderLeftColor).toBe('#ef4444');
    });

    test('should handle edge case when db.items is null or undefined', async () => {
        UI._officialBalance = 1000;
        UI._lastGapCalc = 0;

        dbEngineFetchMock.mockResolvedValue({}); // missing items

        const mockIntVal = { textContent: '' };
        const mockGapRow = { style: { display: '' } };
        const mockGapVal = { textContent: '' };
        const mockStatus = { className: '', textContent: '', style: {} };
        const mockCard = { style: {} };

        contextDocument.getElementById.mockImplementation((id) => {
            if (id === 'mx-internal-val') return mockIntVal;
            if (id === 'mx-gap-row') return mockGapRow;
            if (id === 'mx-gap-val') return mockGapVal;
            if (id === 'mx-integrity-status') return mockStatus;
            if (id === 'mx-integrity-card') return mockCard;
            return null;
        });

        await UI._recalculateGap();

        // Internal sum should be 0 since there are no items
        expect(mockIntVal.textContent).toContain('0');

        // Official balance is 1000, internal sum is 0. Gap is 1000.
        expect(mockGapVal.textContent).toContain('1.000');
        expect(mockStatus.textContent).toBe('BRECHA');
    });

    test('should update status appropriately when gap is 0', async () => {
        UI._officialBalance = 500;
        UI._lastGapCalc = 0;

        dbEngineFetchMock.mockResolvedValue({
            items: {
                t1: { amount: 500, direction: 'IN' }
            }
        });

        const mockIntVal = { textContent: '' };
        const mockGapRow = { style: { display: '' } };
        const mockGapVal = { textContent: '' };
        const mockStatus = { className: '', textContent: '', style: {} };
        const mockCard = { style: {} };

        contextDocument.getElementById.mockImplementation((id) => {
            if (id === 'mx-internal-val') return mockIntVal;
            if (id === 'mx-gap-row') return mockGapRow;
            if (id === 'mx-gap-val') return mockGapVal;
            if (id === 'mx-integrity-status') return mockStatus;
            if (id === 'mx-integrity-card') return mockCard;
            return null;
        });

        await UI._recalculateGap();

        // Gap should be 0
        expect(mockGapVal.textContent).toContain('0');
        expect(mockStatus.textContent).toBe('INTEGRO');
        expect(mockStatus.style.background).toBe('#065f46');
        expect(mockStatus.style.color).toBe('#34d399');
        expect(mockCard.style.borderLeftColor).toBe('#10b981');
    });
});
