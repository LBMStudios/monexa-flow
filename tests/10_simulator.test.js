const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('10_simulator.js', () => {
    let fileContent;

    beforeAll(() => {
        const filePath = path.join(__dirname, '../extension/src/10_simulator.js');
        fileContent = fs.readFileSync(filePath, 'utf8');
    });

    const createVMContext = (withWorkerEngine = true) => {
        const context = {
            console: {
                log: jest.fn(),
                error: jest.fn()
            },
            alert: jest.fn(),
            Date: global.Date,
            Math: global.Math
        };

        if (withWorkerEngine) {
            context.WorkerEngine = {
                processBatch: jest.fn()
            };
        }

        vm.createContext(context);
        const scriptCode = fileContent.replace(/const MonexaLab =/g, 'var MonexaLab =');
        vm.runInContext(scriptCode, context);
        return context;
    };

    test('should process batch when WorkerEngine is available', async () => {
        const context = createVMContext(true);
        const count = 5;

        await context.MonexaLab.injectStressData(count);

        expect(context.console.log).toHaveBeenCalledWith(expect.stringContaining(`[MonexaLab] Iniciando Stress Test: ${count}`));

        expect(context.WorkerEngine.processBatch).toHaveBeenCalled();
        const batchData = context.WorkerEngine.processBatch.mock.calls[0][0];

        expect(batchData).toBeDefined();
        expect(Array.isArray(batchData)).toBe(true);
        expect(batchData.length).toBe(count);

        const firstItem = batchData[0];
        expect(firstItem).toHaveProperty('fecha');
        expect(firstItem).toHaveProperty('concepto');
        expect(firstItem).toHaveProperty('debito');
        expect(firstItem).toHaveProperty('credito');
        expect(firstItem).toHaveProperty('saldo', '123456.78');
        expect(firstItem).toHaveProperty('moneda');
        expect(firstItem).toHaveProperty('account', 'CTA-ESTRES-ITAU-001');

        expect(firstItem.concepto).toContain('TRANSACCION SIMULADA #0');
        expect(context.alert).toHaveBeenCalledWith(expect.stringContaining(`Stress Test Iniciado: Procesando ${count} movimientos en el motor de fondo.`));
        expect(context.console.error).not.toHaveBeenCalled();
    });

    test('should log error when WorkerEngine is unavailable (line 36 edge case)', async () => {
        const context = createVMContext(false);
        const count = 3;

        await context.MonexaLab.injectStressData(count);

        expect(context.console.log).toHaveBeenCalledWith(expect.stringContaining(`[MonexaLab] Iniciando Stress Test: ${count}`));
        expect(context.console.error).toHaveBeenCalledWith("[MonexaLab] WorkerEngine no disponible.");
        expect(context.alert).not.toHaveBeenCalled();
    });

    test('should use default count of 1000 when no argument is provided', async () => {
        const context = createVMContext(true);

        await context.MonexaLab.injectStressData();

        expect(context.WorkerEngine.processBatch).toHaveBeenCalled();
        const batchData = context.WorkerEngine.processBatch.mock.calls[0][0];
        expect(batchData.length).toBe(1000);
        expect(context.console.log).toHaveBeenCalledWith(expect.stringContaining(`[MonexaLab] Iniciando Stress Test: 1000`));
    });

    test('should generate correct debito and credito values based on random probability', async () => {
        const context = createVMContext(true);

        const originalMath = global.Math;
        const mockMath = Object.create(global.Math);
        let randomCallCount = 0;

        mockMath.random = jest.fn().mockImplementation(() => {
            randomCallCount++;
            if (randomCallCount === 1) return 0.5; // amount
            if (randomCallCount === 2) return 0.5; // isOut > 0.3 -> true (debito)
            if (randomCallCount === 3) return 0.5; // moneda > 0.2 -> true (PESOS)
            if (randomCallCount === 4) return 0.1; // amount
            if (randomCallCount === 5) return 0.1; // isOut > 0.3 -> false (credito)
            if (randomCallCount === 6) return 0.1; // moneda > 0.2 -> false (DOLARES)
            return 0.5;
        });

        context.Math = mockMath;

        await context.MonexaLab.injectStressData(2);

        const batchData = context.WorkerEngine.processBatch.mock.calls[0][0];

        expect(batchData[0].debito).not.toBe("");
        expect(batchData[0].credito).toBe("");
        expect(batchData[0].moneda).toBe("PESOS");

        expect(batchData[1].debito).toBe("");
        expect(batchData[1].credito).not.toBe("");
        expect(batchData[1].moneda).toBe("DOLARES");
    });
});
