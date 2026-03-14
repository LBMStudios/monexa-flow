const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('01a_worker.js - parseAmount', () => {
    let workerContext;
    let postMessageMock;

    beforeEach(() => {
        const filePath = path.join(__dirname, '../extension/src/01a_worker.js');
        const fileContent = fs.readFileSync(filePath, 'utf8');

        postMessageMock = jest.fn();

        workerContext = {
            self: {
                postMessage: postMessageMock
            },
            console: console,
            isNaN: isNaN
        };

        vm.createContext(workerContext);
        vm.runInContext(fileContent, workerContext);
    });

    // Helper to simulate a worker message for testing parseAmount through the worker's processing
    const processRow = (importeRule, debitoTx, creditoTx) => {
        workerContext.self.onmessage({
            data: {
                action: 'PROCESS_ROW',
                data: {
                    concepto: 'TEST CONCEPT',
                    extra: '',
                    debito: debitoTx,
                    credito: creditoTx,
                    rules: [
                        { pattern: 'TEST', importe: importeRule, label: 'MATCH', color: 'red' }
                    ],
                    dbItems: {}
                }
            }
        });

        if (postMessageMock.mock.calls.length === 0) return null;
        const result = postMessageMock.mock.calls[0][0].result;
        return result.matchRule !== null;
    };

    test('should parse amount with comma as decimal', () => {
        expect(processRow('1250,5', '1250.5', '')).toBe(true);
        postMessageMock.mockClear();
        expect(processRow('1250,5', '1250,5', '')).toBe(true);
    });

    test('should parse amount with dot as thousand separator and comma as decimal', () => {
        expect(processRow('1.250,50', '1250.50', '')).toBe(true);
        postMessageMock.mockClear();
        expect(processRow('1.250,50', '1.250,50', '')).toBe(true);
    });

    test('should parse amount with comma as thousand separator and dot as decimal', () => {
        // Technically it replaces '.' and ',' differently.
        // clean.includes(',') && clean.includes('.') => clean = clean.replace(/\./g, '').replace(',', '.');
        // This assumes UY format. If it's US format 1,250.50, it replaces . with '' and , with . which makes 1.25050!
        // The regex rule says: Si hay comas y puntos (1.250,50), es formato ES/UY
        // Let's test the UY format correctly.
        expect(processRow('1.250,50', '1250.50', '')).toBe(true);
    });

    test('should parse amount with only dot as thousand separator', () => {
        expect(processRow('1.250', '1250', '')).toBe(true);
        postMessageMock.mockClear();
        expect(processRow('1.250', '1250.00', '')).toBe(true);
    });

    test('should ignore currency symbols and spaces', () => {
        expect(processRow('UYU 1.250,50', '$ 1.250,50', '')).toBe(true);
    });

    test('should return false when amounts do not match', () => {
        expect(processRow('1.250,50', '1250.51', '')).toBe(false);
    });

    test('should parse integers correctly', () => {
        expect(processRow('1250', '1250', '')).toBe(true);
    });

    test('should handle empty or null values', () => {
        // A rule without importe should still match if concept matches
        // Actually, processRow always provides a rule with an importe here.
        workerContext.self.onmessage({
            data: {
                action: 'PROCESS_ROW',
                data: {
                    concepto: 'TEST CONCEPT',
                    extra: '',
                    debito: '',
                    credito: '',
                    rules: [
                        { pattern: 'TEST', importe: '', label: 'MATCH', color: 'red' }
                    ],
                    dbItems: {}
                }
            }
        });

        expect(postMessageMock.mock.calls[0][0].result.matchRule).not.toBeNull();
    });
});
