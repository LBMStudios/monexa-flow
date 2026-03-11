/**
 * 00_config.js — MONEXA FLOW
 * Variables globales, constantes de configuración, paleta de colores y mapas de estado.
 */

'use strict';

const VERSION = "1.2.2";;;;;
const AUTHOR = "Monexa Systems";

// Claves de almacenamiento en chrome.storage.local
const KEYS = {
    TRANSACTIONS: "mx_db_tx_v65",
    RULES: "mx_db_rules_v65",
    SETTINGS: "mx_db_settings_v65",
    LOGS: "mx_db_logs_v65",
    SESSIONS: "mx_db_sessions_v65",
    SYSTEM_STATE: "mx_system_state_v65",
    UPDATE_STATUS: "mx_db_updates_v65",
    REMOTE_VERSION: "mx_remote_ver_v65",
    USERS: "mx_db_users_v65"
};

// Paleta de colores del sistema
const PALETTE = {
    itau_orange: "#ec7000",
    itau_orange_hover: "#ff8b22",
    itau_blue: "#004b8b",
    itau_blue_dark: "#003666",
    emerald: "#064e3b",
    success: "#10b981",    // para verde de validaciones
    amber: "#f59e0b",
    rose: "#e11d48",
    slate: "#1e293b",
    indigo: "#4f46e5",
    sky: "#0ea5e9",
    zinc: "#f4f4f5",
    border: "#e4e4e7",
    text_main: "#0f172a",
    muted: "#64748b"
};

// Mapa de estados de auditoría
const STATUS_MAP = {
    'PENDING': { id: 'NONE', color: '#94a3b8', label: 'Sin Revisar', icon: '○' },
    'VALID': { id: 'VERDE', color: '#10b981', label: 'Validado', icon: '✓' },
    'WARN': { id: 'AMARILLO', color: '#f59e0b', label: 'Observado', icon: '!' },
    'CRIT': { id: 'ROJO', color: '#e11d48', label: 'Rechazado', icon: '×' }
};

// Ciclo de transición de estados
const STATE_NEXT = {
    'NONE': 'VERDE',
    'VERDE': 'AMARILLO',
    'AMARILLO': 'ROJO',
    'ROJO': 'NONE'
};

// Paleta de colores disponibles para reglas de auto-etiquetado
const RULE_COLORS = {
    verde: { hex: '#10b981', label: 'Verde' },
    azul: { hex: '#2563eb', label: 'Azul' },
    morado: { hex: '#7c3aed', label: 'Morado' },
    rojo: { hex: '#dc2626', label: 'Rojo' },
    naranja: { hex: '#ea580c', label: 'Naranja' },
    gris: { hex: '#64748b', label: 'Gris' }
};
