const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('UI.refreshRulesList', () => {
    let UI;
    let context;

    beforeEach(() => {
        const filePath = path.join(__dirname, '../extension/src/08_ui.js');
        const fileContent = fs.readFileSync(filePath, 'utf8');

        context = {
            console: {
                log: jest.fn(),
                warn: jest.fn(),
                error: jest.fn()
            },
            document: {
                getElementById: jest.fn(),
                querySelectorAll: jest.fn()
            },
            KEYS: {
                RULES: 'RULES'
            },
            RULE_COLORS: {
                verde: { hex: '#00FF00', label: 'Verde' }
            },
            DB_Engine: {
                fetch: jest.fn(),
                commit: jest.fn()
            },
            Scanner: {
                reprocess: jest.fn()
            }
        };

        vm.createContext(context);
        const wrapper = `
            ${fileContent.replace('const UI = {', 'var UI = {')}
            globalThis.UI = UI;
        `;
        vm.runInContext(wrapper, context);
        UI = context.UI;
    });

    test('should delete rule properly, wait for refresh and trigger reprocess', async () => {
        // Let's create a spy for UI.refreshRulesList because it will be called inside the onclick
        const refreshSpy = jest.spyOn(UI, 'refreshRulesList');

        // Mock rules
        const mockRules = [{ pattern: 'rule1' }, { pattern: 'rule2' }, { pattern: 'rule3' }];
        context.DB_Engine.fetch.mockResolvedValue(mockRules);

        const mockListDiv = { innerHTML: '' };
        context.document.getElementById.mockImplementation(id => {
            if (id === 'mx-rules-list') return mockListDiv;
            return null;
        });

        const mockBtn = {
            getAttribute: jest.fn().mockReturnValue('1'),
            onclick: null
        };
        context.document.querySelectorAll.mockImplementation(selector => {
            if (selector === '.mx-btn-delete-rule') return [mockBtn];
            return [];
        });

        // Call the method
        await UI.refreshRulesList();

        // Execute the click
        expect(typeof mockBtn.onclick).toBe('function');

        // We will fetch rules again when deleting
        const currentRules = [{ pattern: 'rule1' }, { pattern: 'rule2' }, { pattern: 'rule3' }];
        context.DB_Engine.fetch.mockResolvedValueOnce(currentRules);

        await mockBtn.onclick();

        // Should commit rules with the second one deleted
        expect(context.DB_Engine.commit).toHaveBeenCalledWith('RULES', [
            { pattern: 'rule1' },
            { pattern: 'rule3' }
        ]);

        // refreshRulesList should have been called again
        expect(refreshSpy).toHaveBeenCalled();

        // Scanner should have been reprocessed
        expect(context.Scanner.reprocess).toHaveBeenCalled();
    });

    test('should not throw error if Scanner is not defined', async () => {
        // Re-inject without Scanner
        delete context.Scanner;
        const filePath = path.join(__dirname, '../extension/src/08_ui.js');
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const wrapper = `
            ${fileContent.replace('const UI = {', 'var UI = {')}
            globalThis.UI = UI;
        `;
        vm.runInContext(wrapper, context);
        UI = context.UI;

        const mockRules = [{ pattern: 'rule1' }, { pattern: 'rule2' }];
        context.DB_Engine.fetch.mockResolvedValue(mockRules); // Mock return value

        const mockListDiv = { innerHTML: '' };
        context.document.getElementById.mockReturnValue(mockListDiv);

        const mockBtn = {
            getAttribute: jest.fn().mockReturnValue('0'),
            onclick: null
        };
        context.document.querySelectorAll.mockReturnValue([mockBtn]);

        await UI.refreshRulesList();

        context.DB_Engine.fetch.mockResolvedValueOnce([{ pattern: 'rule1' }, { pattern: 'rule2' }]); // Fetch during delete

        // This should not throw an error
        await expect(mockBtn.onclick()).resolves.not.toThrow();
    });
});
