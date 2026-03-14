const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('09_boot.js', () => {
    let fileContent;

    beforeAll(() => {
        const filePath = path.join(__dirname, '../extension/src/09_boot.js');
        fileContent = fs.readFileSync(filePath, 'utf8');
    });

    function runBoot(contextOverrides = {}) {
        const context = {
            console: {
                log: jest.fn(),
                warn: jest.fn(),
                error: jest.fn(),
                info: jest.fn(),
            },
            document: {
                createElement: jest.fn(() => ({
                    style: {},
                })),
                body: {
                    appendChild: jest.fn(),
                },
                getElementById: jest.fn(() => ({
                    innerText: ''
                }))
            },
            window: {},
            VERSION: '1.0.0',
            chrome: {
                runtime: {
                    id: 'test-extension-id'
                }
            },
            SystemControl: {
                isUserEnabled: jest.fn().mockResolvedValue(true)
            },
            UI: {
                init: jest.fn().mockResolvedValue(),
                renderDisabledLauncher: jest.fn()
            },
            DB_Engine: {
                fetch: jest.fn().mockResolvedValue({}),
                commit: jest.fn().mockResolvedValue()
            },
            KEYS: {
                SETTINGS: 'settings',
                USERS: 'users'
            },
            PALETTE: {
                itau_orange: '#ec7000'
            },
            Logger: {
                error: jest.fn().mockResolvedValue()
            },
            ...contextOverrides
        };

        context.window.top = context.window;

        vm.createContext(context);

        // As 09_boot.js is an IIFE, it will run immediately.
        // We capture the returned promise to await it.
        const scriptCode = fileContent.replace(
            /\(async function boot\(\) \{/,
            'const bootPromise = (async function boot() {'
        ) + '\nbootPromise;';

        const promise = vm.runInContext(scriptCode, context);
        return { promise, context };
    }

    test('should call LicenseSystem.debug() when LicenseSystem is defined', async () => {
        const mockDebug = jest.fn().mockResolvedValue();
        const { promise, context } = runBoot({
            LicenseSystem: {
                debug: mockDebug
            }
        });

        await promise;

        expect(mockDebug).toHaveBeenCalled();
    });

    test('should not crash when LicenseSystem is undefined', async () => {
        // Run without LicenseSystem defined in contextOverrides
        const { promise, context } = runBoot();

        await expect(promise).resolves.toBeUndefined();
        expect(context.console.info).toHaveBeenCalledWith(
            expect.stringContaining("[Monexa Debug] Initiating Boot Flow..."),
            expect.any(String)
        );
        expect(context.SystemControl.isUserEnabled).toHaveBeenCalled();
    });

    test('should abort boot if chrome.runtime.id is missing', async () => {
        const { promise, context } = runBoot({
            chrome: { runtime: {} } // id is missing
        });

        await expect(promise).resolves.toBeUndefined();
        expect(context.console.warn).toHaveBeenCalledWith(
            "Monexa: contexto de extensión no disponible, abortando boot."
        );
        expect(context.SystemControl.isUserEnabled).not.toHaveBeenCalled();
    });

    test('should disable launcher and abort boot if SystemControl.isUserEnabled is false', async () => {
        const mockIsUserEnabled = jest.fn().mockResolvedValue(false);
        const { promise, context } = runBoot({
            SystemControl: { isUserEnabled: mockIsUserEnabled }
        });

        await expect(promise).resolves.toBeUndefined();
        expect(context.console.warn).toHaveBeenCalledWith(
            "MONEXA FLOW está desactivado por el usuario."
        );
        expect(context.UI.renderDisabledLauncher).toHaveBeenCalled();
        expect(context.UI.init).not.toHaveBeenCalled();
    });

    test('should handle successful boot flow', async () => {
        const { promise, context } = runBoot();

        await expect(promise).resolves.toBeUndefined();
        expect(context.UI.init).toHaveBeenCalled();
        expect(context.console.log).toHaveBeenCalledWith(
            expect.stringContaining(`MONEXA FLOW v1.0.0 INICIADO`),
            expect.any(String),
            ""
        );
    });

    test('should catch and log critical errors during boot', async () => {
        const error = new Error("Test init error");
        const mockInit = jest.fn().mockRejectedValue(error);
        const { promise, context } = runBoot({
            UI: { init: mockInit }
        });

        await expect(promise).resolves.toBeUndefined();
        expect(context.console.error).toHaveBeenCalledWith(
            "Critical Failure in Monexa Initialization:",
            error
        );
        expect(context.Logger.error).toHaveBeenCalledWith(
            "Critical Init Failure: Test init error"
        );
    });
});
