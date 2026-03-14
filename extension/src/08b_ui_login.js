/**
 * 08b_ui_login.js — MONEXA FLOW
 * Componente separado para la pantalla de bienvenida y validación inicial de usuario.
 */

'use strict';

const UILogin = {
    /**
     * Dibuja el overlay oscuro y el diálogo de inicio de sesión.
     * Si no hay usuarios en BD, permite la creación de un 'admin'.
     */
    renderWelcome() {
        const overlay = document.createElement('div');
        overlay.id = 'mx-welcome-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: radial-gradient(circle at 50% 0%, rgba(236, 112, 0, 0.15) 0%, rgba(10, 12, 18, 0.98) 70%);
            backdrop-filter: blur(30px) saturate(160%); -webkit-backdrop-filter: blur(30px) saturate(160%);
            z-index: 200000; display: flex; align-items: center; justify-content: center;
            font-family: 'Outfit', sans-serif;
            animation: mx-fade-in 1.2s cubic-bezier(0.16, 1, 0.3, 1);
        `;

        overlay.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap');
                @keyframes mx-fade-in { from { opacity: 0; } to { opacity: 1; }}
                @keyframes mx-slide-up { from { opacity: 0; transform: translateY(60px); } to { opacity: 1; transform: translateY(0); }}
                @keyframes mx-orb-pulse { 0%, 100% { transform: scale(1); opacity: 0.2; } 50% { transform: scale(1.1); opacity: 0.3; }}
                @keyframes mx-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); }}
                @keyframes mx-shake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-10px); } 40%, 80% { transform: translateX(10px); }}
            </style>
            <div style="
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255,255,255,0.08);
                padding: 60px 40px;
                border-radius: 32px;
                width: 460px;
                text-align: center;
                box-shadow: 0 40px 100px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.1);
                animation: mx-slide-up 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                position: relative;
                overflow: hidden;
            ">
                <!-- Orb decorativo -->
                <div style="
                    position: absolute; top: -50px; left: 50%; transform: translateX(-50%);
                    width: 200px; height: 200px;
                    background: radial-gradient(circle, rgba(236,112,0,0.4) 0%, transparent 70%);
                    z-index: -1; animation: mx-orb-pulse 4s infinite ease-in-out;
                "></div>
                
                <div style="margin-bottom: 40px;">
                    <h1 style="color: white; font-size: 64px; margin: 0; font-weight: 800; letter-spacing: -3px; line-height: 1;">MX</h1>
                    <div style="
                        display: inline-block; padding: 4px 12px; background: rgba(236,112,0,0.1);
                        border-radius: 8px; margin-top: 10px; color: ${PALETTE.itau_orange};
                        font-size: 11px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase;
                    ">Control de Auditoría</div>
                </div>
                
                <p style="color: rgba(255,255,255,0.6); font-size: 16px; margin-bottom: 40px; line-height: 1.6; font-family: 'Outfit', sans-serif;">
                    Bienvenido a <b>Monexa Flow</b>.<br>Ingresa tu nombre para iniciar la sesión de auditoría.
                </p>
                <div style="position: relative; margin-bottom: 30px;">
                    <input type="text" id="mx-init-user" placeholder="USUARIO..." autocomplete="off" style="
                        width: 100%; padding: 18px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);
                        background: rgba(0,0,0,0.3); color: white; font-family: 'Outfit', sans-serif;
                        font-size: 16px; text-align: center; font-weight: 700; letter-spacing: 1px;
                        transition: all 0.3s;
                    " onfocus="this.style.borderColor='${PALETTE.itau_orange}'; this.style.background='rgba(0,0,0,0.5)'; this.style.boxShadow='0 0 0 4px rgba(236,112,0,0.1), inset 0 4px 20px rgba(0,0,0,0.4)'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'; this.style.background='rgba(0,0,0,0.3)'; this.style.boxShadow='inset 0 4px 20px rgba(0,0,0,0.4)'">
                </div>
                
                <button id="mx-init-btn" style="
                    width: 100%; padding: 20px; border-radius: 16px; border: none;
                    background: ${PALETTE.itau_orange}; color: white; font-weight: 800;
                    font-size: 18px; cursor: pointer; margin-bottom: 30px;
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); box-shadow: 0 10px 30px rgba(236,112,0,0.3);
                    font-family: 'Outfit', sans-serif; letter-spacing: 1px;
                    display: flex; align-items: center; justify-content: center; gap: 10px;
                " onmouseover="this.style.transform='translateY(-4px) scale(1.02)'; this.style.boxShadow='0 20px 40px rgba(236,112,0,0.4)'" onmouseout="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 10px 30px rgba(236,112,0,0.3)'">
                    <span>INGRESAR AL SISTEMA</span>
                </button>

                <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 15px; display: flex; align-items: center; gap: 15px; color: rgba(255,255,255,0.6); font-size: 11px; text-align: left;">
                    <div style="font-size: 24px;">👤</div>
                    <div style="line-height: 1.4;">
                        <b>Identidad de Auditor.</b> Ingrese su usuario autorizado para acceder al panel de seguimiento.
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const loginBtn = document.getElementById('mx-init-btn');
        const userInput = document.getElementById('mx-init-user');

        loginBtn.onclick = async () => {
            const user = userInput.value.trim();
            
            if (!user) {
                alert("Por favor, ingrese su usuario.");
                return;
            }

            // Estado de carga
            loginBtn.disabled = true;
            loginBtn.style.opacity = '0.7';
            loginBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" style="animation: mx-spin 1s linear infinite;">
                    <circle cx="12" cy="12" r="10" stroke="white" stroke-width="4" fill="none" style="opacity:0.2;"></circle>
                    <path d="M12 2 a10 10 0 0 1 10 10" stroke="white" stroke-width="4" stroke-linecap="round" fill="none"></path>
                </svg>
                <span>VERIFICANDO...</span>
            `;

            // 1. VALIDACIÓN PERMANENTE (v1.4.0) - Bypass por solicitud: "sacrificar seguridad"
            const isNameActivated = await LicenseSystem.isActivated(user);
            
            if (!isNameActivated && user.toUpperCase() !== 'LUCAS' && user.toUpperCase() !== 'JAVIERB') {
                console.warn("[Monexa] Usuario no activado matemáticamente:", user);
                // Por ahora dejamos pasar para no bloquear la operación
            }

            // 2. Lógica de registro en base de datos local (Auditoría)
            let users = await DB_Engine.fetch(KEYS.USERS, []);
            let role = 'user';

            if (users.length === 0) {
                role = 'admin';
                const firstUser = { name: user, role: role, enabled: true, loginCount: 1, lastActive: new Date().toISOString() };
                users.push(firstUser);
                await DB_Engine.commit(KEYS.USERS, users);
                await Logger.info(`Primer acceso Sovereign: (${user}) inicializado como ADMINISTRADOR.`);
            } else {
                let foundUser = users.find(u => u.name.toLowerCase() === user.toLowerCase());
                
                if (!foundUser) {
                    foundUser = { name: user, role: 'user', enabled: true, loginCount: 0, lastActive: new Date().toISOString() };
                    users.push(foundUser);
                }

                if (!foundUser.enabled) {
                    showErrorScreen('🚫', 'Acceso Denegado', `El usuario <b>"${user}"</b> está inhabilitado localmente.`);
                    return;
                }

                // Resolver el rol real del usuario desde la base de datos
                role = foundUser.role || 'user';

                foundUser.loginCount = (foundUser.loginCount || 0) + 1;
                foundUser.lastActive = new Date().toISOString();
                await DB_Engine.commit(KEYS.USERS, users);
            }

            // Iniciar sesión y guardar contexto
            const currentSettings = await DB_Engine.fetch(KEYS.SETTINGS, {});
            const newSettings = { 
                ...currentSettings, 
                user, 
                role, 
                enabled: true 
            };
            
            await DB_Engine.commit(KEYS.SETTINGS, newSettings);
            await DB_Engine.commit(KEYS.SYSTEM_STATE, { enabled: true });
            
            await Logger.info(`Sesión iniciada por ${user} (${role})`);
            
            if (overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.remove();
                    if (typeof UI !== 'undefined') {
                        UI.renderControlCenter();
                        UI.renderLauncher();
                    }
                    if (typeof Scanner !== 'undefined') {
                        Scanner.init();
                    }
                }, 800);
            }
        };
    },

    /**
     * Dibuja la pantalla de activación obligatoria (v1.3.9).
     * Muestra el ID de Instalación y solicita la Llave Mensual.
     */
    async renderActivation() {
        const installID = await LicenseSystem.getInstallationID();
        
        const overlay = document.createElement('div');
        overlay.id = 'mx-activation-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: radial-gradient(circle at 50% 10%, #1e293b 0%, #020617 100%);
            z-index: 210000; display: flex; align-items: center; justify-content: center;
            font-family: 'Outfit', sans-serif;
            animation: mx-fade-in 1.2s cubic-bezier(0.16, 1, 0.3, 1);
        `;

        overlay.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap');
                @keyframes mx-pulse-soft { 0%, 100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.05); opacity: 0.8; } }
            </style>
            <div style="
                background: rgba(255, 255, 255, 0.02);
                border: 1px solid rgba(255,255,255,0.08);
                padding: 50px; border-radius: 32px; width: 480px; text-align: center;
                box-shadow: 0 50px 100px rgba(0,0,0,0.9);
                animation: mx-slide-up 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            ">
                <div style="margin-bottom: 30px;">
                    <div style="font-size: 12px; font-weight: 800; color: ${PALETTE.amber}; text-transform: uppercase; letter-spacing: 2px;">Sistema Inactivo</div>
                    <h2 style="color: white; font-size: 32px; font-weight: 800; margin: 10px 0; letter-spacing: -1px;">Activación de Monexa</h2>
                </div>

                <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 25px; margin-bottom: 30px; position: relative;">
                    <div style="font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; font-weight: 800; margin-bottom: 10px; letter-spacing: 1px;">Tu ID de Instalación:</div>
                    <div style="display: flex; align-items: center; justify-content: center; gap: 15px;">
                        <div style="font-size: 28px; color: white; font-weight: 800; letter-spacing: 2px; font-family: 'Outfit', sans-serif;">${installID}</div>
                        <button id="mx-btn-copy-id" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: white; padding: 5px 10px; font-size: 10px; cursor: pointer; font-weight: 700;">COPIAR</button>
                    </div>
                    <div style="font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 15px; line-height: 1.4;">
                        Proporcione este código a su administrador para obtener su <b>Llave de Activación Permanente</b>.
                    </div>
                </div>

                <div style="margin-bottom: 25px; display: flex; flex-direction: column; gap: 12px;">
                    <input type="text" id="mx-activation-name" placeholder="NOMBRE DEL AUDITOR..." style="
                        width: 100%; padding: 18px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);
                        background: rgba(0,0,0,0.3); color: white; font-family: 'Outfit', sans-serif;
                        font-size: 14px; text-align: center; font-weight: 700;
                    ">
                    <input type="text" id="mx-activation-key" placeholder="LLAVE DE ACTIVACIÓN..." style="
                        width: 100%; padding: 20px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1);
                        background: rgba(0,0,0,0.5); color: white; font-family: 'Outfit', sans-serif;
                        font-size: 18px; text-align: center; font-weight: 800; letter-spacing: 4px; border: 2px solid rgba(255,255,255,0.05);
                    ">
                </div>

                <button id="mx-btn-activate" style="
                    width: 100%; padding: 20px; border-radius: 16px; border: none;
                    background: white; color: black; font-weight: 800; font-size: 16px; cursor: pointer;
                    transition: all 0.3s; font-family: 'Outfit', sans-serif;
                " onmouseover="this.style.background='${PALETTE.amber}'; this.style.color='white'" onmouseout="this.style.background='white'; this.style.color='black'">
                    ACTIVAR AHORA
                </button>

                <div style="margin-top: 30px; font-size: 11px; color: rgba(255,255,255,0.3);">
                    Monexa Flow v${VERSION} — Permanent Activation Model
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        document.getElementById('mx-btn-copy-id').onclick = () => {
            navigator.clipboard.writeText(installID);
            const btn = document.getElementById('mx-btn-copy-id');
            btn.innerText = "¡COPIADO!";
            btn.style.background = PALETTE.success;
            setTimeout(() => {
                btn.innerText = "COPIAR";
                btn.style.background = 'rgba(255,255,255,0.1)';
            }, 2000);
        };

        document.getElementById('mx-btn-activate').onclick = async () => {
            const name = document.getElementById('mx-activation-name').value.trim();
            const key = document.getElementById('mx-activation-key').value.trim();
            
            if (!name) { alert("Ingresa el nombre del auditor"); return; }
            if (!key) { alert("Ingresa la llave de activación"); return; }

            const btn = document.getElementById('mx-btn-activate');
            btn.disabled = true;
            btn.innerText = "VALIDANDO LLAVE PERMANENTE...";

            const res = await LicenseSystem.activate(name, key);
            if (res.success) {
                btn.style.background = PALETTE.success;
                btn.style.color = "white";
                btn.innerText = "¡ACTIVADO PARA SIEMPRE!";
                setTimeout(() => window.location.reload(), 1500);
            } else {
                alert(res.error || "Llave incorrecta.");
                btn.disabled = false;
                btn.innerText = "ACTIVAR AHORA";
            }
        };
    }
};
