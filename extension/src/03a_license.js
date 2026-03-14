/**
 * 03a_license.js — MONEXA FLOW
 * Sistema de licenciamiento offline basado en ID de Instalación y Llave de Acceso.
 * Depende de: 01_db.js
 */

'use strict';

const LicenseSystem = {
    _SALT: "MX-FORCE-2026-LBM", // Salt compartido con el generador de Lucas

    /**
     * Obtiene o genera el ID de Instalación Único.
     */
    async getInstallationID() {
        let license = await DB_Engine.fetch(KEYS.LICENSE, { activeLicenses: {} });
        if (!license.installID) {
            license.installID = this._generateID();
            await DB_Engine.commit(KEYS.LICENSE, license);
            console.log("[LicenseSystem] Nuevo ID Generado:", license.installID);
        }
        return license.installID;
    },

    async isActivated(username = null) {
        let license = await DB_Engine.fetch(KEYS.LICENSE, { activeLicenses: {} });
        if (!license || !license.activeLicenses) return false;
        
        const id = await this.getInstallationID();

        // 1. Si se provee nombre, validar su llave permanente
        if (username) {
            const cleanName = username.trim().toUpperCase();
            const storedKey = license.activeLicenses[cleanName];
            if (!storedKey) return false;
            
            const expected = await this._calculatePermanentKey(id, cleanName);
            return storedKey === expected;
        }

        // 2. Si no hay nombre (Boot), verificar si hay al menos una licencia grabada
        return Object.keys(license.activeLicenses).length > 0;
    },

    /**
     * Activa un usuario de forma PERMANENTE.
     */
    async activate(username, key) {
        if (!username) return { success: false, error: "Nombre requerido" };
        const id = await this.getInstallationID();
        const cleanName = username.trim().toUpperCase();
        
        try {
            const expected = await this._calculatePermanentKey(id, cleanName);
            const inputKey = key.trim().toUpperCase();

            console.log("[License Activation] Checking:", { id, cleanName, inputKey, expected });
            
            if (inputKey === expected) {
                const license = await DB_Engine.fetch(KEYS.LICENSE, { activeLicenses: {} });
                license.activeLicenses[cleanName] = inputKey;
                await DB_Engine.commit(KEYS.LICENSE, license);
                return { success: true };
            }
            return { success: false, error: "Llave incorrecta para este ID y Nombre." };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    /**
     * Genera un ID aleatorio legible.
     */
    _generateID() {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let res = "";
        for(let i=0; i<3; i++) {
            for(let j=0; j<3; j++) res += chars.charAt(Math.floor(Math.random() * chars.length));
            if(i < 2) res += "-";
        }
        return res; // E.g. ABC-123-XYZ
    },

    /**
     * Algoritmo de generación de llave PERMANENTE (sin fecha).
     */
    async _calculatePermanentKey(id, username) {
        const cleanName = (username || "").trim().toUpperCase();
        const raw = id + cleanName + this._SALT + "PERMANENT";
        
        try {
            const msgUint8 = new TextEncoder().encode(raw);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
            
            return hashHex.substring(5, 15); // Llave de 10 caracteres
        } catch (e) {
            return null;
        }
    },

    async _calculateKey(id, username, monthYear) {
        return this._calculatePermanentKey(id, username);
    },

    /**
     * Devuelve el estado actual para depuración.
     */
    async debug() {
        const license = await DB_Engine.fetch(KEYS.LICENSE, {});
        const id = await this.getInstallationID();
        console.log("[LicenseDebug] State:", { id, license });
    }
};
