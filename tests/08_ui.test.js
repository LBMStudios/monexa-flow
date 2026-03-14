const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('UI', () => {
    let UI;
    let context;
    let mockContainer;

    beforeEach(() => {
        const filePath = path.join(__dirname, '../extension/src/08_ui.js');
        const fileContent = fs.readFileSync(filePath, 'utf8');

        mockContainer = {
            innerHTML: ''
        };

        context = {
            document: {
                getElementById: jest.fn().mockImplementation((id) => {
                    if (id === 'mx-admin-user-list') {
                        return mockContainer;
                    }
                    return null;
                })
            },
            console: console,
            KEYS: { USERS: 'USERS_KEY' },
            DataCore: {
                sanitizeText: jest.fn(text => "SANITIZED_" + text)
            },
            DB_Engine: {
                fetch: jest.fn()
            }
        };

        vm.createContext(context);

        const wrapper = `
            ${fileContent}
            globalThis.UI = UI;
        `;

        vm.runInContext(wrapper, context);
        UI = context.UI;
    });

    describe('refreshAdminUserList', () => {
        test('should handle DB_Engine.fetch throwing an error', async () => {
            const testError = new Error('Database connection failed');
            context.DB_Engine.fetch.mockRejectedValue(testError);

            await UI.refreshAdminUserList();

            expect(context.DB_Engine.fetch).toHaveBeenCalledWith('USERS_KEY', []);
            expect(mockContainer.innerHTML).toContain('Error al cargar: SANITIZED_Database connection failed');
            expect(context.DataCore.sanitizeText).toHaveBeenCalledWith('Database connection failed');
        });
    });
});
