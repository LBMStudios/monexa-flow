const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('09_boot.js', () => {
    let fileContent;

    beforeAll(() => {
        const filePath = path.join(__dirname, '../extension/src/09_boot.js');
        fileContent = fs.readFileSync(filePath, 'utf8');
    });

    const createBaseContext = () => {
        const mocks = {
            VERSION: "1.0.0",
            LicenseSystem: { debug: jest.fn().mockResolvedValue() },
            document: {
                createElement: jest.fn().mockImplementation((tag) => ({
                    id: '',
                    style: { cssText: '' },
                    innerText: '',
                    tagName: tag
                })),
                body: { appendChild: jest.fn() },
                getElementById: jest.fn().mockReturnValue({ innerText: '' })
            },
            chrome: { runtime: { id: "test-extension-id" } },
            SystemControl: { isUserEnabled: jest.fn().mockResolvedValue(true) },
            UI: {
                renderDisabledLauncher: jest.fn(),
                init: jest.fn().mockResolvedValue()
            },
            DB_Engine: {
                fetch: jest.fn().mockResolvedValue({}),
                commit: jest.fn().mockResolvedValue()
            },
            KEYS: { SETTINGS: "SETTINGS_KEY", USERS: "USERS_KEY" },
            PALETTE: { itau_orange: "#ec7000" },
            Logger: { error: jest.fn().mockResolvedValue() },
            console: {
                info: jest.fn(),
                warn: jest.fn(),
                log: jest.fn(),
                error: jest.fn()
            },
            window: {}
        };
        mocks.window.top = mocks.window;
        return mocks;
    };

    test('should execute LicenseSystem.debug if LicenseSystem is defined', async () => {
        const context = createBaseContext();
        vm.createContext(context);
        await vm.runInContext(fileContent, context);
        expect(context.LicenseSystem.debug).toHaveBeenCalled();
    });

    test('should not execute LicenseSystem.debug if LicenseSystem is undefined', async () => {
        const context = createBaseContext();
        delete context.LicenseSystem;
        vm.createContext(context);
        await vm.runInContext(fileContent, context);
        // It should just not throw an error and proceed
        expect(context.console.info).toHaveBeenCalled();
    });

    test('should abort if chrome.runtime.id is missing', async () => {
        const context = createBaseContext();
        delete context.chrome.runtime.id;
        vm.createContext(context);
        await vm.runInContext(fileContent, context);

        expect(context.console.warn).toHaveBeenCalledWith(
            expect.stringContaining('contexto de extensión no disponible')
        );
        expect(context.SystemControl.isUserEnabled).not.toHaveBeenCalled();
    });

    test('should abort and render disabled launcher if user is disabled', async () => {
        const context = createBaseContext();
        context.SystemControl.isUserEnabled.mockResolvedValue(false);
        const mockDebugTag = { innerText: '' };
        context.document.getElementById.mockReturnValue(mockDebugTag);

        vm.createContext(context);
        await vm.runInContext(fileContent, context);

        expect(context.console.warn).toHaveBeenCalledWith(
            expect.stringContaining('está desactivado por el usuario')
        );
        expect(context.UI.renderDisabledLauncher).toHaveBeenCalled();
        expect(mockDebugTag.innerText).toBe('MX:OFF');
        expect(context.UI.init).not.toHaveBeenCalled();
    });

    test('should abort but not render disabled launcher if user is disabled and window is not top', async () => {
        const context = createBaseContext();
        context.SystemControl.isUserEnabled.mockResolvedValue(false);
        context.window = {}; // Different from window.top (which is undefined now or different)

        vm.createContext(context);
        await vm.runInContext(fileContent, context);

        expect(context.console.warn).toHaveBeenCalledWith(
            expect.stringContaining('está desactivado por el usuario')
        );
        expect(context.UI.renderDisabledLauncher).not.toHaveBeenCalled();
    });

    test('should initialize UI and not update user stats if no active user in settings', async () => {
        const context = createBaseContext();
        context.DB_Engine.fetch.mockResolvedValue({}); // config.user will be undefined

        vm.createContext(context);
        await vm.runInContext(fileContent, context);

        expect(context.UI.init).toHaveBeenCalled();
        expect(context.DB_Engine.fetch).toHaveBeenCalledWith(context.KEYS.SETTINGS, { user: "" });
        // It shouldn't fetch users
        expect(context.DB_Engine.fetch).toHaveBeenCalledTimes(1);
        expect(context.console.log).toHaveBeenCalledWith(
            expect.stringContaining('INICIADO'),
            expect.any(String),
            expect.any(String)
        );
    });

    test('should update login count if active user exists and lastActive > 30m', async () => {
        const context = createBaseContext();

        const nowMs = Date.now();
        const pastDate = new Date(nowMs - 31 * 60 * 1000).toISOString(); // 31 mins ago

        const mockConfig = { user: "TestUser" };
        const mockUsers = [{ name: "testuser", loginCount: 5, lastActive: pastDate }];

        context.DB_Engine.fetch.mockImplementation(async (key) => {
            if (key === context.KEYS.SETTINGS) return mockConfig;
            if (key === context.KEYS.USERS) return mockUsers;
            return null;
        });

        vm.createContext(context);
        await vm.runInContext(fileContent, context);

        expect(mockUsers[0].loginCount).toBe(6);
        expect(context.DB_Engine.commit).toHaveBeenCalledWith(context.KEYS.USERS, mockUsers);
    });

    test('should initialize login count to 1 if active user exists and no previous login count but lastActive > 30m', async () => {
        const context = createBaseContext();

        const nowMs = Date.now();
        const pastDate = new Date(nowMs - 31 * 60 * 1000).toISOString(); // 31 mins ago

        const mockConfig = { user: "TestUser" };
        const mockUsers = [{ name: "testuser", lastActive: pastDate }];

        context.DB_Engine.fetch.mockImplementation(async (key) => {
            if (key === context.KEYS.SETTINGS) return mockConfig;
            if (key === context.KEYS.USERS) return mockUsers;
            return null;
        });

        vm.createContext(context);
        await vm.runInContext(fileContent, context);

        expect(mockUsers[0].loginCount).toBe(1);
        expect(context.DB_Engine.commit).toHaveBeenCalledWith(context.KEYS.USERS, mockUsers);
    });

    test('should not update login count if active user exists but lastActive < 30m', async () => {
        const context = createBaseContext();

        const nowMs = Date.now();
        const recentDate = new Date(nowMs - 15 * 60 * 1000).toISOString(); // 15 mins ago

        const mockConfig = { user: "TestUser" };
        const mockUsers = [{ name: "testuser", loginCount: 5, lastActive: recentDate }];

        context.DB_Engine.fetch.mockImplementation(async (key) => {
            if (key === context.KEYS.SETTINGS) return mockConfig;
            if (key === context.KEYS.USERS) return mockUsers;
            return null;
        });

        vm.createContext(context);
        await vm.runInContext(fileContent, context);

        expect(mockUsers[0].loginCount).toBe(5); // unchanged
        expect(context.DB_Engine.commit).toHaveBeenCalledWith(context.KEYS.USERS, mockUsers);
    });

    test('should not crash if user exists in config but not in USERS array', async () => {
        const context = createBaseContext();

        const mockConfig = { user: "TestUser" };
        const mockUsers = [{ name: "otheruser", loginCount: 5 }];

        context.DB_Engine.fetch.mockImplementation(async (key) => {
            if (key === context.KEYS.SETTINGS) return mockConfig;
            if (key === context.KEYS.USERS) return mockUsers;
            return null;
        });

        vm.createContext(context);
        await vm.runInContext(fileContent, context);

        expect(context.DB_Engine.commit).not.toHaveBeenCalled();
    });

    test('should handle and log critical failures', async () => {
        const context = createBaseContext();
        const testError = new Error('Test Failure');
        context.SystemControl.isUserEnabled.mockRejectedValue(testError);

        vm.createContext(context);
        await vm.runInContext(fileContent, context);

        expect(context.console.error).toHaveBeenCalledWith(
            expect.stringContaining('Critical Failure in Monexa Initialization:'),
            testError
        );
        expect(context.Logger.error).toHaveBeenCalledWith('Critical Init Failure: Test Failure');
    });

    test('should not call Logger.error on critical failure if chrome.runtime.id is missing at that moment', async () => {
        const context = createBaseContext();
        const testError = new Error('Test Failure');

        // Let it throw an error inside the try block
        context.SystemControl.isUserEnabled.mockRejectedValue(testError);
        // But also, delete chrome.runtime.id *after* it's checked, or just redefine the mock
        Object.defineProperty(context.chrome, 'runtime', {
            get: jest.fn().mockReturnValueOnce({ id: 'test' }).mockReturnValueOnce({})
        });

        vm.createContext(context);
        await vm.runInContext(fileContent, context);

        expect(context.console.error).toHaveBeenCalledWith(
            expect.stringContaining('Critical Failure in Monexa Initialization:'),
            testError
        );
        expect(context.Logger.error).not.toHaveBeenCalled();
    });
});
