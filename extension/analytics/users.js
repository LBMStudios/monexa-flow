/**
 * users.js - MONEXA FLOW
 * Lógica para el panel de administración de auditores 100% OFFLINE.
 */

'use strict';

let allUsers = [];

/**
 * Guarda los usuarios localmente y los empuja a la nube (Firebase).
 */
async function saveUsersToDB(usersArray) {
    // Solo guardado local
    await DB_Engine.commit(KEYS.USERS, usersArray);
}

const LICENSE_SALT = "MX-FORCE-2026-LBM";

document.addEventListener('DOMContentLoaded', async () => {
    // Validar que sea admin el que accede (Validación Redundante v1.3.6)
    const config = await DB_Engine.fetch(KEYS.SETTINGS, {});
    const users = await DB_Engine.fetch(KEYS.USERS, []);
    // 1. Resolver Identidad (Validación Cruzada v1.3.9)
    let userSession = config.user || '';
    
    // Si la sesión es genérica o vacía, buscamos al primer administrador/maestro
    if (!userSession || userSession === '' || userSession.toLowerCase() === 'auditor') {
        const adminUser = users.find(u => u.role === 'admin' || u.name.toLowerCase() === 'lucas') || users[0];
        if (adminUser) {
            userSession = adminUser.name;
            console.log("[Monexa] Identidad recuperada para acceso:", userSession);
        }
    }
    
    // 2. Validar Privilegios
    const foundUser = users.find(u => u.name.toLowerCase() === userSession.toLowerCase());
    const rawUser = userSession.trim().toLowerCase();
    
    // FAIL-SAFE: Lucas y administradores siempre tienen pase libre
    let isActuallyAdmin = false;
    if (rawUser === 'lucas' || rawUser === 'admin' || config.role === 'admin' || (foundUser && foundUser.role === 'admin')) {
        isActuallyAdmin = true;
    } else if (users.length === 0) {
        console.warn("[Monexa] Base de datos vacía, modo configuración.");
        isActuallyAdmin = true;
    }

    if (!isActuallyAdmin) {
        // Log de diagnóstico
        console.error(`[Monexa Access Denied] User: "${userSession}"`, config);
        alert("Acceso denegado. Solo administradores pueden ver este panel.");
        window.location.href = 'dashboard.html';
        return;
    }

    const me = userSession || 'Administrador';

    const now = new Date();
    const metaDiv = document.getElementById('dash-meta');
    if (metaDiv) {
        metaDiv.innerHTML =
            `Auditor: <b style="color:white">${DataCore.sanitizeText(me.toUpperCase())}</b> (ADMIN)<br>` +
            now.toLocaleDateString('es-UY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    await loadUsers();
    initKeyGenerator();

    // Evento del botón agregar
    const btnAdd = document.getElementById('btn-add-user');
    if (btnAdd) btnAdd.addEventListener('click', addUser);
});

async function loadUsers() {
    allUsers = await DB_Engine.fetch(KEYS.USERS, []);
    renderUsers();
}

async function renderUsers() {
    const listContainer = document.getElementById('users-list-container');
    if (!listContainer) return;

    if (allUsers.length === 0) {
        listContainer.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.4);border:1px dashed rgba(255,255,255,0.1);border-radius:20px;padding:60px;">No hay auditores registrados en este equipo</div>';
        return;
    }

    const license = await DB_Engine.fetch(KEYS.LICENSE, { activeLicenses: {} });
    const activeKeys = license.activeLicenses || {};
    
    // Obtener último día del mes actual para el vencimiento
    const now = new Date();
    const expiryDateText = "PERMANENTE";

    listContainer.innerHTML = allUsers.map((u, i) => {
        const isEnabled = u.enabled !== false;
        const roleText = u.role === 'admin' ? 'MAESTRO' : 'AUDITOR';
        const initial = (u.name || "?")[0].toUpperCase();
        
        const lastActiveText = u.lastActive 
            ? new Date(u.lastActive).toLocaleString('es-UY', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) 
            : 'Sin actividad';

        const installDateText = u.installDate 
            ? new Date(u.installDate).toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : '---';

        const userKey = activeKeys[u.name] || 'Pte. Activación';

        return `
            <div class="user-card" style="display: block; padding: 20px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                    <div style="display: flex; align-items: center;">
                        <div class="user-avatar" style="width: 50px; height: 50px; font-size: 18px;">
                            ${initial}
                            <div class="status-dot ${isEnabled ? 'active' : ''}"></div>
                        </div>
                        <div class="user-main-info">
                            <div class="user-name" style="font-size: 16px;">
                                ${DataCore.sanitizeText(u.name)}
                                <span class="user-status-tag" style="background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; font-size: 8px;">OFFLINE</span>
                            </div>
                            <div class="user-role-label" style="font-size: 9px;">${roleText}</div>
                        </div>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 20px;">
                        <div style="text-align: right;">
                            <div style="font-size: 9px; font-weight: 800; color: #10b981; text-transform: uppercase;">Acceso</div>
                            <label class="switch">
                                <input type="checkbox" class="toggle-btn" data-index="${i}" ${isEnabled ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </div>
                        <button class="delete-btn" data-index="${i}" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #f87171; width: 36px; height: 36px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </div>

                <!-- Tira de Metadatos Técnica -->
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 12px;">
                    <div>
                        <div style="font-size: 8px; color: rgba(255,255,255,0.4); text-transform: uppercase; font-weight: 800; margin-bottom: 4px;">Clave de Origen</div>
                        <div style="font-size: 11px; color: #10b981; font-weight: 800; font-family: monospace;">${DataCore.sanitizeText(userKey)}</div>
                    </div>
                    <div>
                        <div style="font-size: 8px; color: rgba(255,255,255,0.4); text-transform: uppercase; font-weight: 800; margin-bottom: 4px;">Instalación</div>
                        <div style="font-size: 11px; color: white; font-weight: 700;">${installDateText}</div>
                    </div>
                    <div>
                        <div style="font-size: 8px; color: rgba(255,255,255,0.4); text-transform: uppercase; font-weight: 800; margin-bottom: 4px;">Vence</div>
                        <div style="font-size: 11px; color: #fbbf24; font-weight: 700;">${expiryDateText}</div>
                    </div>
                    <div>
                        <div style="font-size: 8px; color: rgba(255,255,255,0.4); text-transform: uppercase; font-weight: 800; margin-bottom: 4px;">Último Acceso</div>
                        <div style="font-size: 11px; color: rgba(255,255,255,0.8); font-weight: 600;">${lastActiveText}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Attach event listeners
    document.querySelectorAll('.toggle-btn').forEach(input => {
        input.addEventListener('change', (e) => {
            const idx = parseInt(e.target.dataset.index, 10);
            const status = e.target.checked;
            toggleUser(idx, status);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.dataset.index, 10);
            deleteUser(idx);
        });
    });
}

async function addUser() {
    const nameInput = document.getElementById('new-user-name');
    const roleSelect = document.getElementById('new-user-role');
    const name = nameInput.value.trim();

    if (!name) {
        alert("El nombre de usuario no puede estar vacío.");
        return;
    }

    const exists = allUsers.find(u => u.name.toLowerCase() === name.toLowerCase());
    if (exists) {
        alert("Ya existe un usuario con ese nombre.");
        return;
    }

    allUsers.push({
        name: name,
        role: roleSelect.value || 'user',
        enabled: true,
        loginCount: 0,
        lastActive: null,
        installDate: new Date().toISOString()
    });

    await saveUsersToDB(allUsers);
    nameInput.value = '';
    renderUsers();
}

async function toggleUser(index, enableStatus) {
    if (index >= 0 && index < allUsers.length) {
        if (!enableStatus && allUsers[index].role === 'admin') {
            const activeAdmins = allUsers.filter(u => u.role === 'admin' && (u.enabled !== false)).length;
            if (activeAdmins <= 1) {
                alert("Atención: No puedes deshabilitar al único administrador activo del sistema.");
                return;
            }
        }

        allUsers[index].enabled = enableStatus;
        await saveUsersToDB(allUsers);
        renderUsers();
    }
}

async function deleteUser(index) {
    if (index >= 0 && index < allUsers.length) {
        const userToDelete = allUsers[index];
        if (userToDelete.role === 'admin') {
            const admins = allUsers.filter(u => u.role === 'admin' && (u.enabled !== false));
            if (admins.length <= 1 && userToDelete.enabled !== false) {
                alert("Atención: No puedes eliminar al único administrador activo del sistema.");
                return;
            }
        }

        if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente al auditor "${userToDelete.name}"?`)) {
            return;
        }

        allUsers.splice(index, 1);
        await saveUsersToDB(allUsers);
        renderUsers();
    }
}

