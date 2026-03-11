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
            background: radial-gradient(circle at 50% 10%, rgba(236, 112, 0, 0.25) 0%, rgba(15, 20, 35, 0.98) 60%);
            backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
            z-index: 200000; display: flex; align-items: center; justify-content: center;
            font-family: 'Inter', sans-serif;
            animation: mx-fade-in 0.8s cubic-bezier(0.1, 0, 0.1, 1);
        `;

        overlay.innerHTML = `
            <style>
                @keyframes mx-fade-in { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(20px); }}
                @keyframes mx-slide-up { from { opacity: 0; transform: translateY(40px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); }}
                @keyframes mx-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); }}
            </style>
            <div style="
                background: rgba(20, 25, 45, 0.7);
                border: 1px solid rgba(255,255,255,0.08);
                padding: 50px;
                border-radius: 24px;
                width: 440px;
                text-align: center;
                box-shadow: 0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1);
                animation: mx-slide-up 1s cubic-bezier(0.1, 0, 0.1, 1) forwards;
                position: relative;
                overflow: hidden;
            ">
                <div style="position: absolute; top: -100px; left: -100px; width: 250px; height: 250px; background: radial-gradient(circle, rgba(236,112,0,0.15) 0%, transparent 70%); border-radius: 50%;"></div>
                
                <div style="animation: mx-float 6s ease-in-out infinite;">
                    <h1 style="color: white; font-size: 56px; margin: 0 0 10px 0; font-weight: 900; letter-spacing: -2px; line-height: 1;">MX</h1>
                    <h2 style="color: ${PALETTE.itau_orange}; font-size: 20px; font-weight: 700; margin: 0 0 40px 0; text-transform: uppercase; letter-spacing: 4px;">Auditoría Flow</h2>
                </div>
                
                <p style="color: rgba(255,255,255,0.7); font-size: 15px; margin-bottom: 35px; line-height: 1.6; max-width: 320px; margin-left: auto; margin-right: auto;">
                    Ingresa tu <b>Identificador de Auditor</b> para asignar tus cambios a los movimientos bancarios.
                </p>

                <input type="text" id="mx-init-user" placeholder="Ej: JPEREZ..." autocomplete="off" style="
                    width: 100%;
                    padding: 16px 20px;
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.15);
                    background: rgba(0,0,0,0.2);
                    color: white;
                    font-size: 16px;
                    margin-bottom: 25px;
                    box-sizing: border-box;
                    text-align: center;
                    font-weight: 600;
                    letter-spacing: 1px;
                    transition: all 0.3s;
                    box-shadow: inset 0 2px 10px rgba(0,0,0,0.2);
                " onfocus="this.style.borderColor='${PALETTE.itau_orange}'; this.style.background='rgba(0,0,0,0.4)'" onblur="this.style.borderColor='rgba(255,255,255,0.15)'; this.style.background='rgba(0,0,0,0.2)'">
                
                <button id="mx-init-btn" style="
                    width: 100%;
                    padding: 16px;
                    border-radius: 12px;
                    border: none;
                    background: linear-gradient(135deg, ${PALETTE.itau_orange} 0%, #cc5f00 100%);
                    color: white;
                    font-weight: 700;
                    font-size: 16px;
                    cursor: pointer;
                    margin-bottom: 30px;
                    transition: all 0.3s;
                    box-shadow: 0 10px 20px rgba(236,112,0,0.3);
                    font-family: 'Inter', sans-serif;
                    letter-spacing: 0.5px;
                    position: relative;
                    overflow: hidden;
                " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 15px 25px rgba(236,112,0,0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 10px 20px rgba(236,112,0,0.3)'">
                    Entrar al Sistema →
                </button>

                <div style="display: flex; align-items: center; justify-content: center; gap: 8px; color: rgba(255,255,255,0.4); font-size: 11px;">
                    <span style="font-size: 13px;">🔒</span>
                    <p style="margin: 0; line-height: 1.4; text-align: left; max-width: 280px;">
                        <b>Seguro y de solo lectura.</b> Monexa no requiere contraseñas, no tiene acceso a tus fondos, ni puede realizar transacciones o mover dinero.
                    </p>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        document.getElementById('mx-init-btn').onclick = async () => {
            const user = document.getElementById('mx-init-user').value.trim();
            if (!user) return;

            // Lógica de validación de usuarios apoyada en DB_Engine
            let users = await DB_Engine.fetch(KEYS.USERS, []);
            let role = 'user';

            if (users.length === 0) {
                // Primer ingreso global, creación del dueño (admin)
                if (user.toLowerCase() === 'admin') {
                    role = 'admin';
                    users.push({ name: 'admin', role: role, enabled: true });
                    await DB_Engine.commit(KEYS.USERS, users);
                    await Logger.info(`Primer acceso: cuenta master (admin) creada.`);
                    alert(`¡Bienvenido! Has sido registrado como Administrador del sistema.`);
                } else {
                    alert(`El sistema no está inicializado. Inicia sesión con la cuenta maestra ('admin') primero.`);
                    return;
                }
            } else {
                // Validar acceso para sistema ya inicializado
                const foundUser = users.find(u => u.name.toLowerCase() === user.toLowerCase());

                const showErrorScreen = (icon, title, message) => {
                    const overlay = document.getElementById('mx-welcome-overlay');
                    if (overlay) {
                        overlay.style.backgroundImage = 'radial-gradient(circle at 50% 10%, rgba(239, 68, 68, 0.6) 0%, #200 60%)';
                        overlay.style.animation = 'none';
                        overlay.children[0].innerHTML = `
                            <div style="width: 80px; height: 80px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 50%;">
                                <span style="font-size: 32px;">${icon}</span>
                            </div>
                            <h2 style="font-size: 28px; font-weight: 800; margin: 0 0 16px 0; color: #fca5a5; letter-spacing: -0.5px;">${title}</h2>
                            <p style="font-size: 15px; color: rgba(255,255,255,0.7); margin: 0 auto 40px auto; line-height: 1.5; max-width: 320px;">${message}</p>
                            <button id="mx-btn-error-back" style="padding: 14px 32px; background: transparent; color: white; border: 1px solid rgba(255,255,255,0.2); border-radius: 99px; font-weight: 600; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">Volver a intentar</button>
                        `;
                        document.getElementById('mx-btn-error-back').onclick = () => window.location.reload();
                    }
                };

                if (!foundUser) {
                    showErrorScreen('❓', 'Auditor No Encontrado', `El usuario <b>"${user}"</b> no está registrado en el sistema. Solicite acceso al administrador.`);
                    return;
                }
                if (!foundUser.enabled) {
                    showErrorScreen('🚫', 'Acceso Denegado', `El usuario <b>"${user}"</b> está inhabilitado por el administrador.`);
                    return;
                }
                role = foundUser.role || 'user';
            }

            // Iniciar sesión y guardar contexto
            await DB_Engine.commit(KEYS.SETTINGS, { user, role, enabled: true });
            await DB_Engine.commit(KEYS.SYSTEM_STATE, { enabled: true });
            await Logger.info(`Sesión iniciada por ${user} (${role})`);
            window.location.reload(); // Recarga limpia para renderizar el panel
        };
    }
};
