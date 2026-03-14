const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('09_boot.js - Error Handling', () => {
    let context;
    let fileContent;

    beforeAll(() => {
        const filePath = path.join(__dirname, '../extension/src/09_boot.js');
        fileContent = fs.readFileSync(filePath, 'utf8');
    });

    beforeEach(() => {
        // Create fresh context for each test
        context = {
            console: {
                log: jest.fn(),
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn()
            },
            document: {
                createElement: jest.fn(() => ({
                    style: {},
                    id: '',
                    innerText: ''
                })),
                body: {
                    appendChild: jest.fn()
                },
                getElementById: jest.fn()
            },
            window: {},
            VERSION: '1.0.0',
            PALETTE: {
                itau_orange: '#ec7000'
            },
            KEYS: {
                SETTINGS: 'settings',
                USERS: 'users'
            },
            // Mock SystemControl to throw an error
            SystemControl: {
                isUserEnabled: jest.fn().mockRejectedValue(new Error("Simulated Failure"))
            },
            UI: {
                init: jest.fn().mockResolvedValue(),
                renderDisabledLauncher: jest.fn()
            },
            DB_Engine: {
                fetch: jest.fn().mockResolvedValue({}),
                commit: jest.fn().mockResolvedValue()
            },
            Logger: {
                error: jest.fn().mockResolvedValue()
            },
            chrome: {
                runtime: {
                    id: 'test-id'
                }
            },
            LicenseSystem: {
                debug: jest.fn().mockResolvedValue()
            }
        };
        // Top level window should be itself for equality checks
        context.window.top = context.window;

        vm.createContext(context);
    });

    test('should log error and call Logger.error when an exception occurs and chrome.runtime.id is present', async () => {
        // Change the IIFE into an assigned promise so we can await it
        const scriptCode = fileContent.replace(
            /^\s*\(async function boot\(\) \{/m,
            'globalThis.bootPromise = (async function boot() {'
        );

        vm.runInContext(scriptCode, context);

        // Await the completion of the boot process
        await context.bootPromise;

        expect(context.console.error).toHaveBeenCalledWith(
            "Critical Failure in Monexa Initialization:",
            expect.any(Error)
        );

        expect(context.Logger.error).toHaveBeenCalledWith(
            "Critical Init Failure: Simulated Failure"
        );
    });

    test('should log error but NOT call Logger.error when an exception occurs and chrome.runtime.id is NOT present', async () => {
        // In order to reach the catch block, chrome.runtime.id must be truthy at the start
        // but falsy when the catch block executes. We can simulate this by changing it
        // during the execution of a mocked function that throws an error.

        context.SystemControl.isUserEnabled = jest.fn().mockImplementation(() => {
            // Remove chrome.runtime.id just before throwing
            delete context.chrome.runtime.id;
            return Promise.reject(new Error("Simulated Failure"));
        });

        // Change the IIFE into an assigned promise so we can await it
        const scriptCode = fileContent.replace(
            /^\s*\(async function boot\(\) \{/m,
            'globalThis.bootPromise = (async function boot() {'
        );

        vm.runInContext(scriptCode, context);

        // Await the completion of the boot process
        await context.bootPromise;

        expect(context.console.error).toHaveBeenCalledWith(
            "Critical Failure in Monexa Initialization:",
            expect.any(Error)
        );

        // Logger.error should NOT be called because chrome.runtime.id is undefined
        expect(context.Logger.error).not.toHaveBeenCalled();
    });
});
