const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Logger Module', () => {
    let context;
    let mockFetch;
    let mockCommit;

    beforeEach(() => {
        // Create mocks for the DB_Engine
        mockFetch = jest.fn();
        mockCommit = jest.fn();

        // Create the execution context matching the extension environment
        context = {
            console: {
                error: jest.fn(),
                log: jest.fn()
            },
            VERSION: '1.0.0',
            KEYS: {
                LOGS: 'test_logs_key'
            },
            DB_Engine: {
                fetch: mockFetch,
                commit: mockCommit
            }
        };

        vm.createContext(context);

        // Load the logger code into the context
        const codePath = path.join(__dirname, '../extension/src/02_logger.js');
        const code = fs.readFileSync(codePath, 'utf8');

        // We need to allow the module to define variables in the context
        const codeWithExport = code + ';\ncontext.Logger = Logger;';
        context.context = context; // self reference to export
        vm.runInContext(codeWithExport, context);
    });

    test('should write a basic log entry correctly', async () => {
        // Setup mock to return an empty array initially
        mockFetch.mockResolvedValue([]);
        mockCommit.mockResolvedValue(true);

        const { Logger } = context;

        await Logger.write('Test message', 'INFO', 'test_action');

        // Check if fetch was called with correct key and default value
        expect(mockFetch).toHaveBeenCalledWith('test_logs_key', []);

        // Check if commit was called with the updated array and "false" as 3rd arg
        expect(mockCommit).toHaveBeenCalled();
        const commitCall = mockCommit.mock.calls[0];
        expect(commitCall[0]).toBe('test_logs_key');
        expect(commitCall[1].length).toBe(1);
        expect(commitCall[2]).toBe(false);

        const entry = commitCall[1][0];
        expect(entry.msg).toBe('Test message');
        expect(entry.level).toBe('INFO');
        expect(entry.action).toBe('test_action');
        expect(entry.version).toBe('1.0.0');
        expect(entry.timestamp).toBeDefined();
    });

    test('should slice the array when it exceeds MAX_ENTRIES', async () => {
        const { Logger } = context;

        // Create an array that is exactly at MAX_ENTRIES
        const existingLogs = [];
        for (let i = 0; i < Logger.MAX_ENTRIES; i++) {
            existingLogs.push({ msg: `Old log ${i}`, level: 'INFO' });
        }

        mockFetch.mockResolvedValue(existingLogs);
        mockCommit.mockResolvedValue(true);

        await Logger.write('New overflow message');

        expect(mockFetch).toHaveBeenCalled();
        expect(mockCommit).toHaveBeenCalled();

        const commitLogs = mockCommit.mock.calls[0][1];

        // The array shouldn't exceed MAX_ENTRIES
        expect(commitLogs.length).toBe(Logger.MAX_ENTRIES);

        // The new log should be at the beginning (unshift)
        expect(commitLogs[0].msg).toBe('New overflow message');

        // The old logs shift down, so the log that was at index 0 is now at index 1
        expect(commitLogs[1].msg).toBe('Old log 0');

        // The last log should be the one that was at index MAX_ENTRIES - 2
        // Since the array length is capped at MAX_ENTRIES, the previous last log is dropped.
        expect(commitLogs[Logger.MAX_ENTRIES - 1].msg).toBe(`Old log ${Logger.MAX_ENTRIES - 2}`);
    });

    test('should fail silently if fetch returns non-array', async () => {
        // Mock fetch returning a corrupted value (null or object)
        mockFetch.mockResolvedValue(null);
        mockCommit.mockResolvedValue(true);

        const { Logger, console } = context;

        // unshift on null throws a TypeError inside Logger.write,
        // which is caught silently.
        await Logger.write('Test recovery');

        // Commit should not be called because it throws before commit
        expect(mockCommit).not.toHaveBeenCalled();

        // console.error is NOT called based on current code
        expect(console.error).not.toHaveBeenCalled();
    });

    test('should handle commit errors gracefully without logging', async () => {
        mockFetch.mockResolvedValue([]);
        mockCommit.mockRejectedValue(new Error('DB Commit Failed'));

        const { Logger, console } = context;

        // The write function catches the error so it shouldn't throw
        await expect(Logger.write('Fail message')).resolves.toBeUndefined();

        // Based on the provided snippet, errors are swallowed: catch(e) { /* Failsafe */ }
        expect(console.error).not.toHaveBeenCalled();
    });

    test('helper methods info, warn, error should map to write correctly', async () => {
        mockFetch.mockResolvedValue([]);
        mockCommit.mockResolvedValue(true);

        const { Logger } = context;

        await Logger.info('Info msg', 'action1');
        expect(mockCommit.mock.calls[0][1][0].level).toBe('INFO');
        expect(mockCommit.mock.calls[0][1][0].msg).toBe('Info msg');

        mockCommit.mockClear();
        mockFetch.mockResolvedValue([]);
        await Logger.warn('Warn msg', 'action2');
        expect(mockCommit.mock.calls[0][1][0].level).toBe('WARN');
        expect(mockCommit.mock.calls[0][1][0].msg).toBe('Warn msg');

        mockCommit.mockClear();
        mockFetch.mockResolvedValue([]);
        await Logger.error('Error msg', 'action3');
        expect(mockCommit.mock.calls[0][1][0].level).toBe('ERROR');
        expect(mockCommit.mock.calls[0][1][0].msg).toBe('Error msg');
    });
});
