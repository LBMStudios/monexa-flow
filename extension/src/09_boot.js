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
            console.warn(`MONEXA FLOW v${VERSION} está desactivado.`);
            if (window === window.top) {
                UI.renderDisabledLauncher();
            }
            return;
        }

        await UI.init();

        console.log(
            `%c MONEXA FLOW v${VERSION} INICIADO %c`,
            `background:${PALETTE.itau_orange};color:white;padding:5px;border-radius:3px;`,
            ""
        );
    } catch (e) {
        console.error("Critical Failure in Monexa Initialization:", e);
        // Solo logear si el contexto sigue vivo
        if (chrome.runtime?.id) {
            await Logger.error("Critical Init Failure: " + e.message);
        }
    }
})();
