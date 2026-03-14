const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('DB_Engine.fetch', () => {
    let sandbox;
    let chromeMock;
    let consoleMock;
    let DB_Engine;
    let indexedDBMock;

    beforeEach(() => {
        // Mocking chrome.storage.local
        chromeMock = {
            storage: {
                local: {
                    get: jest.fn(),
                    set: jest.fn(),
                    remove: jest.fn(),
                    clear: jest.fn()
                }
            },
            runtime: {
                lastError: undefined
            }
        };

        // Mocking console
        consoleMock = {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        };

        // Mocking indexedDB
        indexedDBMock = {
            open: jest.fn()
        };

        // Reading the source code and converting `const DB_Engine` to `var DB_Engine` to ensure it attaches to sandbox
        const dbJsPath = path.resolve(__dirname, '../extension/src/01_db.js');
        let dbJsCode = fs.readFileSync(dbJsPath, 'utf-8');
        dbJsCode = dbJsCode.replace('const DB_Engine = {', 'var DB_Engine = {');

        // Setting up the sandbox
        sandbox = {
            chrome: chromeMock,
            console: consoleMock,
            indexedDB: indexedDBMock,
            KEYS: {},
            confirm: jest.fn(),
            window: { location: { reload: jest.fn() } },
            Promise: Promise,
            Object: Object,
            Error: Error
        };

        vm.createContext(sandbox);
        vm.runInContext(dbJsCode, sandbox);

        DB_Engine = sandbox.DB_Engine;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should successfully fetch a value from chrome.storage.local after migration check', async () => {
        const mockKey = 'myKey';
        const mockValue = 'myValue';

        // 1st get: check if migrated -> true
        chromeMock.storage.local.get.mockImplementationOnce((keys, cb) => {
            cb({ _mx_idb_migrated: true });
        });

        // 2nd get: fetch the actual value
        chromeMock.storage.local.get.mockImplementationOnce((keys, cb) => {
            cb({ [mockKey]: mockValue });
        });

        const result = await DB_Engine.fetch(mockKey);

        expect(result).toBe(mockValue);
        expect(chromeMock.storage.local.get).toHaveBeenCalledTimes(2);
        expect(chromeMock.storage.local.get).toHaveBeenNthCalledWith(2, [mockKey], expect.any(Function));
    });

    it('should return fallback when key does not exist in chrome.storage.local', async () => {
        const mockKey = 'missingKey';
        const fallback = 'defaultFallback';

        // 1st get: check if migrated -> true
        chromeMock.storage.local.get.mockImplementationOnce((keys, cb) => {
            cb({ _mx_idb_migrated: true });
        });

        // 2nd get: fetch the actual value -> missing
        chromeMock.storage.local.get.mockImplementationOnce((keys, cb) => {
            cb({});
        });

        const result = await DB_Engine.fetch(mockKey, fallback);

        expect(result).toBe(fallback);
    });

    it('should return fallback and log error when chrome.runtime.lastError occurs', async () => {
        const mockKey = 'errorKey';
        const fallback = 'errorFallback';
        const mockError = new Error('Storage error');

        // 1st get: check if migrated -> true
        chromeMock.storage.local.get.mockImplementationOnce((keys, cb) => {
            cb({ _mx_idb_migrated: true });
        });

        // 2nd get: simulate lastError
        chromeMock.storage.local.get.mockImplementationOnce((keys, cb) => {
            chromeMock.runtime.lastError = mockError;
            cb({});
            chromeMock.runtime.lastError = undefined; // cleanup
        });

        const result = await DB_Engine.fetch(mockKey, fallback);

        expect(result).toBe(fallback);
        expect(consoleMock.error).toHaveBeenCalledWith("DB_Engine.fetch error:", mockError);
    });

    it('should return fallback when an exception is thrown in fetch', async () => {
        const mockKey = 'exceptionKey';
        const fallback = 'exceptionFallback';
        const testError = new Error('Test Exception');

        // Force _migrateFromIndexedDB to throw to trigger catch block in fetch
        const originalMigrate = DB_Engine._migrateFromIndexedDB;
        DB_Engine._migrateFromIndexedDB = jest.fn().mockRejectedValue(testError);

        const result = await DB_Engine.fetch(mockKey, fallback);

        expect(result).toBe(fallback);
        expect(consoleMock.error).toHaveBeenCalledWith("DB_Engine.fetch falló para la llave:", mockKey, testError);

        // Restore
        DB_Engine._migrateFromIndexedDB = originalMigrate;
    });

    it('should run migration if not already migrated (IndexedDB NO_DATA scenario)', async () => {
        const mockKey = 'myKey';
        const mockValue = 'myValue';

        // 1st get: check if migrated -> false
        chromeMock.storage.local.get.mockImplementationOnce((keys, cb) => {
            cb({ _mx_idb_migrated: undefined });
        });

        // Mock IndexedDB open to trigger onupgradeneeded (NO_DATA scenario)
        indexedDBMock.open.mockImplementation((name, version) => {
            const request = {};
            setTimeout(() => {
                if (request.onupgradeneeded) {
                    request.onupgradeneeded({
                        target: {
                            transaction: {
                                abort: jest.fn()
                            }
                        }
                    });
                }
            }, 0);
            return request;
        });

        // Mock storage.local.set for the fallback "migrated=true" marker
        chromeMock.storage.local.set.mockImplementation((data, cb) => cb());

        // 2nd get (from fetch): actual value
        chromeMock.storage.local.get.mockImplementationOnce((keys, cb) => {
            cb({ [mockKey]: mockValue });
        });

        const result = await DB_Engine.fetch(mockKey);

        expect(result).toBe(mockValue);
        // Verify that migration set the _mx_idb_migrated flag
        expect(chromeMock.storage.local.set).toHaveBeenCalledWith({ '_mx_idb_migrated': true }, expect.any(Function));
    });
});
