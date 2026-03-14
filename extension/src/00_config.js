/**
 * 00_config.js — MONEXA FLOW
 * Variables globales, constantes de configuración, paleta de colores y mapas de estado.
 */

'use strict';

const VERSION = "1.3.9";
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
    USERS: "mx_db_users_v65",
    LICENSE: "mx_db_license_v65"
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
    muted: "#64748b",
    blue: "#2563eb",
    violet: "#7c3aed",
    red: "#dc2626",
    orange: "#ea580c",
    slate_400: "#94a3b8"
};

// Mapa de estados de auditoría
const STATUS_MAP = {
    'PENDING': { id: 'NONE', color: PALETTE.slate_400, label: 'Sin Revisar', icon: '○' },
    'VALID': { id: 'VERDE', color: PALETTE.success, label: 'Validado', icon: '✓' },
    'WARN': { id: 'AMARILLO', color: PALETTE.amber, label: 'Observado', icon: '!' },
    'CRIT': { id: 'ROJO', color: PALETTE.rose, label: 'Rechazado', icon: '×' }
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
    verde: { hex: PALETTE.success, label: 'Verde' },
    azul: { hex: PALETTE.blue, label: 'Azul' },
    morado: { hex: PALETTE.violet, label: 'Morado' },
    rojo: { hex: PALETTE.red, label: 'Rojo' },
    naranja: { hex: PALETTE.orange, label: 'Naranja' },
    gris: { hex: PALETTE.muted, label: 'Gris' }
};










