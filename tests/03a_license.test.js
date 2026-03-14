const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('LicenseSystem', () => {
    let LicenseSystem;
    let mockDB_Engine;

    beforeAll(() => {
        const filePath = path.join(__dirname, '../extension/src/03a_license.js');
        const fileContent = fs.readFileSync(filePath, 'utf8');

        mockDB_Engine = {
            fetch: jest.fn(),
            commit: jest.fn()
        };

        const context = {
            console: {
                log: jest.fn(),
                error: jest.fn()
            },
            DB_Engine: mockDB_Engine,
            KEYS: { LICENSE: 'LICENSE' },
            TextEncoder: class {
                encode(str) {
                    return Buffer.from(str);
                }
            },
            crypto: {
                subtle: {
                    digest: jest.fn(async (algorithm, data) => {
                        // Return a simple dummy hash buffer
                        return new Uint8Array(32).buffer;
                    })
                }
            }
        };

        vm.createContext(context);

        const wrapper = `
            ${fileContent}
            globalThis.LicenseSystem = LicenseSystem;
        `;

        vm.runInContext(wrapper, context);
        LicenseSystem = context.LicenseSystem;

        if (!LicenseSystem) {
            throw new Error('LicenseSystem was not defined in the VM context');
        }
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('activate', () => {
        it('should return error if username is not provided', async () => {
            const result = await LicenseSystem.activate(null, 'KEY123');
            expect(result).toEqual({ success: false, error: "Nombre requerido" });
        });

        it('should return success if key is correct', async () => {
            // Mock getInstallationID logic
            mockDB_Engine.fetch.mockResolvedValue({ installID: 'ABC-123-XYZ', activeLicenses: {} });

            // Mock the key generation
            // The dummy digest returns an array of 32 zeros.
            // Map to hex gives '00' 32 times.
            // substring(5, 15) gives '0000000000'.
            const expectedKey = '0000000000';

            mockDB_Engine.commit.mockResolvedValue(true);

            const result = await LicenseSystem.activate('USER1', expectedKey);
            expect(result).toEqual({ success: true });

            expect(mockDB_Engine.commit).toHaveBeenCalledWith('LICENSE', {
                installID: 'ABC-123-XYZ',
                activeLicenses: {
                    'USER1': expectedKey
                }
            });
        });

        it('should return error if key is incorrect', async () => {
            mockDB_Engine.fetch.mockResolvedValue({ installID: 'ABC-123-XYZ', activeLicenses: {} });

            const result = await LicenseSystem.activate('USER1', 'WRONG_KEY');
            expect(result).toEqual({ success: false, error: "Llave incorrecta para este ID y Nombre." });
        });

        it('should catch exceptions and return error object with message (e.g. key is null)', async () => {
            mockDB_Engine.fetch.mockResolvedValue({ installID: 'ABC-123-XYZ', activeLicenses: {} });

            // Passing null for key will throw an error at key.trim()
            const result = await LicenseSystem.activate('USER1', null);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(typeof result.error).toBe('string');
            expect(result.error).toMatch(/Cannot read properties of null|key is null/i);
        });
    });
});
