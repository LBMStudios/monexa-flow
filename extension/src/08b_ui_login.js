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
                    Bienvenido a <b>Monexa Flow</b>.<br>Ingresa tu Identificador para comenzar el seguimiento.
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

            // Lógica de validación de usuarios apoyada en DB_Engine
            let users = await DB_Engine.fetch(KEYS.USERS, []);
            let role = 'user';

            if (users.length === 0) {
                // Primer ingreso global: El primer usuario se convierte en Admin automáticamente
                role = 'admin';
                const firstUser = { 
                    name: user, 
                    role: role, 
                    enabled: true,
                    loginCount: 1,
                    lastActive: new Date().toISOString()
                };
                users.push(firstUser);
                
                // Guardado atómico en base de datos maestra
                await DB_Engine.commit(KEYS.USERS, users);
                
                if (typeof CloudConnector !== 'undefined') {
                    await CloudConnector.pushRemoteUsers(users);
                }

                await Logger.info(`Primer acceso: cuenta master (${user}) creada como ADMINISTRADOR.`);
            } else {
                // Validar acceso para sistema ya inicializado
                const foundUser = users.find(u => u.name.toLowerCase() === user.toLowerCase());

                const showErrorScreen = (icon, title, message) => {
                    const overlay = document.getElementById('mx-welcome-overlay');
                    if (overlay) {
                        overlay.innerHTML = `
                            <div style="
                                background: rgba(255, 255, 255, 0.03);
                                border: 1px solid rgba(225, 29, 72, 0.3);
                                padding: 60px 40px;
                                border-radius: 32px;
                                width: 460px;
                                text-align: center;
                                box-shadow: 0 40px 100px rgba(0,0,0,0.8);
                                animation: mx-shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
                            ">
                                <div style="
                                    width: 80px; height: 80px; margin: 0 auto 30px; 
                                    display: flex; align-items: center; justify-content: center; 
                                    background: rgba(225, 29, 72, 0.1); border: 1px solid rgba(225, 29, 72, 0.2); 
                                    border-radius: 24px;
                                ">
                                    <span style="font-size: 32px;">${icon}</span>
                                </div>
                                <h2 style="font-size: 28px; font-weight: 800; margin: 0 0 16px 0; color: white; letter-spacing: -1px; font-family: 'Outfit', sans-serif;">${title}</h2>
                                <p style="font-size: 15px; color: rgba(255,255,255,0.7); margin: 0 auto 40px auto; line-height: 1.6; max-width: 320px; font-family: 'Outfit', sans-serif;">${message}</p>
                                <button id="mx-btn-error-back" style="
                                    width: 100%; padding: 18px; 
                                    background: rgba(255,255,255,0.05); color: white; 
                                    border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; 
                                    font-weight: 700; font-family: 'Outfit', sans-serif;
                                    cursor: pointer; transition: all 0.3s;
                                " onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">VOLVER A INTENTAR</button>
                            </div>
                        `;
                        overlay.style.background = 'radial-gradient(circle at 50% 10%, rgba(225, 29, 72, 0.2) 0%, #0a0c12 70%)';
                        document.getElementById('mx-btn-error-back').onclick = () => window.location.reload();
                    }
                };

                if (!foundUser) {
                    showErrorScreen('❓', 'Auditor No Encontrado', `El usuario <b>"${user}"</b> no tiene permiso de acceso. Contacte al administrador.`);
                    return;
                }
                if (!foundUser.enabled) {
                    showErrorScreen('🚫', 'Acceso Denegado', `El usuario <b>"${user}"</b> está inhabilitado por el administrador.`);
                    return;
                }
                role = foundUser.role || 'user';

                foundUser.loginCount = (foundUser.loginCount || 0) + 1;
                foundUser.lastActive = new Date().toISOString();
                await DB_Engine.commit(KEYS.USERS, users);

                if (typeof CloudConnector !== 'undefined') {
                    await CloudConnector.pushRemoteUsers(users);
                }
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
    }
};
