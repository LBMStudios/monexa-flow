/**
 * users.js - MONEXA FLOW
 * Lógica para el panel de administración de auditores.
 */

'use strict';

const KEYS = {
    SETTINGS: "mx_db_settings_v65",
    USERS: "mx_db_users_v65"
};

let allUsers = [];

function storageGet(key, fallback) {
    return new Promise(resolve => {
        try {
            const storage = chrome.storage.local;
            storage.get([key], res => {
                if (chrome.runtime.lastError) { resolve(fallback); return; }
                resolve(res[key] ?? fallback);
            });
        } catch (_) { resolve(fallback); }
    });
}

function storageSet(key, data) {
    return new Promise(resolve => {
        try {
            const storage = chrome.storage.local;
            storage.set({ [key]: data }, () => {
                if (chrome.runtime.lastError) { resolve(false); return; }
                resolve(true);
            });
        } catch (_) { resolve(false); }
    });
}

async function saveUsersToDB(usersArray) {
    await storageSet(KEYS.USERS, usersArray);

    // Sincronización transparente Bidireccional con Firebase RTDB
    const config = await storageGet(KEYS.SETTINGS, {});
    let masterUrl = config.remote_admin_url;

    if (masterUrl && masterUrl.includes('firebaseio.com')) {
        if (!masterUrl.endsWith('/')) masterUrl += '/';
        const fetchUrl = masterUrl + 'users.json';

        try {
            await fetch(fetchUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(usersArray)
            });
        } catch (e) {
            console.warn("No se pudo conectar con Firebase en el guardado bidireccional:", e);
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Validar que sea admin el que accede
    const config = await storageGet(KEYS.SETTINGS, {});
    const role = config.role || 'user';
    const me = config.user || 'Desconocido';

    if (role !== 'admin') {
        alert("Acceso denegado. Solo administradores pueden ver este panel.");
        window.location.href = 'dashboard.html';
        return;
    }

    const now = new Date();
    document.getElementById('dash-meta').innerHTML =
        `Auditor: <b style="color:white">${me.toUpperCase()}</b> (ADMIN)<br>` +
        now.toLocaleDateString('es-UY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    await loadUsers();

    // Evento del botón agregar
    document.getElementById('btn-add-user').addEventListener('click', addUser);
});

async function loadUsers() {
    allUsers = await storageGet(KEYS.USERS, []);
    renderUsers();
}

function esc(str) {
    const d = document.createElement('div');
    d.textContent = String(str ?? '');
    return d.innerHTML;
}

function renderUsers() {
    document.getElementById('users-count').textContent = `${allUsers.length} usuarios`;
    const tbody = document.getElementById('users-tbody');

    if (allUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:rgba(255,255,255,0.4);padding:20px;">No hay usuarios registrados</td></tr>';
        return;
    }

    tbody.innerHTML = allUsers.map((u, i) => {
        const isEnabled = u.enabled !== false; // por defecto true

        const roleClass = u.role === 'admin' ? 'role-admin' : 'role-user';
        const roleText = u.role === 'admin' ? 'Administrador' : 'Usuario';

        const statusHtml = isEnabled
            ? `<span style="color:#10b981;font-weight:600;display:flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;background:#10b981;border-radius:50%;"></span> Activo</span>`
            : `<span style="color:#ef4444;font-weight:600;display:flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;background:#ef4444;border-radius:50%;"></span> Deshabilitado</span>`;

        const actionBtn = isEnabled
            ? `<button class="user-action-btn btn-danger toggle-btn" data-index="${i}" data-status="false">Inhabilitar</button>`
            : `<button class="user-action-btn btn-success toggle-btn" data-index="${i}" data-status="true">Habilitar</button>`;

        const deleteBtn = `<button class="user-action-btn delete-btn" data-index="${i}" style="margin-left:8px; border-color: rgba(255,255,255,0.1);">&times;</button>`;

        return `
            <tr>
                <td style="font-weight:600;">${esc(u.name)}</td>
                <td><span class="role-badge ${roleClass}">${roleText}</span></td>
                <td>${statusHtml}</td>
                <td style="text-align: center;">${actionBtn}${deleteBtn}</td>
            </tr>
        `;
    }).join('');

    // Attach event listeners dynamically to respect CSP
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

    // Chequear duplicados
    const exists = allUsers.find(u => u.name.toLowerCase() === name.toLowerCase());
    if (exists) {
        alert("Ya existe un usuario con ese nombre.");
        return;
    }

    allUsers.push({
        name: name,
        role: roleSelect.value || 'user',
        enabled: true
    });

    await saveUsersToDB(allUsers);

    nameInput.value = '';

    renderUsers();
}

async function toggleUser(index, enableStatus) {
    if (index >= 0 && index < allUsers.length) {
        // Validación: No permitir deshabilitar al último admin
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
};
async function deleteUser(index) {
    if (index >= 0 && index < allUsers.length) {
        const userToDelete = allUsers[index];

        // Validación: No permitir borrar al último admin activo
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