/**
 * Inicializa el generador de llaves corporativas (Offline).
 */
function initKeyGenerator() {
    const genBtn = document.getElementById('btn-generate-key');
    if (!genBtn) return;

    genBtn.onclick = async () => {
        const id = document.getElementById('gen-install-id').value.trim();
        const audName = document.getElementById('gen-auditor-name').value.trim().toUpperCase();

        if (!id) { alert("Ingresa un ID de instalación"); return; }
        if (!audName) { alert("Ingresa el Nombre del Auditor"); return; }
        
        // v1.4.0 — Lógica Permanente (Sin Mes/Año)
        const raw = id + audName + LICENSE_SALT + "PERMANENT";
        
        const finalKey = await (async () => {
            const msgUint8 = new TextEncoder().encode(raw);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
            return hashHex.substring(5, 15); // Cambio a (5, 15) para el nuevo modelo
        })();
        
        const resCode = document.getElementById('result-key-code');
        const resCont = document.getElementById('key-result-container');
        
        if (resCode && resCont) {
            resCode.innerText = finalKey;
            resCont.style.display = 'block';
            console.log("[Monexa Generator] Created Permanent Key for:", audName, "with ID:", id);
        }
    };

    const copyBtn = document.getElementById('btn-copy-key');
    if (copyBtn) {
        copyBtn.onclick = () => {
            const key = document.getElementById('result-key-code').innerText;
            navigator.clipboard.writeText(key);
            alert("Llave corporativa copiada al portapapeles.");
        };
    }
}
