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
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Inter:wght@400;700&display=swap');

            :root {
                --mx-bg: rgba(10, 12, 18, 0.95);
                --mx-primary: #ec7000;
                --mx-primary-dim: rgba(236, 112, 0, 0.2);
                --mx-accent: #3b82f6;
                --mx-border: rgba(255, 255, 255, 0.08);
                --mx-glass: rgba(255, 255, 255, 0.03);
            }

            #mx-master-launcher {
                position: fixed;
                bottom: 30px;
                right: 30px;
                width: 68px;
                height: 68px;
                background: var(--mx-primary);
                color: white;
                border-radius: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 99999;
                cursor: pointer;
                box-shadow: 0 10px 30px rgba(236,112,0,0.3), inset 0 1px 1px rgba(255,255,255,0.3);
                border: 1px solid rgba(255,255,255,0.1);
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                font-family: 'Outfit', sans-serif;
                font-weight: 800;
                font-size: 22px;
                user-select: none;
            }

            @keyframes mx-pulse {
                0%, 100% { border-color: rgba(245, 158, 11, 0.3); box-shadow: 0 0 0 rgba(245, 158, 11, 0); }
                50% { border-color: rgba(245, 158, 11, 0.6); box-shadow: 0 0 15px rgba(245, 158, 11, 0.2); }
            }

            #mx-master-launcher:hover {
                transform: scale(1.1) translateY(-5px);
                box-shadow: 0 15px 40px rgba(236,112,0,0.5), inset 0 1px 1px rgba(255,255,255,0.4);
            }

            #mx-launcher-wrapper {
                position: fixed;
                bottom: 30px;
                right: 30px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                z-index: 99999;
            }

            #mx-account-chip {
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(12px);
                border: 1px solid var(--mx-border);
                color: white;
                font-family: 'Outfit', sans-serif;
                font-size: 11px;
                font-weight: 700;
                padding: 4px 12px;
                border-radius: 10px;
                opacity: 0;
                transform: translateY(10px);
                transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            }

            #mx-account-chip.visible { opacity: 1; transform: translateY(0); }

            #mx-control-panel {
                position: fixed;
                top: 0;
                right: -450px;
                width: 420px;
                height: 100vh;
                background: var(--mx-bg);
                backdrop-filter: blur(40px) saturate(180%);
                z-index: 100000;
                box-shadow: -20px 0 80px rgba(0,0,0,0.8);
                border-left: 1px solid var(--mx-border);
                transition: right 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                display: flex;
                flex-direction: column;
                font-family: 'Outfit', sans-serif;
                color: white;
            }

            #mx-control-panel.active { right: 0; }

            .mx-header {
                padding: 30px 25px;
                border-bottom: 1px solid var(--mx-border);
                background: linear-gradient(to bottom, rgba(236,112,0,0.05) 0%, transparent 100%);
            }

            .mx-content {
                flex: 1;
                overflow-y: auto;
                padding: 25px;
                display: flex;
                flex-direction: column;
                gap: 20px;
            }

            .mx-card {
                background: var(--mx-glass);
                border: 1px solid var(--mx-border);
                border-radius: 20px;
                padding: 20px;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }

            .mx-card:hover {
                border-color: rgba(236, 112, 0, 0.3);
                background: rgba(255, 255, 255, 0.05);
                transform: translateY(-2px);
            }

            .mx-card h4 {
                margin: 0 0 15px 0;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                color: rgba(255, 255, 255, 0.4);
                font-weight: 800;
            }

            .mx-btn-action {
                width: 100%;
                padding: 14px;
                border-radius: 14px;
                background: var(--mx-primary);
                color: white;
                font-weight: 700;
                border: none;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                font-family: 'Outfit', sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                box-shadow: 0 4px 15px rgba(236,112,0,0.2);
            }

            .mx-btn-action:hover {
                filter: brightness(1.1);
                transform: scale(1.02);
                box-shadow: 0 8px 25px rgba(236,112,0,0.4);
            }

            .mx-btn-secondary {
                background: rgba(255,255,255,0.05);
                border: 1px solid var(--mx-border);
                box-shadow: none;
            }

            .mx-btn-secondary:hover {
                background: rgba(255,255,255,0.1);
                border-color: rgba(255,255,255,0.2);
            }

            .mx-stat-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 12px;
            }

            .mx-stat-item {
                text-align: center;
                padding: 18px 10px;
                border-radius: 16px;
                background: rgba(255,255,255,0.03);
                border: 1px solid var(--mx-border);
                transition: transform 0.3s ease;
            }

            .mx-stat-item:hover { transform: scale(1.05); }

            .mx-stat-item b { font-size: 20px; display: block; margin-bottom: 2px; }
            .mx-stat-item small { font-size: 9px; opacity: 0.6; text-transform: uppercase; font-weight: 700; }

            .mx-search-box {
                width: 100%;
                padding: 14px;
                background: rgba(0,0,0,0.2);
                border: 1px solid var(--mx-border);
                border-radius: 12px;
                color: white;
                font-family: 'Outfit', sans-serif;
                font-size: 13px;
                transition: all 0.3s ease;
            }

            .mx-search-box:focus {
                outline: none;
                border-color: var(--mx-primary);
                background: rgba(0,0,0,0.3);
                box-shadow: 0 0 0 3px rgba(236,112,0,0.1);
            }

            @keyframes mxPulse {
                0% { transform: scale(1); opacity: 0.8; }
                50% { transform: scale(1.2); opacity: 1; box-shadow: 0 0 10px var(--mx-primary); }
                100% { transform: scale(1); opacity: 0.8; }
            }

            .mx-sync-badge {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 10px;
                color: rgba(255,255,255,0.5);
                font-weight: 600;
            }

            .mx-sync-dot {
                width: 8px;
                height: 8px;
                background: #10b981;
                border-radius: 50%;
                transition: background 0.3s;
            }

            .mx-sync-dot.syncing {
                background: var(--mx-primary);
                animation: mxPulse 1s infinite;
            }

            /* Scrollbar Refinada */
            .mx-content::-webkit-scrollbar { width: 5px; }
            .mx-content::-webkit-scrollbar-track { background: transparent; }
            .mx-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
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
        btn.innerHTML = "MXA";
        btn.title = "Abrir panel Monexa";
        // El botón va dentro del wrapper pero necesita su propio positioning relativo
        btn.style.cssText = `
            position: relative;
            bottom: auto;
            right: auto;
            width: 68px;
            height: 68px;
            background: var(--mx-primary);
            color: white;
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 10px 30px rgba(236,112,0,0.3), inset 0 1px 1px rgba(255,255,255,0.3);
            border: 1px solid rgba(255,255,255,0.1);
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            font-family: 'Outfit', sans-serif;
            font-weight: 800;
            font-size: 22px;
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
            <div style="font-size:11px; font-weight:700; color:white; margin-left:34px; letter-spacing:0.5px; transition:color 0.3s;">ON</div>
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
        const installID = await LicenseSystem.getInstallationID();
        const isActivated = await LicenseSystem.isActivated();

        const existing = document.getElementById("mx-control-panel");
        if (existing) existing.remove();

        const updateStatus = typeof UpdateSystem !== 'undefined' ? await UpdateSystem.getStatus() : { newVersion: null };
        let updateHtml = "";
        
        if (updateStatus.newVersion) {
            updateHtml = `
                <!-- Banner de Actualización -->
                <div class="mx-card" style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.3); padding: 14px 16px; margin-bottom: 20px; animation: mx-pulse 2s infinite;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <span style="font-size: 16px;">🚀</span>
                        <div style="font-size: 13px; font-weight: 800; color: #f59e0b;">Nueva V${updateStatus.newVersion} Disponible</div>
                    </div>
                    <p style="font-size: 11px; color: rgba(255,255,255,0.7); line-height: 1.4; margin-bottom: 12px; font-family: 'Inter', sans-serif;">
                        Nuevas mejoras detectadas. Actualiza ahora para disfrutar de la mejor experiencia.
                    </p>
                    <a href="${updateStatus.url || "https://monexa-flow.vercel.app"}" target="_blank" style="
                        display: block; width: 100%; text-align: center;
                        background: #f59e0b; color: #000; padding: 10px;
                        border-radius: 10px; font-size: 11px; font-weight: 800;
                        text-decoration: none; transition: 0.3s;
                        font-family: 'Inter', sans-serif;
                    " onmouseenter="this.style.filter='brightness(1.1)'" onmouseleave="this.style.filter='none'">Descargar V${updateStatus.newVersion} (.zip)</a>
                </div>
            `;
        }

        const panel = document.createElement('div');
        panel.id = "mx-control-panel";
        panel.innerHTML = `
            <div class="mx-header" id="mx-panel-header" style="
                background: linear-gradient(135deg, var(--mx-primary) 0%, #ff8c00 100%);
                padding: 0;
                position: relative;
                overflow: hidden;
                cursor: pointer;
                user-select: none;
            ">
                <!-- Aura decorativa -->
                <div style="
                    position: absolute; top: -40px; right: -40px;
                    width: 160px; height: 160px;
                    background: rgba(255,255,255,0.08);
                    filter: blur(40px);
                    border-radius: 50%;
                    pointer-events: none;
                "></div>
                
                <!-- Contenido del header -->
                <div style="padding: 24px 20px 20px; position: relative; display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <svg width="28" height="28" viewBox="0 0 100 100" fill="none" stroke="white" stroke-width="6">
                            <ellipse cx="50" cy="50" rx="45" ry="18" transform="rotate(-30 50 50)" opacity="0.3" />
                            <ellipse cx="50" cy="50" rx="30" ry="12" transform="rotate(-30 50 50)" opacity="0.6" />
                            <circle cx="50" cy="50" r="10" fill="white" />
                        </svg>
                        <span style="
                            font-size: 10px; font-weight: 800;
                            color: white;
                            text-transform: uppercase; letter-spacing: 2px;
                            opacity: 0.8;
                        ">Monexa Flow</span>
                    </div>

                    <div class="mx-sync-badge">
                        <div id="mx-sync-dot" class="mx-sync-dot"></div>
                        <span>Sync</span>
                    </div>
                </div>

                <!-- Botón cerrar -->
                <button id="mx-panel-close" style="
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.1);
                    color: white;
                    width: 32px; height: 32px;
                    border-radius: 10px;
                    cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    transition: all 0.3s;
                    z-index: 100;
                " onmouseenter="this.style.background='rgba(255,255,255,0.2)'; this.style.transform='scale(1.1)';"
                   onmouseleave="this.style.background='rgba(255,255,255,0.1)'; this.style.transform='';"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>

                <!-- Auditor Info -->
                <div style="display: flex; align-items: center; gap: 16px; padding: 0 20px 30px;">
                    <div style="
                        width: 56px; height: 56px;
                        background: rgba(0,0,0,0.3);
                        border: 1px solid rgba(255,255,255,0.2);
                        border-radius: 18px;
                        display: flex; align-items: center; justify-content: center;
                        font-size: 24px; font-weight: 800; color: white;
                        flex-shrink: 0;
                        box-shadow: 0 8px 16px rgba(0,0,0,0.2);
                    ">${(config.user || "?")[0].toUpperCase()}</div>

                    <div style="flex: 1;">
                        <div style="font-size: 20px; font-weight: 800; color: white; letter-spacing: -0.5px; line-height: 1.1;">
                            ${(config.user || "Auditor").toUpperCase()}
                        </div>
                        <div style="font-size: 11px; color: rgba(255,255,255,0.6); margin-top: 6px; display: flex; align-items: center; gap: 8px;">
                            <a id="mx-panel-logout" href="#" style="color: white; text-decoration: none; font-weight: 700; opacity: 0.7; transition: 0.3s;" onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='0.7'">Cerrar Sesión</a>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Línea decorativa inferior -->
            <div style="height: 3px; background: linear-gradient(90deg, var(--itau-blue), var(--itau-blue-dark), transparent);"></div>

            <div class="mx-content">
                ${updateHtml}
                <!-- Sección de Licencia y Activación -->
                <div class="mx-card" style="border-left: 4px solid ${isActivated ? '#10b981' : '#f59e0b'};">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                        <h4 style="margin: 0;">Licencia / Configuración</h4>
                        <div style="font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 6px; background: ${isActivated ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)'}; color: ${isActivated ? '#10b981' : '#f59e0b'};">
                            ${isActivated ? 'ACTIVADO' : 'REQUIERE CÓDIGO'}
                        </div>
                    </div>
                    
                    <div style="background: rgba(0,0,0,0.2); border-radius: 12px; padding: 12px; margin-bottom: 15px; border: 1px solid rgba(255,255,255,0.05);">
                        <div style="font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; font-weight: 800; margin-bottom: 4px; letter-spacing: 0.5px;">ID de Instalación Único:</div>
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <code style="font-size: 14px; color: white; font-weight: 700; letter-spacing: 1px;">${installID}</code>
                            <button id="mx-btn-copy-id" style="background: rgba(255,255,255,0.05); border: none; color: white; padding: 4px 8px; border-radius: 6px; font-size: 10px; cursor: pointer; font-weight: 700;">COPIAR</button>
                        </div>
                    </div>

                    ${!isActivated ? `
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            <input type="text" id="mx-input-activation" placeholder="Ingresar Código de Activación..." style="
                                width: 100%; padding: 12px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: white; font-family: 'Outfit', sans-serif; font-size: 12px; text-align: center;
                            ">
                            <button id="mx-btn-activate" class="mx-btn-action" style="margin: 0; background: var(--mx-primary);">ACTIVAR AHORA</button>
                        </div>
                    ` : `
                        <div style="font-size: 11px; color: rgba(255,255,255,0.5); text-align: center; line-height: 1.4;">
                            Suscripción válida para el mes en curso. Todo el procesamiento es 100% local y privado.
                        </div>
                    `}
                </div>

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
                    <div class="mx-card" style="padding: 30px 20px; text-align: center; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1);">
                        <div style="font-size: 32px; margin-bottom: 15px;">🔒</div>
                        <h4 style="margin-bottom: 8px;">Funciones Bloqueadas</h4>
                        <p style="font-size: 11px; color: rgba(255,255,255,0.5); line-height: 1.4;">
                            Active su licencia para habilitar el motor de reglas, el dashboard de estadísticas y el etiquetado de movimientos.
                        </p>
                    </div>
                `}

                <!-- Integridad Contable (Gap Detection) -->
                <div class="mx-card" id="mx-integrity-card" style="border-left: 4px solid #64748b; transition: all 0.3s;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                        <h4 style="margin: 0;">Integridad Contable</h4>
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

                <!-- Resumen de auditoría -->
                <div class="mx-card">
                    <h4>Resumen del Control</h4>
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
                    <h4>Motor de Reglas Inteligentes</h4>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <input type="text" id="mx-rule-pat" class="mx-search-box" style="padding: 10px; font-size: 13px;" placeholder="Si el concepto contiene...">
                        <input type="text" id="mx-rule-amt" class="mx-search-box" style="padding: 10px; font-size: 13px;" placeholder="Importe (Ej: 1540.00)">
                        <input type="text" id="mx-rule-lab" class="mx-search-box" style="padding: 10px; font-size: 13px;" placeholder="Asignar etiqueta...">
                        <input type="text" id="mx-rule-not" class="mx-search-box" style="padding: 10px; font-size: 13px;" placeholder="Nota adicional (Ej: MUÑOZ)">
                        
                        <div style="margin: 10px 0;">
                            <div style="font-size: 10px; color: rgba(255,255,255,0.4); margin-bottom: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Color del Marcador:</div>
                            <div id="mx-rule-colors" style="display: flex; gap: 10px;">
                                ${Object.entries(RULE_COLORS).map(([key, c]) => `
                                    <div class="mx-color-dot" data-color="${key}" title="${c.label}" style="
                                        width: 28px; height: 28px;
                                        border-radius: 10px;
                                        background: ${c.hex};
                                        cursor: pointer;
                                        border: 2px solid ${key === 'verde' ? 'white' : 'transparent'};
                                        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                                        box-shadow: 0 4px 10px ${c.hex}44;
                                    " onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"></div>
                                `).join('')}
                            </div>
                        </div>

                        <button id="mx-btn-add-rule" class="mx-btn-action" style="margin-top: 5px;">+ Crear Regla Automática</button>
                        
                        <div id="mx-rules-list" style="margin-top: 15px; max-height: 180px; overflow-y: auto; padding-right: 5px; display: flex; flex-direction: column; gap: 6px;"></div>

                        <div style="display: flex; gap: 8px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px; margin-top: 10px;">
                            <button id="mx-btn-exp-rules" class="mx-btn-action mx-btn-secondary" style="flex:1; padding: 10px; font-size: 11px;">Exportar</button>
                            <button id="mx-btn-imp-rules" class="mx-btn-action mx-btn-secondary" style="flex:1; padding: 10px; font-size: 11px;">Importar</button>
                            <input type="file" id="mx-file-rules" style="display:none" accept=".csv">
                        </div>
                    </div>
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
                const currentSettings = await DB_Engine.fetch(KEYS.SETTINGS, {});
                const newSettings = { 
                    ...currentSettings, 
                    user: '', 
                    role: 'user', 
                    enabled: false 
                };
                await DB_Engine.commit(KEYS.SETTINGS, newSettings);
                await DB_Engine.commit(KEYS.SYSTEM_STATE, { enabled: false });
                await Logger.info(`Sesión finalizada`);
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

        if (document.getElementById('mx-btn-copy-id')) {
            document.getElementById('mx-btn-copy-id').onclick = () => {
                navigator.clipboard.writeText(installID);
                alert("ID de Instalación copiado al portapapeles.");
            };
        }

        if (document.getElementById('mx-btn-activate')) {
            document.getElementById('mx-btn-activate').onclick = async () => {
                const key = document.getElementById('mx-input-activation').value.trim();
                const res = await LicenseSystem.activate(key);
                if (res.success) {
                    alert("¡Sistema activado exitosamente!");
                    location.reload();
                } else {
                    alert("Llave de acceso inválida. Verifique el código o consulte a su asesor.");
                }
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
     */
    async _recalculateGap() {
        if (this._officialBalance === undefined || isNaN(this._officialBalance)) return;
        
        const db = await DB_Engine.fetch(KEYS.TRANSACTIONS, { items: {} });
        const items = Object.values(db.items || {});
        
        const internalSum = items.reduce((acc, curr) => {
            const amt = curr.amount || 0;
            return curr.direction === 'IN' ? acc + amt : acc - amt;
        }, 0);

        const intVal = document.getElementById('mx-internal-val');
        if (intVal) intVal.textContent = `$ ${Math.abs(internalSum).toLocaleString('es-UY', { minimumFractionDigits: 2 })}`;

        const gapRow = document.getElementById('mx-gap-row');
        const gapVal = document.getElementById('mx-gap-val');
        const status = document.getElementById('mx-integrity-status');
        const card = document.getElementById('mx-integrity-card');

        if (gapRow && gapVal && status && card) {
            gapRow.style.display = 'flex';
            const gap = Math.abs(this._officialBalance - Math.abs(internalSum));
            gapVal.textContent = `$ ${gap.toLocaleString('es-UY', { minimumFractionDigits: 2 })}`;

            if (gap < 0.01) {
                status.textContent = 'INTEGRO';
                status.style.background = '#065f46';
                status.style.color = '#34d399';
                card.style.borderLeftColor = '#10b981';
            } else {
                status.textContent = 'BRECHA';
                status.style.background = '#991b1b';
                status.style.color = '#f87171';
                card.style.borderLeftColor = '#ef4444';
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
                    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:6px 10px; margin-bottom:6px;">
                        <div style="display:flex; align-items:center; gap:6px; font-size:11px; color:rgba(255,255,255,0.7); max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeStr(r.pattern)}${r.importe ? ' + ' + escapeStr(r.importe) : ''} → ${escapeStr(r.label)}${r.note ? ' [' + escapeStr(r.note) + ']' : ''} (${ruleColor.label})">
                            <b style="color:rgba(255,255,255,0.9);">${escapeStr(r.pattern)}</b>${amtText} → <span style="background:${ruleColor.hex}; color:white; padding:2px 6px; border-radius:99px; font-weight:700; font-size:9px; vertical-align:middle; margin-left:4px;">${escapeStr(r.label)}</span>${noteText}
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
