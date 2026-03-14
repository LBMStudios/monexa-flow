/**
 * 09_boot.js — MONEXA FLOW
 * Arranque del sistema. Punto de entrada principal.
 * Verifica el estado del sistema y delega la inicialización a UI.
 * Depende de: todos los módulos anteriores (00–08).
 */

'use strict';

(async function boot() {
    console.info("%c[Monexa Debug] Initiating Boot Flow... v" + VERSION, "color: #ec7000; font-weight: bold;");
    if (typeof LicenseSystem !== 'undefined') await LicenseSystem.debug();
    
    try {
        // Marcador visual de carga para diagnóstico
        const debugTag = document.createElement('div');
        debugTag.id = 'mx-boot-tag';
        debugTag.style.cssText = 'position:fixed; top:2px; left:2px; background:rgba(236,112,0,0.8); color:white; font-size:8px; padding:2px 4px; z-index:999999; border-radius:3px; pointer-events:none;';
        debugTag.innerText = 'MX:BOOTING';
        document.body.appendChild(debugTag);

        // Validar que el contexto de extensión siga vivo
        if (!chrome.runtime?.id) {
            console.warn("Monexa: contexto de extensión no disponible, abortando boot.");
            return;
        }

        const enabled = await SystemControl.isUserEnabled();
        console.log("[Monexa Boot] SystemControl.isUserEnabled:", enabled);

        if (!enabled) {
            console.warn("MONEXA FLOW está desactivado por el usuario.");
            if (window === window.top) {
                UI.renderDisabledLauncher();
                if (document.getElementById('mx-boot-tag')) document.getElementById('mx-boot-tag').innerText = 'MX:OFF';
            }
            return;
        }

        // --- Verificación de Actualizaciones ---
        console.log("[Monexa Boot] Iniciando UI.init...");
        await UI.init();

        // --- Registro de Actividad Silencioso (Check-in) ---
        const config = await DB_Engine.fetch(KEYS.SETTINGS, { user: "" });
        if (config.user) {
            let users = await DB_Engine.fetch(KEYS.USERS, []);
            let currentUser = users.find(u => u.name.toLowerCase() === config.user.toLowerCase());
            
            if (currentUser) {
                // Solo incrementamos el contador de inicios si no hubo actividad reciente (last 30m)
                // para evitar inflar el número con simples recargas de página.
                const last = currentUser.lastActive ? new Date(currentUser.lastActive).getTime() : 0;
                const nowMs = Date.now();
                
                if (nowMs - last > 30 * 60 * 1000) {
                    currentUser.loginCount = (currentUser.loginCount || 0) + 1;
                }
                
                currentUser.lastActive = new Date().toISOString();
                await DB_Engine.commit(KEYS.USERS, users);
            }
        }

        console.log(
            `%c MONEXA FLOW v${VERSION} INICIADO %c`,
            `background:${PALETTE.itau_orange};color:white;padding:5px;border-radius:3px;`,
            ""
        );
    } catch (e) {
        console.error("Critical Failure in Monexa Initialization:", e);
        if (chrome.runtime?.id) {
            await Logger.error("Critical Init Failure: " + e.message);
        }
    }
})();
