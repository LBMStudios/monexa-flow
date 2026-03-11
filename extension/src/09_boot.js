/**
 * 09_boot.js — MONEXA FLOW
 * Arranque del sistema. Punto de entrada principal.
 * Verifica el estado del sistema y delega la inicialización a UI.
 * Depende de: todos los módulos anteriores (00–08).
 */

'use strict';

(async function boot() {
    try {
        // Validar que el contexto de extensión siga vivo
        if (!chrome.runtime?.id) {
            console.warn("Monexa: contexto de extensión no disponible, abortando boot.");
            return;
        }

        const enabled = await SystemControl.isEnabled();

        if (!enabled) {
            await Logger.info(`MONEXA FLOW v${VERSION} está desactivado.`);
            if (window === window.top) {
                UI.renderDisabledLauncher();
            }
            return;
        }

        // --- Sincronización de Usuarios al Arranque ---
        if (typeof CloudConnector !== 'undefined') {
            CloudConnector.syncRemoteUsers();
        }

        // --- Verificación de Actualizaciones ---
        if (typeof UpdateSystem !== 'undefined') {
            UpdateSystem.check();
        }

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

        // V2 — Monitor de Salud y Heartbeat de Actividad
        const healthCheck = setInterval(async () => {
            // 1. Validar contexto
            if (!chrome.runtime?.id) {
                console.warn("Monexa: Contexto invalidado. Deteniendo monitores.");
                clearInterval(healthCheck);
                if (window === window.top) {
                    const panel = document.getElementById('mx-control-panel');
                    if (panel) {
                        panel.style.filter = 'grayscale(1) opacity(0.5)';
                        panel.style.pointerEvents = 'none';
                        panel.style.borderLeft = '4px solid #ef4444';
                    }
                }
                return;
            }

            // 2. Heartbeat de Actividad (Cada 3 minutos para el panel maestro)
            const config = await DB_Engine.fetch(KEYS.SETTINGS, { user: "" });
            if (config.user) {
                let users = await DB_Engine.fetch(KEYS.USERS, []);
                let currentUser = users.find(u => u.name.toLowerCase() === config.user.toLowerCase());
                if (currentUser) {
                    const now = Date.now();
                    const last = currentUser.lastActive ? new Date(currentUser.lastActive).getTime() : 0;
                    
                    // Solo empujamos si pasaron más de 3 minutos para no saturar Firebase
                    if (now - last > 3 * 60 * 1000) {
                        currentUser.lastActive = new Date().toISOString();
                        await DB_Engine.commit(KEYS.USERS, users);
                        console.log("Monexa: Heartbeat enviado.");
                    }
                }
            }
        }, 10000); // Check cada 10s, pero pulsa cada 3m
    } catch (e) {
        console.error("Critical Failure in Monexa Initialization:", e);
        // Solo logear si el contexto sigue vivo
        if (chrome.runtime?.id) {
            await Logger.error("Critical Init Failure: " + e.message);
        }
    }
})();
