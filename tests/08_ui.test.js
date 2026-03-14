const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

describe('08_ui.js UI.renderControlCenter - Search Input', () => {
    let UI;
    let document;
    let window;

    beforeAll(() => {
        const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
        document = dom.window.document;
        window = dom.window;

        const filePath = path.join(__dirname, '../extension/src/08_ui.js');
        const fileContent = fs.readFileSync(filePath, 'utf8');

        // Mock dependencies
        const context = {
            document: document,
            window: window,
            console: console,
            setTimeout: setTimeout,
            alert: () => {},
            chrome: { runtime: { sendMessage: jest.fn() } },
            KEYS: { SETTINGS: 'settings', TRANSACTIONS: 'transactions', RULES: 'rules', USERS: 'users', SYSTEM_STATE: 'system_state', LICENSE: 'license' },
            PALETTE: { itau_orange: '#f00', itau_blue_dark: '#00f', success: '#0f0', amber: '#ff0', rose: '#f00' },
            STATUS_MAP: {
                PENDING: { id: 'PENDING', color: '#ccc', icon: '?' },
                VALID: { id: 'VERDE', color: '#0f0', icon: 'v' }
            },
            RULE_COLORS: { verde: { hex: '#0f0', label: 'Verde' } },
            DB_Engine: {
                fetch: jest.fn(async (key) => {
                    if (key === 'settings') return { role: 'user', user: 'testuser' };
                    if (key === 'transactions') return { items: {} };
                    if (key === 'rules') return [];
                    if (key === 'users') return [];
                    return {};
                }),
                commit: jest.fn(),
                purge: jest.fn()
            },
            LicenseSystem: {
                getInstallationID: jest.fn(async () => '1234'),
                isActivated: jest.fn(async () => true)
            },
            SystemControl: {
                isEnabled: jest.fn(async () => true),
                setEnabled: jest.fn(),
                toggle: jest.fn()
            },
            DataCore: {
                sanitizeText: jest.fn(text => text),
                generateAuditSignature: jest.fn()
            },
            SearchMaster: {
                query: jest.fn(async (value) => {
                    if (value === "test") {
                        return [
                            { _hash: '123', concepto: 'test concept', status: 'VERDE', tag: 'tag', note: 'note' }
                        ];
                    }
                    return [];
                })
            },
            FileSystem: {
                exportRules: jest.fn(),
                importExternalCSV: jest.fn(),
                exportAuditory: jest.fn()
            },
            Logger: {
                info: jest.fn()
            },
            Scanner: {
                reprocess: jest.fn()
            }
        };

        vm.createContext(context);
        const wrapper = `
            ${fileContent}
            globalThis.UI = UI;
        `;
        vm.runInContext(wrapper, context);
        UI = context.UI;
        if (!UI) {
            UI = vm.runInContext(fileContent + '; UI;', context);
        }
    });

    beforeEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    test('Search input should clear results if value length is < 2', async () => {
        await UI.renderControlCenter();

        const searchInput = document.getElementById('mx-search-input');
        const resultsDiv = document.getElementById('mx-search-results');

        expect(searchInput).not.toBeNull();
        expect(resultsDiv).not.toBeNull();

        // Put some dummy content in results to see if it clears
        resultsDiv.innerHTML = "<div>old results</div>";

        // Trigger oninput with length < 2
        await searchInput.oninput({ target: { value: "a" } });

        expect(resultsDiv.innerHTML).toBe("");

        // Trigger oninput with length < 2 (empty)
        resultsDiv.innerHTML = "<div>old results</div>";
        await searchInput.oninput({ target: { value: "" } });

        expect(resultsDiv.innerHTML).toBe("");
    });

    test('Search input should render results if value length is >= 2', async () => {
        await UI.renderControlCenter();

        const searchInput = document.getElementById('mx-search-input');
        const resultsDiv = document.getElementById('mx-search-results');

        // Trigger oninput with length >= 2
        await searchInput.oninput({ target: { value: "test" } });

        // Since SearchMaster.query is mocked to return 1 item for "test"
        expect(resultsDiv.innerHTML).toContain("test concept");
        expect(resultsDiv.innerHTML).toContain("#0f0"); // color of VERDE status map in mock
    });
});
