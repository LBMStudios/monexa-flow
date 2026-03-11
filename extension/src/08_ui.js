/**
 * 08_ui.js — MONEXA FLOW
 * Interfaz de usuario maestra (UI Factory).
 * Genera el panel lateral de control, el botón flotante, el dashboard de estadísticas
 * y el overlay de bienvenida. Orquesta la inicialización del sistema.
 *
 * Depende de: 00_config.js (KEYS, VERSION, PALETTE, STATUS_MAP)
 *             01_db.js (DB_Engine), 02_logger.js (Logger),
 *             03_system.js (SystemControl), 04_data.js (DataCore),
 *             06_scanner.js (Scanner), 07_search.js (SearchMaster),
 *             05_filesystem.js (FileSystem)
 */

'use strict';

const UI = {
    stylesInjected: false,

    /**
     * Punto de entrada del sistema de UI.
     * Si no hay usuario configurado muestra el onboarding, si no, levanta el panel.
     */
    async init() {
        UIStyles.inject();

        // V2 — Sincronizar usuarios desde la nube si hay una URL configurada
        if (typeof CloudConnector !== 'undefined') {
            await CloudConnector.syncRemoteUsers();
        }

        // Obtener configuración. Usamos fallback para evitar errores si no existe
        const config = await DB_Engine.fetch(KEYS.SETTINGS, { user: "" });

        // Si el usuario existe y no está vacío, cargamos normal. Si no, bienvenida.
        if (config && config.user && config.user !== "") {
            if (window === window.top) {
                await this.renderControlCenter();
                this.renderLauncher();
            }
            await Scanner.init();
        } else {
            if (window === window.top) {
                UILogin.renderWelcome();
            }
        }
    },

    /**
     * Inyecta el CSS global del sistema en <head> (solo una vez).
     */
    injectGlobalStyles() {
        if (this.stylesInjected || document.getElementById("mx-global-styles")) return;

        const css = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

            #mx-master-launcher {
                position: fixed;
                bottom: 30px;
                right: 30px;
                width: 64px;
                height: 64px;
                background: ${PALETTE.itau_orange};
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 99999;
                cursor: pointer;
                box-shadow: 0 0 20px rgba(236,112,0,0.4), 0 10px 25px -5px rgba(0,0,0,0.4);
                border: 3px solid rgba(255,255,255,0.15);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                font-family: 'Inter', sans-serif;
                font-weight: 700;
                font-size: 20px;
                user-select: none;
            }

            #mx-master-launcher:hover {
                transform: scale(1.1) rotate(5deg);
                background: ${PALETTE.itau_orange_hover};
                box-shadow: 0 0 30px rgba(236,112,0,0.6), 0 10px 30px -5px rgba(0,0,0,0.5);
            }

            #mx-launcher-wrapper {
                position: fixed;
                bottom: 30px;
                right: 30px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 6px;
                z-index: 99999;
            }

            #mx-account-chip {
                background: rgba(236,112,0,0.85);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                color: white;
                font-family: 'Inter', sans-serif;
                font-size: 10px;
                font-weight: 700;
                padding: 3px 8px;
                border-radius: 20px;
                white-space: nowrap;
                max-width: 140px;
                overflow: hidden;
                text-overflow: ellipsis;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                border: 1px solid rgba(255,255,255,0.15);
                letter-spacing: 0.04em;
                opacity: 0;
                transform: translateY(4px);
                transition: opacity 0.3s ease, transform 0.3s ease;
                pointer-events: none;
            }

            #mx-account-chip.visible {
                opacity: 1;
                transform: translateY(0);
            }

            #mx-control-panel {
                position: fixed;
                top: 0;
                right: -420px;
                width: 400px;
                height: 100vh;
                background: rgba(15, 20, 35, 0.92);
                backdrop-filter: blur(24px) saturate(1.5);
                -webkit-backdrop-filter: blur(24px) saturate(1.5);
                z-index: 100000;
                box-shadow: -20px 0 60px rgba(0,0,0,0.5);
                border-left: 1px solid rgba(255,255,255,0.06);
                transition: right 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                flex-direction: column;
                font-family: 'Inter', sans-serif;
            }

            #mx-control-panel.active {
                right: 0;
            }

            .mx-header {
                background: ${PALETTE.itau_orange};
                color: white;
                padding: 40px 25px;
            }

            .mx-header h2 {
                margin: 0;
                font-size: 24px;
                font-weight: 700;
                letter-spacing: -0.5px;
            }

            .mx-content {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
                background: transparent;
            }

            .mx-card {
                background: rgba(255,255,255,0.04);
                border-radius: 14px;
                padding: 20px;
                margin-bottom: 16px;
                border: 1px solid rgba(255,255,255,0.08);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
            }

            .mx-card h4 {
                margin: 0 0 15px 0;
                font-size: 12px;
                text-transform: uppercase;
                color: rgba(255,255,255,0.45);
                letter-spacing: 0.08em;
                font-weight: 700;
            }

            .mx-btn-action {
                width: 100%;
                padding: 12px;
                border-radius: 10px;
                border: 1px solid rgba(255,255,255,0.08);
                background: ${PALETTE.itau_orange};
                color: white;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.25s;
                font-size: 13px;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                font-family: 'Inter', sans-serif;
            }

            .mx-btn-action:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 16px rgba(236,112,0,0.3);
            }

            .mx-btn-secondary {
                background: rgba(255,255,255,0.08);
                border: 1px solid rgba(255,255,255,0.12);
            }

            .mx-btn-secondary:hover {
                background: rgba(255,255,255,0.14);
            }

            .mx-btn-outline {
                background: rgba(255,255,255,0.05);
                color: rgba(255,255,255,0.8);
                border: 1px solid rgba(255,255,255,0.12);
            }

            .mx-btn-outline:hover {
                background: rgba(255,255,255,0.1);
            }

            .mx-stat-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 10px;
            }

            .mx-stat-item {
                text-align: center;
                padding: 15px 5px;
                border-radius: 12px;
                color: white;
                border: 1px solid rgba(255,255,255,0.08);
            }

            .mx-search-box {
                width: 100%;
                padding: 12px;
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 10px;
                margin-bottom: 10px;
                font-size: 14px;
                box-sizing: border-box;
                background: rgba(255,255,255,0.05);
                color: white;
                font-family: 'Inter', sans-serif;
                transition: border-color 0.2s;
            }

            .mx-search-box::placeholder {
                color: rgba(255,255,255,0.3);
            }

            .mx-search-box:focus {
                outline: none;
                border-color: ${PALETTE.itau_orange};
                background: rgba(255,255,255,0.08);
            }

            .mx-badge {
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 700;
                background: rgba(255,255,255,0.1);
                color: rgba(255,255,255,0.7);
            }

            /* Custom scrollbar for dark theme */
            .mx-content::-webkit-scrollbar { width: 4px; }
            .mx-content::-webkit-scrollbar-track { background: transparent; }
            .mx-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
            .mx-content::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        `;

        const styleSheet = document.createElement("style");
        styleSheet.id = "mx-global-styles";
        styleSheet.innerText = css;
        document.head.appendChild(styleSheet);
        this.stylesInjected = true;
    },

    /**
     * Renderiza el botón flotante "MX" (launcher) en la página del banco.
     * Incluye un chip encima del botón que muestra el número de cuenta detectado.
     */
    renderLauncher() {
        const existingWrapper = document.getElementById("mx-launcher-wrapper");
        if (existingWrapper) existingWrapper.remove();
        const existingBtn = document.getElementById("mx-master-launcher");
        if (existingBtn) existingBtn.remove();

        // Wrapper que contiene chip + botón en columna
        const wrapper = document.createElement('div');
        wrapper.id = "mx-launcher-wrapper";

        const chip = document.createElement('div');
        chip.id = "mx-account-chip";
        chip.textContent = "";
        const btn = document.createElement('div');
        btn.id = "mx-master-launcher";
        btn.innerHTML = "MX";
        btn.title = "Abrir panel Monexa";
        // El botón va dentro del wrapper pero necesita su propio positioning relativo
        btn.style.cssText = `
            position: relative;
            bottom: auto;
            right: auto;
            width: 64px;
            height: 64px;
            background: ${PALETTE.itau_orange};
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 0 20px rgba(236, 112, 0, 0.4), 0 10px 25px -5px rgba(0, 0, 0, 0.4);
            border: 3px solid rgba(255, 255, 255, 0.15);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: 'Inter', sans-serif;
            font-weight: 700;
            font-size: 20px;
            user-select: none;
        `;

        btn.onmouseenter = () => { btn.style.background = PALETTE.itau_orange_hover; btn.style.transform = 'scale(1.1) rotate(5deg)'; };
        btn.onmouseleave = () => { btn.style.background = PALETTE.itau_orange; btn.style.transform = ''; };

        wrapper.appendChild(chip);
        wrapper.appendChild(btn);
        document.body.appendChild(wrapper);

        btn.onclick = async () => {
            const panel = document.getElementById('mx-control-panel');
            if (!panel) return;

            panel.classList.toggle('active');
            if (panel.classList.contains('active')) {
                await this.refreshDashboard();
                await this.refreshSystemToggleButton();
            }
        };
    },

    /**
     * Actualiza el chip de número de cuenta sobre el botón flotante.
     * Llamado por Scanner.processDOM() cuando detecta la cuenta activa.
     * @param {string|null} accountInfo - Número o nombre de cuenta, o null para ocultar.
     */
    updateLauncherAccount(accountInfo) {
        const chip = document.getElementById('mx-account-chip');
        if (!chip) return;

        if (accountInfo) {
            chip.textContent = accountInfo;
            chip.classList.add('visible');
            chip.title = `Cuenta detectada: ${accountInfo} `;
        } else {
            chip.classList.remove('visible');
        }
    },

    /**
     * Renderiza el botón flotante en modo "OFF" cuando el sistema está desactivado.
     */
    renderDisabledLauncher() {
        this.injectGlobalStyles();

        const existing = document.getElementById("mx-master-launcher") || document.getElementById("mx-disabled-launcher");
        if (existing) existing.remove();

        const l = document.createElement('div');
        l.id = "mx-disabled-launcher";
        l.innerHTML = `
            <div style="width:24px; height:24px; background:white; border-radius:50%; position:absolute; left:4px; box-shadow:0 2px 5px rgba(0,0,0,0.2); transition:left 0.3s cubic-bezier(0.4, 0, 0.2, 1);"></div>
            <div style="font-size:11px; font-weight:700; color:white; margin-left:34px; letter-spacing:0.5px; transition:color 0.3s;">OFF</div>
        `;
        l.title = "Monexa desactivado. Click para activar.";
        l.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 76px;
            height: 32px;
            background: #64748b;
            border-radius: 20px;
            display: flex;
            align-items: center;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            border: 2px solid white;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 99999;
            font-family: 'Inter', sans-serif;
            user-select: none;
        `;
        document.body.appendChild(l);

        l.onmouseenter = () => { l.style.transform = 'scale(1.05)'; };
        l.onmouseleave = () => { l.style.transform = ''; };

        l.onclick = async () => {
            l.style.background = '#10b981';
            l.children[0].style.left = '44px';
            l.children[1].style.marginLeft = '12px';
            l.children[1].textContent = 'ON';

            await SystemControl.setEnabled(true);
            setTimeout(() => {
                alert("Monexa ha sido activado. La página se recargará.");
                window.location.reload();
            }, 300);
        };
    },

    /**
     * Construye y monta el panel lateral de control con todas sus secciones.
     */
    async renderControlCenter() {
        const config = await DB_Engine.fetch(KEYS.SETTINGS, {});
        const existing = document.getElementById("mx-control-panel");
        if (existing) existing.remove();

        const panel = document.createElement('div');
        panel.id = "mx-control-panel";

        panel.innerHTML = `
            <div class="mx-header" id="mx-panel-header" style="
                background: linear-gradient(135deg, ${PALETTE.itau_orange} 0%, ${PALETTE.itau_orange_hover} 100%);
                padding: 0;
                position: relative;
                overflow: hidden;
                cursor: pointer;
                user-select: none;
            ">
                <!-- Círculo decorativo de fondo -->
                <div style="
                    position: absolute; top: -30px; right: -30px;
                    width: 140px; height: 140px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 50%;
                    pointer-events: none;
                "></div>
                
                <!-- Contenido del header -->
                <div style="padding: 22px 20px 20px; position: relative; display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <svg width="24" height="24" viewBox="0 0 100 100" fill="none" stroke="white" stroke-width="6" style="opacity: 0.9;">
                            <ellipse cx="50" cy="50" rx="45" ry="18" transform="rotate(-30 50 50)" opacity="0.4" />
                            <ellipse cx="50" cy="50" rx="32" ry="13" transform="rotate(-30 50 50)" opacity="0.7" />
                            <ellipse cx="50" cy="50" rx="18" ry="7" transform="rotate(-30 50 50)" />
                        </svg>
                        <span style="
                            font-size: 11px; font-weight: 800;
                            color: white;
                            text-transform: uppercase; letter-spacing: 1.5px;
                        ">Monexa Flow</span>
                    </div>
                </div>

                <!-- Botón cerrar (esquina superior derecha) -->
                <button id="mx-panel-close" style="
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    background: rgba(255,255,255,0.15);
                    border: 1px solid rgba(255,255,255,0.2);
                    color: white;
                    width: 28px; height: 28px;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    transition: all 0.2s;
                    z-index: 100;
                " onmouseenter="this.style.background='rgba(255,255,255,0.3)'; this.style.transform='translateX(2px)';"
                   onmouseleave="this.style.background='rgba(255,255,255,0.15)'; this.style.transform='';"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </button>

                <!-- Avatar + nombre auditor -->
                <div style="display: flex; align-items: center; gap: 14px; padding: 0 20px 25px;">
                    <div style="
                        width: 52px; height: 52px;
                        background: rgba(255,255,255,0.2);
                        border: 2px solid rgba(255,255,255,0.3);
                        border-radius: 50%;
                        display: flex; align-items: center; justify-content: center;
                        font-size: 22px; font-weight: 900; color: white;
                        flex-shrink: 0;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    ">${(config.user || "?")[0].toUpperCase()}</div>

                    <div>
                        <div style="font-size: 19px; font-weight: 800; color: white; letter-spacing: -0.4px; line-height: 1.1;">
                            ${(config.user || "Auditor").toUpperCase()}
                        </div>
                        <div style="font-size: 11px; color: rgba(255,255,255,0.8); margin-top: 4px; display: flex; align-items: center; gap: 6px;">
                            <span style="display: inline-block; width: 8px; height: 8px; background: #34d399; border-radius: 50%; box-shadow: 0 0 8px #34d399;"></span>
                            Sistema activo
                            <span style="opacity: 0.5; margin: 0 2px;">|</span>
                            <a id="mx-panel-logout" href="#" style="color: white; text-decoration: underline; font-weight: 600;">Salir</a>
                        </div>
                    </div>
                </div>

                <div style="position: absolute; bottom: 10px; right: 20px; font-size: 9px; color: rgba(255,255,255,0.4); font-weight: 700;">v${VERSION}</div>
            </div>

            <!-- Línea decorativa inferior -->
            <div style="height: 3px; background: linear-gradient(90deg, ${PALETTE.itau_blue}, ${PALETTE.itau_blue_dark}, transparent);"></div>

            <div class="mx-content">
                <!-- Control del sistema -->
                <div class="mx-card" style="padding: 18px 20px;">
                    <h4 style="margin-bottom: 12px;">Control del Sistema</h4>
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <div id="mx-toggle-label" style="font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.9);">Sistema ACTIVO</div>
                            <div id="mx-toggle-sub" style="font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 2px;">La extensión está escaneando</div>
                        </div>
                        <!-- Toggle slider -->
                        <div id="mx-toggle-track" style="
                            width: 48px; height: 26px;
                            background: #10b981;
                            border-radius: 99px;
                            position: relative;
                            cursor: pointer;
                            transition: background 0.3s ease;
                            flex-shrink: 0;
                        ">
                            <div id="mx-toggle-thumb" style="
                                position: absolute;
                                top: 3px; left: 24px;
                                width: 20px; height: 20px;
                                background: white;
                                border-radius: 50%;
                                box-shadow: 0 2px 6px rgba(0,0,0,0.25);
                                transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                            "></div>
                        </div>
                    </div>
                </div>

                <!-- Resumen de auditoría -->
                <div class="mx-card">
                    <h4>Resumen del Control</h4>
                    <div id="mx-dash-stats" class="mx-stat-grid">
                        <div class="mx-stat-item" style="background: ${PALETTE.success}">0<br><small>Validados</small></div>
                        <div class="mx-stat-item" style="background: ${PALETTE.amber}">0<br><small>Alertas</small></div>
                        <div class="mx-stat-item" style="background: ${PALETTE.rose}">0<br><small>Rojos</small></div>
                    </div>
                    <button id="mx-btn-open-dashboard" style="
                        width: 100%;
                        margin-top: 14px;
                        padding: 11px 14px;
                        background: linear-gradient(135deg, ${PALETTE.itau_blue}, ${PALETTE.itau_blue_dark});
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 12px;
                        font-weight: 700;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 7px;
                        letter-spacing: 0.3px;
                        font-family: 'Inter', sans-serif;
                        transition: opacity 0.2s;
                    " onmouseenter="this.style.opacity='0.88'" onmouseleave="this.style.opacity='1'">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                        Ver Dashboard Completo
                    </button>
                </div>

                <!-- Buscador de notas -->
                <div class="mx-card">
                    <h4>Buscador de Notas</h4>
                    <input
                        type="text"
                        id="mx-search-input"
                        class="mx-search-box"
                        placeholder="Filtrar por concepto o nota..."
                    >
                    <div id="mx-search-results" style="max-height: 150px; overflow-y: auto; font-size: 12px; color: rgba(255,255,255,0.6);"></div>
                </div>

                <!-- Motor de reglas -->
                <div class="mx-card">
                    <h4>Motor de Reglas</h4>
                    <input type="text" id="mx-rule-pat" class="mx-search-box" style="margin-bottom:5px;" placeholder="Si contiene...">
                    <input type="text" id="mx-rule-amt" class="mx-search-box" style="margin-bottom:5px;" placeholder="Importe exacto (opcional)">
                    <input type="text" id="mx-rule-lab" class="mx-search-box" placeholder="Etiquetar como...">
                    <div style="margin-bottom:10px;">
                        <div style="font-size:11px; color:rgba(255,255,255,0.4); margin-bottom:6px; font-weight:600;">Color de la etiqueta:</div>
                        <div id="mx-rule-colors" style="display:flex; flex-wrap:wrap; gap:6px;">
                            ${Object.entries(RULE_COLORS).map(([key, c]) => `
                                <div class="mx-color-dot" data-color="${key}" title="${c.label}" style="
                                    width:24px; height:24px;
                                    border-radius:50%;
                                    background:${c.hex};
                                    cursor:pointer;
                                    border:3px solid ${key === 'verde' ? 'rgba(255,255,255,0.6)' : 'transparent'};
                                    transition: border-color 0.2s, transform 0.15s;
                                    box-shadow:0 1px 3px rgba(0,0,0,0.15);
                                "></div>
                            `).join('')}
                        </div>
                    </div>
                    <button id="mx-btn-add-rule" class="mx-btn-action">Guardar Nueva Regla</button>
                    
                    <div id="mx-rules-list" style="margin-top:14px; margin-bottom:14px; max-height:160px; overflow-y:auto; padding-right:4px;"></div>

                    <div style="display: flex; gap: 5px;">
                        <button id="mx-btn-exp-rules" class="mx-btn-action mx-btn-outline" style="flex:1">Exportar</button>
                        <button id="mx-btn-imp-rules" class="mx-btn-action mx-btn-outline" style="flex:1">Importar</button>
                        <input type="file" id="mx-file-rules" style="display:none" accept=".csv">
                    </div>
                </div>

                <!-- Herramientas de datos -->
                <div class="mx-card">
                    <h4>Herramientas de Datos</h4>
                    <button id="mx-btn-export-all" class="mx-btn-action mx-btn-secondary">
                        📤 Exportar Auditoría Completa (CSV)
                    </button>
                    <button id="mx-btn-import-audit" class="mx-btn-action mx-btn-outline">
                        📥 Importar Auditoría Externa
                    </button>
                    <input type="file" id="mx-file-audit" style="display:none" accept=".csv">

                    <button
                        id="mx-btn-purge"
                        style="width: 100%; background: none; border: none; color: #f87171; font-size: 11px; margin-top: 15px; cursor: pointer; text-decoration: underline; opacity: 0.7;"
                    >
                        ${config.role === 'admin' ? 'Resetear Auditoría Completa (Peligro)' : 'Borrar todas mis etiquetas y notas'}
                    </button>
                </div>



                <div style="text-align: center; color: rgba(255,255,255,0.4); font-size: 10px; padding-bottom: 20px;">
                    <b>Monexa Flow V1</b> — Desarrollada por <b>LBM Studios</b>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        // Cerrar el panel al hacer clik afuera
        document.addEventListener('mousedown', (e) => {
            const btn = document.getElementById('mx-launcher-wrapper') || document.getElementById('mx-master-launcher');
            if (panel.classList.contains('active')) {
                // Si el click ocurre fuera del panel Y fuera del botón que lo abre
                if (!panel.contains(e.target) && (!btn || !btn.contains(e.target))) {
                    panel.classList.remove('active');
                }
            }
        });

        // --- Eventos del panel ---

        document.getElementById('mx-btn-open-dashboard').onclick = () => {
            // El Content Security Policy (CSP) del banco puede bloquear window.open
            // Así que enviamos un mensaje al background worker para que abra la pestaña
            chrome.runtime.sendMessage({ action: 'openDashboard' });
        };

        const header = document.getElementById('mx-panel-header');
        if (header) {
            header.onclick = (e) => {
                // No cerrar si se hizo click en el botón de logout o el de cerrar
                if (e.target.id === 'mx-panel-logout' || e.target.id === 'mx-panel-close') return;
                panel.classList.toggle('active');
            };
        }

        document.getElementById('mx-panel-close').onclick = (e) => {
            e.stopPropagation(); // Evitar doble click con el header
            panel.classList.remove('active');
        };

        const btnLogout = document.getElementById('mx-panel-logout');
        if (btnLogout) {
            btnLogout.onclick = async (e) => {
                e.preventDefault();
                await DB_Engine.commit(KEYS.SETTINGS, { user: '', enabled: false });
                await DB_Engine.commit(KEYS.SYSTEM_STATE, { enabled: false });
                await Logger.info(`Sesión de ${config.user} finalizada`);
                location.reload();
            };
        }

        document.getElementById('mx-btn-export-all').onclick = () => {
            FileSystem.exportAuditory();
        };

        const btnPurge = document.getElementById('mx-btn-purge');
        if (btnPurge) {
            btnPurge.onclick = () => {
                DB_Engine.purge();
            };
        }

        document.getElementById('mx-btn-import-audit').onclick = () => {
            document.getElementById('mx-file-audit').click();
        };

        document.getElementById('mx-btn-imp-rules').onclick = () => {
            document.getElementById('mx-file-rules').click();
        };

        // --- Color picker para reglas ---
        let _selectedRuleColor = 'verde';
        const colorDots = document.querySelectorAll('.mx-color-dot');
        colorDots.forEach(dot => {
            dot.onmouseenter = () => { dot.style.transform = 'scale(1.2)'; };
            dot.onmouseleave = () => { dot.style.transform = 'scale(1)'; };
            dot.onclick = () => {
                _selectedRuleColor = dot.dataset.color;
                colorDots.forEach(d => {
                    d.style.borderColor = d.dataset.color === _selectedRuleColor ? 'rgba(255,255,255,0.6)' : 'transparent';
                });
            };
        });

        document.getElementById('mx-btn-add-rule').onclick = async () => {
            const pat = document.getElementById('mx-rule-pat').value.trim();
            const amt = document.getElementById('mx-rule-amt').value.trim();
            const lab = document.getElementById('mx-rule-lab').value.trim();
            if (!pat || !lab) return;

            const rules = await DB_Engine.fetch(KEYS.RULES, []);
            const newRule = { pattern: pat, label: lab, color: _selectedRuleColor };
            if (amt) newRule.importe = amt;
            rules.push(newRule);
            await DB_Engine.commit(KEYS.RULES, rules);

            document.getElementById('mx-rule-pat').value = "";
            document.getElementById('mx-rule-amt').value = "";
            document.getElementById('mx-rule-lab').value = "";
            // Reset color picker to verde
            _selectedRuleColor = 'verde';
            colorDots.forEach(d => {
                d.style.borderColor = d.dataset.color === 'verde' ? 'rgba(255,255,255,0.6)' : 'transparent';
            });
            await UI.refreshRulesList();
            alert("Regla añadida.");
            await Logger.info(`Regla añadida: ${pat}${amt ? '+' + amt : ''} -> ${lab} [${_selectedRuleColor}]`);
        };

        document.getElementById('mx-btn-exp-rules').onclick = () => {
            FileSystem.exportRules();
        };

        document.getElementById('mx-search-input').oninput = async (e) => {
            const value = e.target.value || "";
            const results = await SearchMaster.query(value);
            const resDiv = document.getElementById('mx-search-results');

            if (value.length < 2) {
                resDiv.innerHTML = "";
                return;
            }

            resDiv.innerHTML = results.map(r => {
                const statusEntry = STATUS_MAP[
                    Object.keys(STATUS_MAP).find(k => STATUS_MAP[k].id === r.status)
                ] || STATUS_MAP.PENDING;

                return `
                <div style="padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <b>${DataCore.sanitizeText((r.concepto || "").substring(0, 30))}${(r.concepto || "").length > 30 ? "..." : ""}</b>
                        <span class="mx-badge" style="background: ${statusEntry.color}; color: white; font-size:9px;">${r.status || "NONE"}</span>
                    </div>
                    ${r.extra ? `<div style="font-size:10px; color:#fbbf24; font-weight:600; margin-top:2px;">&#128279; ${DataCore.sanitizeText(r.extra)}</div>` : ''}
                    <div style="font-size: 10px; color: rgba(255,255,255,0.4); margin-top: 2px;">${DataCore.sanitizeText(r.note || 'Sin nota')}</div>
                </div>
                `;
            }).join('');
        };

        document.getElementById('mx-file-rules').onchange = (e) => {
            FileSystem.importExternalCSV(e.target.files[0], "RULES");
        };

        document.getElementById('mx-file-audit').onchange = (e) => {
            FileSystem.importExternalCSV(e.target.files[0], "NOTES");
        };


        const toggleTrack = document.getElementById('mx-toggle-track');
        if (toggleTrack) {
            toggleTrack.onclick = async () => {
                const next = await SystemControl.toggle();
                this._applyToggleState(next);
                // Recarga para que el observer arranque/pare limpiamente
                setTimeout(() => window.location.reload(), 600);
            };
        }

        await this.refreshSystemToggleButton();
        await this.refreshDashboard();
        await this.refreshRulesList();
    },

    /**
     * Aplica visualmente el estado del toggle slider (track + thumb + labels).
     * @param {boolean} enabled
                */
    _applyToggleState(enabled) {
        const track = document.getElementById('mx-toggle-track');
        const thumb = document.getElementById('mx-toggle-thumb');
        const label = document.getElementById('mx-toggle-label');
        const sub = document.getElementById('mx-toggle-sub');
        if (!track || !thumb) return;

        if (enabled) {
            track.style.background = '#10b981';
            thumb.style.left = '24px';
            if (label) label.textContent = 'Sistema ACTIVO';
            if (sub) sub.textContent = 'La extensión está escaneando';
        } else {
            track.style.background = '#cbd5e1';
            thumb.style.left = '3px';
            if (label) label.textContent = 'Sistema INACTIVO';
            if (sub) sub.textContent = 'Haga click para activar';
        }
    },

    /**
     * Actualiza el toggle slider según el estado real en storage.
     */
    async refreshSystemToggleButton() {
        const enabled = await SystemControl.isEnabled();
        this._applyToggleState(enabled);
    },

    /**
     * Refresca los contadores de auditoría en el panel.
     */
    async refreshDashboard() {
        const db = await DB_Engine.fetch(KEYS.TRANSACTIONS, { items: {} });
        const items = Object.values(db.items || {}).filter(r => {
            const fLower = (r.fecha || '').toLowerCase();
            return !fLower.includes('u$s') && !fLower.includes('pizarra') && !fLower.includes('brou');
        });
        const stats = { VERDE: 0, AMARILLO: 0, ROJO: 0 };

        items.forEach(i => {
            if (Object.prototype.hasOwnProperty.call(stats, i.status)) {
                stats[i.status]++;
            }
        });

        const dash = document.getElementById('mx-dash-stats');
        if (dash) {
            dash.innerHTML = `
                <div class="mx-stat-item" style="background: ${PALETTE.success}">
                    ${stats.VERDE}<br><small>Validados</small>
                </div>
                <div class="mx-stat-item" style="background: ${PALETTE.amber}">
                    ${stats.AMARILLO}<br><small>Alertas</small>
                </div>
                <div class="mx-stat-item" style="background: ${PALETTE.rose}">
                    ${stats.ROJO}<br><small>Rojos</small>
                </div>
            `;
        }
    },

    /**
     * Pinta la lista de reglas en el Motor de Reglas
     */
    async refreshRulesList() {
        const rulesListDiv = document.getElementById('mx-rules-list');
        if (!rulesListDiv) return;

        const rules = await DB_Engine.fetch(KEYS.RULES, []);
        if (rules.length === 0) {
            rulesListDiv.innerHTML = '<div style="font-size:11px; color:rgba(255,255,255,0.35); text-align:center; padding:10px 0; border:1px dashed rgba(255,255,255,0.12); border-radius:8px;">No hay reglas guardadas.</div>';
            return;
        }

        const escapeStr = (s) => String(s || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

        //@ts-ignore
        rulesListDiv.innerHTML = rules.map((r, i) => {
            const ruleColorKey = r.color || 'verde';
            const ruleColor = RULE_COLORS[ruleColorKey] || RULE_COLORS.verde;
            const amtText = r.importe ? ` + $${escapeStr(r.importe)}` : '';
            return `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:6px 10px; margin-bottom:6px;">
                        <div style="display:flex; align-items:center; gap:6px; font-size:11px; color:rgba(255,255,255,0.7); max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeStr(r.pattern)}${r.importe ? ' + ' + escapeStr(r.importe) : ''} → ${escapeStr(r.label)} (${ruleColor.label})">
                            <b style="color:rgba(255,255,255,0.9);">${escapeStr(r.pattern)}</b>${amtText} → <span style="background:${ruleColor.hex}; color:white; padding:2px 6px; border-radius:99px; font-weight:700; font-size:9px; vertical-align:middle; margin-left:4px;">${escapeStr(r.label)}</span>
                        </div>
                        <button class="mx-btn-delete-rule" data-index="${i}" style="background:none; border:none; color:#f87171; font-size:16px; cursor:pointer; padding:0 4px; line-height:1; transition:color 0.2s; opacity:0.7;" onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='0.7'" title="Eliminar regla">&times;</button>
                    </div>`;
        }).join('');

        const deleteBtns = document.querySelectorAll('.mx-btn-delete-rule');
        deleteBtns.forEach(btn => {
            //@ts-ignore
            btn.onclick = async () => {
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                const currentRules = await DB_Engine.fetch(KEYS.RULES, []);
                currentRules.splice(idx, 1);
                await DB_Engine.commit(KEYS.RULES, currentRules);
                await UI.refreshRulesList();
            };
        });
    },

    /**
     * Muestra un menú de acciones rápidas al hacer clic en un importe.
     * (V1 Premium - Audit Layer)
     */
    showQuickActions(event, data, hash) {
        // Eliminar si ya existe uno
        const existing = document.getElementById('mx-quick-actions');
        if (existing) existing.remove();

        const menu = document.createElement('div');
        menu.id = 'mx-quick-actions';
        menu.style.cssText = `
            position: fixed;
            top: ${event.clientY}px;
            left: ${event.clientX}px;
            background: rgba(30, 32, 38, 0.95);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 8px;
            z-index: 100000;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5), 0 0 20px rgba(236,112,0,0.1);
            display: flex;
            flex-direction: column;
            gap: 4px;
            min-width: 140px;
            animation: mxFadeIn 0.2s ease-out;
        `;

        const actions = [
            { id: 'VERDE', label: 'Validar', icon: '✓', color: '#10b981' },
            { id: 'AMARILLO', label: 'Observar', icon: '!', color: '#f59e0b' },
            { id: 'ROJO', label: 'Rechazar', icon: '×', color: '#ef4444' }
        ];

        actions.forEach(act => {
            const btn = document.createElement('button');
            btn.style.cssText = `
                background: none;
                border: none;
                color: white;
                padding: 8px 12px;
                border-radius: 8px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 12px;
                font-family: 'Inter', sans-serif;
                transition: background 0.2s;
                text-align: left;
            `;
            btn.innerHTML = `<span style="color:${act.color}; font-weight:700; width:14px;">${act.icon}</span> ${act.label}`;
            btn.onmouseenter = () => btn.style.background = 'rgba(255,255,255,0.05)';
            btn.onmouseleave = () => btn.style.background = 'none';
            btn.onclick = async () => {
                // Simular el clic en el botón de ciclo de la fila
                const row = document.querySelector(`tr[data-monexa-hash="${hash}"]`);
                if (row) {
                    const cycleBtn = row.querySelector('.mx-btn-cycle');
                    // Esta lógica es simplificada, realmente debería llamar a Scanner.updateRecord
                    // pero para la demo delegaremos al evento del botón real si lo encontramos
                    // o emitiremos una actualización manual.
                    data.status = act.id;
                    data.ts = new Date().toLocaleString();
                    const db = await DB_Engine.fetch(KEYS.TRANSACTIONS, { items: {} });
                    db.items[hash] = data;
                    await DB_Engine.commit(KEYS.TRANSACTIONS, db);

                    // Forzar refresco visual
                    location.reload();
                }
                menu.remove();
            };
            menu.appendChild(btn);
        });

        document.body.appendChild(menu);

        // Cerrar al hacer clic fuera
        const closer = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('mousedown', closer);
            }
        };
        setTimeout(() => document.addEventListener('mousedown', closer), 10);
    }
};
