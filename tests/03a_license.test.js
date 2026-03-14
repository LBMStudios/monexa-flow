const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('LicenseSystem._calculatePermanentKey', () => {
    let LicenseSystem;
    let mockCrypto;

    beforeEach(() => {
        const filePath = path.join(__dirname, '../extension/src/03a_license.js');
        const fileContent = fs.readFileSync(filePath, 'utf8');

        mockCrypto = {
            subtle: {
                digest: jest.fn()
            }
        };

        const context = {
            console: console,
            crypto: mockCrypto,
            TextEncoder: class {
                encode(str) {
                    return Buffer.from(str);
                }
            },
            Uint8Array: Uint8Array,
            Array: Array,
            Buffer: Buffer
        };

        vm.createContext(context);

        const wrapper = `
            ${fileContent}
            globalThis.LicenseSystem = LicenseSystem;
        `;

        vm.runInContext(wrapper, context);
        LicenseSystem = context.LicenseSystem;

        if (!LicenseSystem) {
            LicenseSystem = vm.runInContext(fileContent + '; LicenseSystem;', context);
        }

        if (!LicenseSystem) {
            throw new Error('LicenseSystem was not defined in the VM context');
        }
    });

    test('should return null if crypto.subtle.digest throws an error', async () => {
        // Mock the digest function to reject with an error
        mockCrypto.subtle.digest.mockRejectedValue(new Error('Mock crypto error'));

        const result = await LicenseSystem._calculatePermanentKey('TEST-ID', 'TEST-USER');

        expect(result).toBeNull();
        expect(mockCrypto.subtle.digest).toHaveBeenCalled();
    });

    test('should return 10-character key on success', async () => {
        // Mock the digest function to return a predefined ArrayBuffer
        // The hex representation of this buffer will be used
        // Let's use a buffer that produces hex: "00112233445566778899aabbccddeeff"
        const mockHashArray = [
            0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77,
            0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff
        ];
        const mockBuffer = new Uint8Array(mockHashArray).buffer;
        mockCrypto.subtle.digest.mockResolvedValue(mockBuffer);

        const result = await LicenseSystem._calculatePermanentKey('TEST-ID', 'TEST-USER');

        // The algorithm takes substring(5, 15) of the upper-cased hex string
        // "00112233445566778899aabbccddeeff".toUpperCase()
        // = "00112233445566778899AABBCCDDEEFF"
        // substring(5, 15):
        // index 0: '0'
        // index 1: '0'
        // index 2: '1'
        // index 3: '1'
        // index 4: '2'
        // index 5: '2' -> start
        // index 6: '3'
        // index 7: '3'
        // index 8: '4'
        // index 9: '4'
        // index 10: '5'
        // index 11: '5'
        // index 12: '6'
        // index 13: '6'
        // index 14: '7' -> end before 15
        // Expect: "2334455667"
        expect(result).toBe("2334455667");
        expect(mockCrypto.subtle.digest).toHaveBeenCalled();
    });
});
