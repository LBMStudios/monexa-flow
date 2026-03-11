/**
 * users.js - MONEXA FLOW
 * Lógica para el panel de administración de auditores con Sincronización Firebase.
 */

'use strict';

let allUsers = [];

/**
 * Guarda los usuarios localmente y los empuja a la nube (Firebase).
 */
async function saveUsersToDB(usersArray) {
    // 1. Guardar localmente
    await DB_Engine.commit(KEYS.USERS, usersArray);

    // 2. Empujar a la nube si está configurado
    if (typeof CloudConnector !== 'undefined') {
        const success = await CloudConnector.pushRemoteUsers(usersArray);
        if (!success) {
            console.warn("No se pudo sincronizar con Firebase. Los cambios son locales.");
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Validar que sea admin el que accede
    const config = await DB_Engine.fetch(KEYS.SETTINGS, {});
    const role = config.role || 'user';
    const me = config.user || 'Desconocido';

    if (role !== 'admin') {
        alert("Acceso denegado. Solo administradores pueden ver este panel.");
        window.location.href = 'dashboard.html';
        return;
    }

    const now = new Date();
    const metaDiv = document.getElementById('dash-meta');
    if (metaDiv) {
        metaDiv.innerHTML =
            `Auditor: <b style="color:white">${me.toUpperCase()}</b> (ADMIN)<br>` +
            now.toLocaleDateString('es-UY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    // --- Sincronización Inicial con la Nube ---
    // Intentamos traer lo más nuevo de Firebase antes de mostrar la lista
    if (typeof CloudConnector !== 'undefined') {
        await CloudConnector.syncRemoteUsers();
    }

    await loadUsers();

    // Evento del botón agregar
    const btnAdd = document.getElementById('btn-add-user');
    if (btnAdd) btnAdd.addEventListener('click', addUser);
});

async function loadUsers() {
    allUsers = await DB_Engine.fetch(KEYS.USERS, []);
    renderUsers();
}

function esc(str) {
    const d = document.createElement('div');
    d.textContent = String(str ?? '');
    return d.innerHTML;
}

function renderUsers() {
    const countSpan = document.getElementById('users-count');
    if (countSpan) countSpan.textContent = `${allUsers.length} usuarios`;
    
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;

    if (allUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:rgba(255,255,255,0.4);padding:20px;">No hay usuarios registrados</td></tr>';
        return;
    }

    tbody.innerHTML = allUsers.map((u, i) => {
        const isEnabled = u.enabled !== false;

        const roleClass = u.role === 'admin' ? 'role-admin' : 'role-user';
        const roleText = u.role === 'admin' ? 'Administrador' : 'Usuario';

        const statusHtml = isEnabled
            ? `<span style="color:#10b981;font-weight:600;display:flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;background:#10b981;border-radius:50%;"></span> Activo</span>`
            : `<span style="color:#ef4444;font-weight:600;display:flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;background:#ef4444;border-radius:50%;"></span> Inactivo</span>`;

        const actionBtn = isEnabled
            ? `<button class="user-action-btn btn-danger toggle-btn" data-index="${i}" data-status="false">Inhabilitar</button>`
            : `<button class="user-action-btn btn-success toggle-btn" data-index="${i}" data-status="true">Habilitar</button>`;

        const deleteBtn = `<button class="user-action-btn delete-btn" data-index="${i}" style="margin-left:8px; border-color: rgba(255,255,255,0.1);">&times;</button>`;

        const lastActiveText = u.lastActive 
            ? new Date(u.lastActive).toLocaleString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
            : '---';

        return `
            <tr>
                <td style="font-weight:600;">${esc(u.name)}</td>
                <td><span class="role-badge ${roleClass}">${roleText}</span></td>
                <td style="text-align: center;">
                    <span style="background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 6px; font-weight: 700; font-size: 11px;">
                        ${u.loginCount || 0}
                    </span>
                </td>
                <td style="font-size: 11px; opacity: 0.8; font-variant-numeric: tabular-nums;">${lastActiveText}</td>
                <td>${statusHtml}</td>
                <td style="text-align: center;">${actionBtn}${deleteBtn}</td>
            </tr>
        `;
    }).join('');

    // Attach event listeners
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index, 10);
            const status = e.target.dataset.status === 'true';
            toggleUser(idx, status);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index, 10);
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
        lastActive: null
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
