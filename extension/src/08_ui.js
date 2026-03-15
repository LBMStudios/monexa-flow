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

        const isActivated = await LicenseSystem.isActivated();
        console.log("[Monexa] Estado Activación:", isActivated);

        if (!isActivated) {
            console.warn("[Monexa] Sistema no activado. Mostrando pantalla de activación...");
            if (window === window.top) {
                UILogin.renderActivation();
            }
            return;
        }

        // 2. Si está activado, verificar sesión de usuario
        const config = await DB_Engine.fetch(KEYS.SETTINGS, { user: "" });

        if (config && config.user && config.user !== "") {
            console.log("[Monexa] Usuario detectado:", config.user);
            if (window === window.top) {
                await this.renderControlCenter();
                this.renderLauncher();
                if (document.getElementById('mx-boot-tag')) document.getElementById('mx-boot-tag').innerText = 'MX:READY';
            }
            await Scanner.init();
        } else {
            console.warn("[Monexa] No hay usuario activo. Intentando autologin...");
            
            // Cadena de recuperación de identidad:
            // 1. Buscar en licencias activas
            // 2. Buscar en lista de usuarios (el más reciente)
            // 3. Si nada funciona → mostrar pantalla de login

            let autoUser = null;

            // Intento 1: Licencias activas
            const license = await DB_Engine.fetch(KEYS.LICENSE, { activeLicenses: {} });
            const activeUsers = Object.keys(license.activeLicenses || {});
            
            if (activeUsers.length === 1) {
                autoUser = activeUsers[0];
                console.log("[Monexa] Autologin por licencia:", autoUser);
            }

            // Intento 2: Buscar en la lista de usuarios registrados
            if (!autoUser) {
                const users = await DB_Engine.fetch(KEYS.USERS, []);
                if (users.length > 0) {
                    // Ordenar por última actividad (más reciente primero)
                    const sorted = [...users].sort((a, b) => {
                        const ta = a.lastActive ? new Date(a.lastActive).getTime() : 0;
                        const tb = b.lastActive ? new Date(b.lastActive).getTime() : 0;
                        return tb - ta;
                    });
                    autoUser = sorted[0].name;
                    console.log("[Monexa] Autologin por usuario reciente:", autoUser);
                }
            }

            if (autoUser) {
                // Actualizar configuración
                const currentSettings = await DB_Engine.fetch(KEYS.SETTINGS, {});
                let role = 'user';
                const users = await DB_Engine.fetch(KEYS.USERS, []);
                const found = users.find(u => u.name.toLowerCase() === autoUser.toLowerCase());
                if (found) role = found.role || 'user';
                else if (users.length === 0) role = 'admin';

                await DB_Engine.commit(KEYS.SETTINGS, { ...currentSettings, user: autoUser, role, enabled: true });
                await DB_Engine.commit(KEYS.SYSTEM_STATE, { enabled: true });
                
                console.log(`[Monexa] Sesión recuperada para: ${autoUser} (${role})`);
                
                if (window === window.top) {
                    await this.renderControlCenter();
                    this.renderLauncher();
                    if (document.getElementById('mx-boot-tag')) document.getElementById('mx-boot-tag').innerText = 'MX:READY';
                }
                await Scanner.init();
                return;
            }

            if (window === window.top) {
                UILogin.renderWelcome();
                if (document.getElementById('mx-boot-tag')) document.getElementById('mx-boot-tag').innerText = 'MX:WELCOME';
            }

        }
    },

    /**
     * Inyecta el CSS global del sistema (delegado a UIStyles).
     */
    injectGlobalStyles() {
        UIStyles.inject();
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
        btn.innerHTML = "MXA";
        btn.title = "Abrir panel Monexa";
        btn.style.cssText = `
            position: relative;
            width: 64px;
            height: 64px;
            background: ${PALETTE.itau_orange};
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 10px 25px rgba(236,112,0,0.4), inset 0 1px 1px rgba(255,255,255,0.3);
            border: 2px solid rgba(255,255,255,0.2);
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            font-family: 'Inter', sans-serif;
            font-weight: 900;
            font-size: 20px;
            user-select: none;
            z-index: 10;
        `;

        btn.onmouseenter = () => { 
            btn.style.background = PALETTE.itau_orange_hover; 
            btn.style.transform = 'scale(1.1) rotate(5deg)';
            btn.style.boxShadow = '0 15px 35px rgba(236,112,0,0.5)';
        };
        btn.onmouseleave = () => { 
            btn.style.background = PALETTE.itau_orange; 
            btn.style.transform = '';
            btn.style.boxShadow = '0 10px 25px rgba(236,112,0,0.4)';
        };

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
            <div style="width:20px; height:20px; background:white; border-radius:50%; position:absolute; left:4px; box-shadow:0 2px 5px rgba(0,0,0,0.3); transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid rgba(0,0,0,0.05);"></div>
            <div style="font-size:10px; font-weight:900; color:white; margin-left:32px; letter-spacing:1px; transition:all 0.3s;">OFF</div>
        `;
        l.title = "Sistema Inactivo - Click para activar Monexa Flow";
        l.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 70px;
            height: 28px;
            background: ${PALETTE.itau_blue_dark};
            border-radius: 20px;
            display: flex;
            align-items: center;
            cursor: pointer;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            border: 2px solid ${PALETTE.itau_orange};
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
        const installID = await LicenseSystem.getInstallationID();
        const isActivated = await LicenseSystem.isActivated();

        const existing = document.getElementById("mx-control-panel");
        if (existing) existing.remove();

        let updateHtml = "";


        const panel = document.createElement('div');
        panel.id = "mx-control-panel";
        panel.innerHTML = `
            <div class="mx-header" id="mx-panel-header" style="
                background: linear-gradient(135deg, ${PALETTE.itau_orange} 0%, ${PALETTE.itau_blue_dark} 100%);
                padding: 12px 16px;
                position: relative;
                overflow: hidden;
                width: 100%;
                box-sizing: border-box;
                border-bottom: 2px solid rgba(255,255,255,0.1);
                display: flex;
                align-items: center;
                justify-content: space-between;
                min-height: 60px;
            ">
                <!-- Branding & Auditor Compact -->
                <div style="display: flex; align-items: center; gap: 12px; position: relative; z-index: 5; flex: 1; min-width: 0;">
                    <!-- Avatar Mini Glass -->
                    <div style="
                        width: 36px; height: 36px;
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(8px);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        border-radius: 10px;
                        display: flex; align-items: center; justify-content: center;
                        font-size: 16px; font-weight: 900; color: white;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                        flex-shrink: 0;
                    ">${(config.user || "?")[0].toUpperCase()}</div>

                    <div style="min-width: 0; flex: 1;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="font-size: 14px; font-weight: 900; color: white; letter-spacing: -0.3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                ${(config.user || "Invitado").toUpperCase()}
                            </span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-top: 1px;">
                            <div class="mx-sovereign-badge" style="background: rgba(16, 185, 129, 0.1); padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(16, 185, 129, 0.2); display: flex; align-items: center; gap: 6px;">
                                <div style="width: 6px; height: 6px; background: #10b981; border-radius: 50%; box-shadow: 0 0 8px #10b981;"></div>
                            <span style="font-size: 8px; font-weight: 900; color: #10b981; text-transform: uppercase; letter-spacing: 0.5px;">Blindaje Local Activo</span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Controles Compactos -->
                <div style="display: flex; align-items: center; gap: 8px; position: relative; z-index: 5;">
                    <a id="mx-panel-logout" href="#" title="Salir del Sistema" style="
                        width: 32px; height: 32px;
                        display: flex; align-items: center; justify-content: center;
                        background: rgba(255,255,255,0.1);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px; color: white; transition: all 0.2s;
                    " onmouseenter="this.style.background='rgba(255,255,255,0.2)'" onmouseleave="this.style.background='rgba(255,255,255,0.1)'">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                    </a>

                    <button id="mx-panel-close" title="Cerrar Panel" aria-label="Cerrar Panel" style="
                        background: rgba(0,0,0,0.3);
                        border: 1px solid rgba(255,255,255,0.1);
                        color: white; width: 32px; height: 32px;
                        border-radius: 8px; cursor: pointer;
                        display: flex; align-items: center; justify-content: center;
                        transition: all 0.2s;
                    " onmouseenter="this.style.background='rgba(239, 68, 68, 0.4)'" onmouseleave="this.style.background='rgba(0,0,0,0.3)'">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>

            <div class="mx-content">
                <!-- Sección de Seguridad (Sovereign Edition) -->
                <div class="mx-card" style="
                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
                    border: 1px solid rgba(16, 185, 129, 0.2);
                    margin-bottom: 5px;
                ">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                        <div style="color: #10b981;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                            </svg>
                        </div>
                        <h4 style="margin: 0; color: white; font-size: 13px;">Seguridad</h4>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: rgba(255,255,255,0.7);">
                            <span style="color: #10b981;">●</span> 100% Offline (Sin conexión Cloud)
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: rgba(255,255,255,0.7);">
                            <span style="color: #10b981;">●</span> Datos Locales Soberanos (IndexedDB)
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: rgba(255,255,255,0.7);">
                            <span style="color: #10b981;">●</span> Activación Matemática per-User
                        </div>
                    </div>
                </div>

                       ${config.role === 'admin' ? `
                    <!-- El Panel Maestro ha sido removido para garantizar 100% privacidad offline -->
                ` : ''}


                ${isActivated ? `
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
                ` : `
                    <!-- El sistema ahora está siempre activo en Itaú Direct Edition -->
                `}


                <!-- Resumen de auditoría -->
                <div class="mx-card">
                    <h4>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.7;">
                            <line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line>
                        </svg>
                        Resumen del Control
                    </h4>
                    <div id="mx-dash-stats" class="mx-stat-grid">
                        <div class="mx-stat-item" style="background: ${PALETTE.success}">0<br><small>Validados</small></div>
                        <div class="mx-stat-item" style="background: ${PALETTE.amber}">0<br><small>Alertas</small></div>
                        <div class="mx-stat-item" style="background: ${PALETTE.rose}">0<br><small>Rojos</small></div>
                    </div>
                    <button id="mx-btn-open-dashboard" class="mx-btn-action mx-btn-secondary" style="
                        margin-top: 15px; font-size: 13px; font-weight: 700;
                    ">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>
                        </svg>
                        Ver Dashboard Completo
                    </button>
                </div>

                <!-- Buscador de notas -->
                <div class="mx-card">
                    <h4>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.7;">
                            <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        Buscador de Notas
                    </h4>
                    <input
                        type="text"
                        id="mx-search-input"
                        class="mx-search-box"
                        placeholder="Filtrar por concepto o nota..."
                    >
                    <div id="mx-search-results" style="max-height: 150px; overflow-y: auto; font-size: 12px; color: rgba(255,255,255,0.6);"></div>
                </div>

                            <!-- Motor de reglas -->
                <div class="mx-card" style="border-top: 2px solid rgba(236,112,0,0.15);">
                    <h4>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.7; color: var(--mx-primary);">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                        </svg>
                        Motor de Reglas Inteligentes
                    </h4>
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <input type="text" id="mx-rule-pat" class="mx-search-box" style="padding: 8px 10px; font-size: 12px;" placeholder="Si el concepto contiene...">
                        <input type="text" id="mx-rule-amt" class="mx-search-box" style="padding: 8px 10px; font-size: 12px;" placeholder="Importe (Ej: 1540.00)">
                        <input type="text" id="mx-rule-lab" class="mx-search-box" style="padding: 8px 10px; font-size: 12px;" placeholder="Asignar etiqueta...">
                        <input type="text" id="mx-rule-not" class="mx-search-box" style="padding: 8px 10px; font-size: 12px;" placeholder="Nota adicional (Ej: MUÑOZ)">
                        
                        <div style="margin: 6px 0 4px;">
                            <div style="font-size: 9px; color: rgba(255,255,255,0.4); margin-bottom: 6px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Color del Marcador:</div>
                            <div id="mx-rule-colors" style="display: flex; gap: 8px;">
                                ${Object.entries(RULE_COLORS).map(([key, c]) => `
                                    <div class="mx-color-dot" data-color="${key}" title="${c.label}" style="
                                        width: 24px; height: 24px;
                                        border-radius: 8px;
                                        background: ${c.hex};
                                        cursor: pointer;
                                        border: 2px solid ${key === 'verde' ? 'white' : 'transparent'};
                                        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                                        box-shadow: 0 3px 8px ${c.hex}44;
                                    " onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'"></div>
                                `).join('')}
                            </div>
                        </div>

                        <button id="mx-btn-add-rule" class="mx-btn-action" style="margin-top: 2px;">+ Crear Regla Automática</button>
                        
                        <div id="mx-rules-list" style="margin-top: 10px; max-height: 150px; overflow-y: auto; padding-right: 5px; display: flex; flex-direction: column; gap: 6px;"></div>

                        <div style="display: flex; gap: 8px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px; margin-top: 6px;">
                            <button id="mx-btn-exp-rules" class="mx-btn-action mx-btn-secondary" style="flex:1; padding: 8px; font-size: 11px;">Exportar Reglas</button>
                            <button id="mx-btn-imp-rules" class="mx-btn-action mx-btn-secondary" style="flex:1; padding: 8px; font-size: 11px;">Importar Reglas</button>
                            <input type="file" id="mx-file-rules" style="display:none" accept=".csv">
                        </div>
                    </div>
                </div>

                <!-- Integridad Contable (Gap Detection) -->
                <div class="mx-card" id="mx-integrity-card" style="border-left: 4px solid #64748b; transition: all 0.3s;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                        <h4 style="margin: 0;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.7;">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                            </svg>
                            Integridad Contable
                        </h4>
                        <div id="mx-integrity-status" style="font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 6px; background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.6);">PENDIENTE</div>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; font-size: 12px; color: rgba(255,255,255,0.5);">
                            <span>Saldo Oficial (Banco):</span>
                            <span id="mx-official-val" style="color: white; font-weight: 700;">---</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 12px; color: rgba(255,255,255,0.5);">
                            <span>Saldo Calculado:</span>
                            <span id="mx-internal-val" style="color: white; font-weight: 700;">---</span>
                        </div>
                        <div id="mx-gap-row" style="display: none; justify-content: space-between; font-size: 13px; font-weight: 800; padding-top: 6px; border-top: 1px dashed var(--mx-border);">
                            <span>Diferencia (Brecha):</span>
                            <span id="mx-gap-val">---</span>
                        </div>
                    </div>

                    <button id="mx-btn-audit-sign" class="mx-btn-action" style="
                        background: rgba(255,255,255,0.05);
                        border: 1px solid var(--mx-border);
                        color: white;
                        font-size: 12px;
                        font-weight: 700;
                        padding: 10px;
                        width: 100%;
                        border-radius: 12px;
                        cursor: pointer;
                        display: flex; align-items: center; justify-content: center; gap: 8px;
                        transition: all 0.3s;
                    " onmouseenter="this.style.background='rgba(59, 130, 246, 0.1)'; this.style.borderColor='var(--mx-accent)';"
                       onmouseleave="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='var(--mx-border)';"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                        Generar Firma de Auditoría
                    </button>
                    <div id="mx-sign-output" style="font-family: 'Courier New', Courier, monospace; font-size: 10px; color: var(--mx-accent); margin-top: 8px; text-align: center; word-break: break-all; opacity: 0;"></div>
                </div>
            </div>

            <!-- Footer fijo: Herramientas de datos -->
            <div style="
                padding: 18px 20px;
                background: rgba(15, 20, 35, 0.98);
                border-top: 1px solid rgba(255,255,255,0.08);
                box-shadow: 0 -10px 40px rgba(0,0,0,0.4);
                flex-shrink: 0;
                position: relative;
                z-index: 10;
            ">
                <h4 style="margin: 0 0 12px 0; font-size: 11px; text-transform: uppercase; color: rgba(255,255,255,0.45); letter-spacing: 0.1em; font-weight: 700;">Herramientas de Datos</h4>
                
                <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                    <button id="mx-btn-export-all" class="mx-btn-action mx-btn-secondary" style="flex:1; margin-bottom: 0; font-size: 11px; padding: 10px; height: auto;">
                        📤 Exportar CSV
                    </button>
                    <button id="mx-btn-import-audit" class="mx-btn-action mx-btn-outline" style="flex:1; margin-bottom: 0; font-size: 11px; padding: 10px; height: auto;">
                        📥 Importar Audit.
                    </button>
                    <input type="file" id="mx-file-audit" style="display:none" accept=".csv">
                </div>

                <!-- Sección de Peligro -->
                <button
                    id="mx-btn-purge"
                    style="width: 100%; background: transparent; border: 1px dashed rgba(225, 29, 72, 0.3); color: rgba(248, 113, 113, 0.8); font-size: 10px; padding: 8px; border-radius: 8px; cursor: pointer; font-family: 'Inter', sans-serif; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; transition: all 0.3s;"
                    onmouseover="this.style.background='rgba(225, 29, 72, 0.1)'; this.style.color='#f87171'; this.style.borderColor='rgba(225, 29, 72, 0.5)';"
                    onmouseout="this.style.background='transparent'; this.style.color='rgba(248, 113, 113, 0.8)'; this.style.borderColor='rgba(225, 29, 72, 0.3)';"
                >
                    ${config.role === 'admin' ? '⚠️ RESETEAR AUDITORÍA COMPLETA' : 'BORRAR MIS ETIQUETAS'}
                </button>
                <div style="text-align: center; color: rgba(255,255,255,0.15); font-size: 9px; margin-top: 15px; letter-spacing: 1px; font-weight: 600;">
                    MONEXA FLOW V1 — LBM STUDIOS
                </div>
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

        // --- Motor de Delegación de Eventos del Panel ---
        panel.addEventListener('click', async (e) => {
            const target = e.target.closest('button, a, .mx-stat-item, .mx-color-dot');
            if (!target) return;

            // 1. Abrir Dashboard
            if (target.id === 'mx-btn-open-dashboard') {
                chrome.runtime.sendMessage({ action: 'openDashboard' });
            }

            // 2. Cerrar Panel
            if (target.id === 'mx-panel-close') {
                e.stopPropagation();
                panel.classList.remove('active');
            }

            // 3. Logout
            if (target.id === 'mx-panel-logout') {
                e.preventDefault();
                const currentSettings = await DB_Engine.fetch(KEYS.SETTINGS, {});
                await DB_Engine.commit(KEYS.SETTINGS, { ...currentSettings, user: '', role: 'user' });
                await DB_Engine.commit(KEYS.SYSTEM_STATE, { enabled: false });
                location.reload();
            }

            // 4. Exportar / Importar (Triggers)
            if (target.id === 'mx-btn-export-all') FileSystem.exportAuditory();
            if (target.id === 'mx-btn-import-audit') document.getElementById('mx-file-audit').click();
            if (target.id === 'mx-btn-imp-rules') document.getElementById('mx-file-rules').click();
            if (target.id === 'mx-btn-exp-rules') FileSystem.exportRules();

            // 5. Purga de datos
            if (target.id === 'mx-btn-purge') DB_Engine.purge();

            // 6. Firma de Auditoría
            if (target.id === 'mx-btn-audit-sign') {
                const db = await DB_Engine.fetch(KEYS.TRANSACTIONS, { items: {} });
                const sig = DataCore.generateAuditSignature(db.items);
                const output = document.getElementById('mx-sign-output');
                if (output) {
                    output.textContent = sig;
                    output.style.opacity = '1';
                    alert(`Firma Generada Exitosamente:\n\n${sig}`);
                }
            }

            // 7. Toggle Sistema
            if (target.id === 'mx-toggle-track') {
                const next = await SystemControl.toggle();
                this._applyToggleState(next);
                setTimeout(() => window.location.reload(), 600);
            }
        });

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
            const not = document.getElementById('mx-rule-not').value.trim();
            if (!pat || !lab) return;

            const rules = await DB_Engine.fetch(KEYS.RULES, []);
            const newRule = { pattern: pat, label: lab, color: _selectedRuleColor };
            if (amt) newRule.importe = amt;
            if (not) newRule.note = not;
            rules.push(newRule);
            await DB_Engine.commit(KEYS.RULES, rules);

            document.getElementById('mx-rule-pat').value = "";
            document.getElementById('mx-rule-amt').value = "";
            document.getElementById('mx-rule-lab').value = "";
            document.getElementById('mx-rule-not').value = "";
            // Reset color picker to verde
            _selectedRuleColor = 'verde';
            colorDots.forEach(d => {
                d.style.borderColor = d.dataset.color === 'verde' ? 'rgba(255,255,255,0.6)' : 'transparent';
            });
            await UI.refreshRulesList();
            await Logger.info(`Regla añadida: ${pat}${amt ? '+' + amt : ''} -> ${lab} [${_selectedRuleColor}]`);
            
            // 🚀 Re-escaneo reactivo sin recargar la página (mejor UX en SPAs)
            console.log("[Monexa] Regla añadida. Re-procesando DOM...");
            if (typeof Scanner !== 'undefined') {
                Scanner.reprocess();
            }
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
                <div style="
                    padding: 12px; border: 1px solid rgba(255,255,255,0.05); 
                    background: rgba(255,255,255,0.02); border-radius: 12px; margin-bottom: 8px;
                    transition: all 0.2s; cursor: pointer;
                " onmouseover="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='rgba(255,255,255,0.1)';" onmouseout="this.style.background='rgba(255,255,255,0.02)'; this.style.borderColor='rgba(255,255,255,0.05)';" onclick="UI.showQuickActions(event, {}, '${r._hash}')">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight: 700; color: white; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 240px; font-size: 13px;">
                            ${DataCore.sanitizeText(r.concepto || "Sin Concepto")}
                        </span>
                        <div style="
                            width: 20px; height: 20px; border-radius: 6px; 
                            background: ${statusEntry.color}; display: flex; align-items: center; justify-content: center;
                            font-size: 10px; font-weight: 800; color: white; box-shadow: 0 4px 8px ${statusEntry.color}33;
                        ">${statusEntry.icon}</div>
                    </div>
                    
                    <div style="display: flex; gap: 8px; margin-top: 8px;">
                        ${r.tag ? `<span style="background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.5); padding: 2px 8px; border-radius: 6px; font-size: 9px; font-weight: 800;">#${DataCore.sanitizeText(r.tag)}</span>` : ''}
                        <span style="color: rgba(255,255,255,0.3); font-size: 9px; font-weight: 600;">${DataCore.sanitizeText(r.note || 'Sin detalles')}</span>
                    </div>
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

        document.getElementById('mx-btn-audit-sign').onclick = async () => {
            const db = await DB_Engine.fetch(KEYS.TRANSACTIONS, { items: {} });
            const sig = DataCore.generateAuditSignature(db.items);
            const output = document.getElementById('mx-sign-output');
            if (output) {
                output.textContent = sig;
                output.style.opacity = '1';
                await Logger.info(`Firma de Auditoría Generada: ${sig}`);
                alert(`Firma Generada Exitosamente:\n\n${sig}\n\nLos datos han sido sellados digitalmente para el reporte final.`);
            }
        };


        if (config.role === 'admin') {
            await this.refreshAdminUserList();
            this.bindAdminPanelEvents();
        }

        await this.refreshSystemToggleButton();
        await this.refreshDashboard();
        await this.refreshRulesList();
    },

    /**
     * Refresca la lista de usuarios en el Panel Maestro.
     */
    async refreshAdminUserList() {
        const container = document.getElementById('mx-admin-user-list');
        if (!container) return;

        try {
            const users = await DB_Engine.fetch(KEYS.USERS, []);
            if (users.length === 0) {
                container.innerHTML = `<div style="font-size: 10px; color: rgba(255,255,255,0.3); text-align: center; padding: 10px;">No hay auditores registrados.</div>`;
                return;
            }

            container.innerHTML = users.map((user, idx) => {
                const lastActiveTime = user.lastActive ? new Date(user.lastActive).getTime() : 0;
                const formattedTime = user.lastActive ? new Date(user.lastActive).toLocaleString('es-UY', { hour12: true }) : 'Nunca';
                
                const roleLabel = (user.role || 'user') === 'admin' ? 'ADMINISTRADOR' : 'AUDITOR';
                const roleColor = (user.role || 'user') === 'admin' ? '#f59e0b' : '#3b82f6';

                return `
                    <div style="display: grid; grid-template-columns: 2fr 1.5fr 1fr 1.5fr; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); align-items: center; transition: background 0.2s;" onmouseenter="this.style.background='rgba(255,255,255,0.02)'" onmouseleave="this.style.background='transparent'">
                        <!-- Nombre -->
                        <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
                            <div style="width: 6px; height: 6px; border-radius: 50%; background: ${user.enabled ? '#10b981' : '#64748b'}; flex-shrink: 0;"></div>
                            <span style="font-size: 13px; font-weight: 700; color: white; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${DataCore.sanitizeText(user.name)}</span>
                        </div>

                        <!-- Rol Badge -->
                        <div style="text-align: center;">
                            <span style="background: ${roleColor}22; color: ${roleColor}; padding: 2px 8px; border-radius: 99px; font-size: 8px; font-weight: 900; letter-spacing: 0.5px; border: 1px solid ${roleColor}44;">
                                ${roleLabel}
                            </span>
                        </div>

                        <!-- Ingresos -->
                        <div style="text-align: center;">
                            <span style="background: rgba(255,255,255,0.08); padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; color: white;">
                                ${user.loginCount || 0}
                            </span>
                        </div>

                        <!-- Ultima Actividad -->
                        <div style="text-align: right; display: flex; align-items: center; justify-content: flex-end; gap: 8px;">
                            <span style="font-size: 10px; color: rgba(255,255,255,0.4); font-weight: 600;">${formattedTime}</span>
                            ${user.role !== 'admin' ? `
                                <button onclick="UI.deleteAdminUser(${idx})" style="background:none; border:none; color:#ef4444; font-size:16px; cursor:pointer;" title="Eliminar" aria-label="Eliminar">&times;</button>
                            ` : '<div style="width:16px;"></div>'}
                        </div>
                    </div>
                `;
            }).join('');
        } catch (e) {
            container.innerHTML = `<div style="font-size: 10px; color: #ef4444; text-align: center; padding: 10px;">Error al cargar: ${DataCore.sanitizeText(e.message)}</div>`;
        }
    },

    /**
     * Vincula eventos del Panel Maestro.
     */
    bindAdminPanelEvents() {
        // Refrescar
        const refreshBtn = document.getElementById('mx-btn-admin-refresh');
        if (refreshBtn) {
            refreshBtn.onclick = async () => {
                refreshBtn.querySelector('svg').style.animation = "mx-spin 1s linear infinite";
                if (typeof CloudConnector !== 'undefined') await CloudConnector.syncRemoteUsers();
                await this.refreshAdminUserList();
                refreshBtn.querySelector('svg').style.animation = "";
            };
        }

        // Registrar Auditor Express
        const addBtn = document.getElementById('mx-btn-admin-add');
        if (addBtn) {
            addBtn.onclick = async () => {
                const name = document.getElementById('mx-admin-new-name').value.trim();
                const role = document.getElementById('mx-admin-new-role').value;
                
                if (!name) { alert("Ingresa un nombre"); return; }
                
                const users = await DB_Engine.fetch(KEYS.USERS, []);
                users.push({
                    name: name,
                    pass: "123456", // Password default para el primer login
                    role: role,
                    enabled: true,
                    lastActive: 0,
                    loginCount: 0
                });

                await DB_Engine.commit(KEYS.USERS, users);
                document.getElementById('mx-admin-new-name').value = "";
                await this.refreshAdminUserList();
                alert(`Auditor ${name} registrado correctamente.`);
            };
        }

    },

    /**
     * Acciones Administrativas
     */
    async addAdminUser() {
        const name = prompt("Nombre del nuevo auditor:");
        if (!name) return;
        const pass = prompt("Contraseña (mínimo 6 caracteres):");
        if (!pass || pass.length < 6) { alert("Contraseña inválida"); return; }
        
        const users = await DB_Engine.fetch(KEYS.USERS, []);
        users.push({
            name: name,
            pass: pass,
            role: "user",
            enabled: true,
            lastActive: 0,
            loginCount: 0
        });

        await DB_Engine.commit(KEYS.USERS, users);
        await this.refreshAdminUserList();
        alert(`Auditor ${name} registrado correctamente.`);
    },

    async toggleAdminUser(index, enabled) {
        const users = await DB_Engine.fetch(KEYS.USERS, []);
        if (users[index]) {
            users[index].enabled = enabled;
            await DB_Engine.commit(KEYS.USERS, users);
            // No refrescamos todo para mantener el estado del switch visualmente rápido
        }
    },

    async deleteAdminUser(index) {
        const users = await DB_Engine.fetch(KEYS.USERS, []);
        if (users[index] && confirm(`¿Seguro que desea ELIMINAR a ${users[index].name}?`)) {
            users.splice(index, 1);
            await DB_Engine.commit(KEYS.USERS, users);
            await this.refreshAdminUserList();
        }
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
                <div class="mx-stat-item" style="background: ${PALETTE.success}">${stats.VERDE}<br><small>Validados</small></div>
                <div class="mx-stat-item" style="background: ${PALETTE.amber}">${stats.AMARILLO}<br><small>Alertas</small></div>
                <div class="mx-stat-item" style="background: ${PALETTE.rose}">${stats.ROJO}<br><small>Rojos</small></div>
            `;
        }
        await this._recalculateGap();
    },

    /**
     * Actualiza el saldo oficial detectado y recalcula la brecha de integridad.
     */
    updateOfficialBalance(val) {
        if (!val) return;
        const offVal = document.getElementById('mx-official-val');
        if (offVal) offVal.textContent = `$ ${val.toLocaleString('es-UY', { minimumFractionDigits: 2 })}`;
        this._officialBalance = val;
        this._recalculateGap();
    },

    /**
     * Recalcula la diferencia entre lo que dice el banco y lo que tenemos en pantalla.
     * Optimizado: caché local de sumas para evitar O(n) excesivo.
     */
    async _recalculateGap() {
        if (this._officialBalance === undefined || isNaN(this._officialBalance)) return;
        
        // Usamos una caché simple de 500ms para evitar cálculos pesados seguidos
        if (this._lastGapCalc && (Date.now() - this._lastGapCalc < 500)) return;
        this._lastGapCalc = Date.now();

        const db = await DB_Engine.fetch(KEYS.TRANSACTIONS, { items: {} });
        const items = Object.values(db.items || {});
        
        let internalSum = 0;
        for (let i = 0; i < items.length; i++) {
            const r = items[i];
            const amt = r.amount || 0;
            internalSum += (r.direction === 'IN' ? amt : -amt);
        }

        const intVal = document.getElementById('mx-internal-val');
        if (intVal) {
            const formatted = `$ ${Math.abs(internalSum).toLocaleString('es-UY', { minimumFractionDigits: 2 })}`;
            if (intVal.textContent !== formatted) intVal.textContent = formatted;
        }

        const gapRow = document.getElementById('mx-gap-row');
        const gapVal = document.getElementById('mx-gap-val');
        const status = document.getElementById('mx-integrity-status');
        const card = document.getElementById('mx-integrity-card');

        if (gapRow && gapVal && status && card) {
            gapRow.style.display = 'flex';
            const gap = Math.abs(this._officialBalance - Math.abs(internalSum));
            const formattedGap = `$ ${gap.toLocaleString('es-UY', { minimumFractionDigits: 2 })}`;
            
            if (gapVal.textContent !== formattedGap) gapVal.textContent = formattedGap;

            const isIntegro = gap < 0.01;
            const newStatus = isIntegro ? 'INTEGRO' : 'BRECHA';
            
            if (status.textContent !== newStatus) {
                status.textContent = newStatus;
                status.style.background = isIntegro ? '#065f46' : '#991b1b';
                status.style.color = isIntegro ? '#34d399' : '#f87171';
                card.style.borderLeftColor = isIntegro ? '#10b981' : '#ef4444';
                
                // Efecto visual premium al cambiar estado
                card.style.transform = 'scale(1.02)';
                setTimeout(() => card.style.transform = 'scale(1)', 300);
            }
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
            const noteText = r.note ? ` <i style="opacity:0.6;">(${escapeStr(r.note)})</i>` : '';
            
            return `
                    <div class="mx-rule-item" draggable="true" data-index="${i}">
                        <div class="mx-rule-handle" title="Arrastrar para reordenar">
                            <svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor"><circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/><circle cx="2" cy="7" r="1.2"/><circle cx="6" cy="7" r="1.2"/><circle cx="2" cy="12" r="1.2"/><circle cx="6" cy="12" r="1.2"/></svg>
                        </div>
                        <div class="mx-rule-body" title="${escapeStr(r.pattern)}${r.importe ? ' + ' + escapeStr(r.importe) : ''} → ${escapeStr(r.label)}${r.note ? ' [' + escapeStr(r.note) + ']' : ''} (${ruleColor.label})">
                            <b style="color:rgba(255,255,255,0.9);">${escapeStr(r.pattern)}</b>${amtText} → <span style="background:${ruleColor.hex}; color:white; padding:1px 6px; border-radius:99px; font-weight:700; font-size:9px; vertical-align:middle; margin-left:2px;">${escapeStr(r.label)}</span>${noteText}
                        </div>
                        <div class="mx-rule-controls">
                            <div class="mx-move-group">
                                <button class="mx-btn-move mx-btn-up" data-index="${i}" title="Subir" aria-label="Subir" ${i === 0 ? 'disabled' : ''}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg></button>
                                <button class="mx-btn-move mx-btn-down" data-index="${i}" title="Bajar" aria-label="Bajar" ${i === rules.length - 1 ? 'disabled' : ''}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button>
                            </div>
                            <button class="mx-btn-delete-rule" data-index="${i}" title="Eliminar regla" aria-label="Eliminar regla"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                        </div>
                    </div>`;
        }).join('');

        // Eventos de botones
        const deleteBtns = document.querySelectorAll('.mx-btn-delete-rule');
        deleteBtns.forEach(btn => {
            //@ts-ignore
            btn.onclick = async (e) => {
                e.preventDefault();
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                const currentRules = await DB_Engine.fetch(KEYS.RULES, []);
                currentRules.splice(idx, 1);
                await DB_Engine.commit(KEYS.RULES, currentRules);
                await UI.refreshRulesList();
                if (typeof Scanner !== 'undefined') Scanner.reprocess();
            };
        });

        const upBtns = document.querySelectorAll('.mx-btn-up');
        upBtns.forEach(btn => {
            //@ts-ignore
            btn.onclick = async (e) => {
                e.preventDefault();
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                if (idx > 0) await UI.reorderRule(idx, idx - 1);
            };
        });

        const downBtns = document.querySelectorAll('.mx-btn-down');
        downBtns.forEach(btn => {
            //@ts-ignore
            btn.onclick = async (e) => {
                e.preventDefault();
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                const currentRules = await DB_Engine.fetch(KEYS.RULES, []);
                if (idx < currentRules.length - 1) await UI.reorderRule(idx, idx + 1);
            };
        });

        // Drag & Drop
        const items = rulesListDiv.querySelectorAll('.mx-rule-item');
        items.forEach(item => {
            item.addEventListener('dragstart', () => item.classList.add('dragging'));
            item.addEventListener('dragend', () => item.classList.remove('dragging'));
        });

        rulesListDiv.addEventListener('dragover', e => {
            e.preventDefault();
            const draggingItem = rulesListDiv.querySelector('.dragging');
            const afterElement = UI.getDragAfterElement(rulesListDiv, e.clientY);
            if (afterElement == null) {
                rulesListDiv.appendChild(draggingItem);
            } else {
                rulesListDiv.insertBefore(draggingItem, afterElement);
            }
        });

        rulesListDiv.addEventListener('drop', async (e) => {
            e.preventDefault();
            const items = Array.from(rulesListDiv.querySelectorAll('.mx-rule-item'));
            const newOrder = items.map(item => parseInt(item.getAttribute('data-index'), 10));
            
            const currentRules = await DB_Engine.fetch(KEYS.RULES, []);
            const sortedRules = newOrder.map(idx => currentRules[idx]);
            
            await DB_Engine.commit(KEYS.RULES, sortedRules);
            await UI.refreshRulesList();
            if (typeof Scanner !== 'undefined') Scanner.reprocess();
        });
    },

    /**
     * Lógica para mover una regla en el array
     */
    async reorderRule(oldIdx, newIdx) {
        const rules = await DB_Engine.fetch(KEYS.RULES, []);
        const rule = rules.splice(oldIdx, 1)[0];
        rules.splice(newIdx, 0, rule);
        await DB_Engine.commit(KEYS.RULES, rules);
        await UI.refreshRulesList();
        if (typeof Scanner !== 'undefined') Scanner.reprocess();
    },

    /**
     * Helper para Drag & Drop: encontrar el elemento después del cual insertar
     */
    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.mx-rule-item:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    },

    /**
     * Muestra visualmente que el sistema está guardando datos.
     * @param {boolean} active 
     */
    setSyncing(active) {
        const dot = document.getElementById('mx-sync-dot');
        if (dot) {
            if (active) dot.classList.add('syncing');
            else dot.classList.remove('syncing');
        }
    },

    /**
     * Muestra un menú de acciones rápidas al hacer clic en un importe.
     * (V1 Premium - Audit Layer)
     */
    // Estado para debouncing de base de datos
    _pendingDbUpdates: {},
    _saveTimeout: null,

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
            font-family: 'Outfit', sans-serif;
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
                gap: 12px;
                font-size: 13px;
                font-family: 'Outfit', sans-serif;
                font-weight: 600;
                transition: background 0.2s;
                text-align: left;
            `;
            btn.innerHTML = `<span style="color:${act.color}; font-weight:700; width:14px;">${act.icon}</span> ${act.label}`;
            btn.onmouseenter = () => btn.style.background = 'rgba(255,255,255,0.05)';
            btn.onmouseleave = () => btn.style.background = 'none';
            btn.onclick = async () => {
                const row = document.querySelector(`tr[data-monexa-hash="${hash}"]`);
                if (row) {
                    data.status = act.id;
                    data.ts = new Date().toLocaleString();

                    // Optimistic UI Update
                    const statusColors = { 'VERDE': 'rgba(16, 185, 129, 0.08)', 'AMARILLO': 'rgba(245, 158, 11, 0.08)', 'ROJO': 'rgba(225, 29, 72, 0.08)', 'NONE': 'transparent' };
                    const statusBorders = { 'VERDE': '4px solid #10b981', 'AMARILLO': '4px solid #f59e0b', 'ROJO': '4px solid #ef4444', 'NONE': '0px solid transparent' };
                    row.style.backgroundColor = statusColors[act.id] || 'transparent';
                    row.style.borderLeft = statusBorders[act.id] || '0 solid transparent';

                    // Add to pending updates for debounced batch save
                    UI._pendingDbUpdates[hash] = data;

                    if (UI._saveTimeout) clearTimeout(UI._saveTimeout);

                    if (typeof UI.setSyncing === 'function') {
                        UI.setSyncing(true);
                    }

                    UI._saveTimeout = setTimeout(async () => {
                        const updatesToProcess = { ...UI._pendingDbUpdates };
                        UI._pendingDbUpdates = {};

                        const db = await DB_Engine.fetch(KEYS.TRANSACTIONS, { items: {} });
                        Object.assign(db.items, updatesToProcess);
                        await DB_Engine.commit(KEYS.TRANSACTIONS, db);

                        if (typeof UI.setSyncing === 'function') {
                            UI.setSyncing(false);
                        }

                        if (typeof UI.refreshDashboard === 'function') {
                            await UI.refreshDashboard();
                        }
                    }, 500);
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
