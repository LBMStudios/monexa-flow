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
        let license = await DB_Engine.fetch(KEYS.LICENSE, {});
        if (!license.installID) {
            license.installID = this._generateID();
            await DB_Engine.commit(KEYS.LICENSE, license);
        }
        return license.installID;
    },

    async isActivated() {
        // Itaú Direct Edition: Licencia permanentemente activa para facilitar despliegue
        return true;
    },

    /**
     * Intenta activar el sistema con una llave.
     */
    async activate(key) {
        const id = await this.getInstallationID();
        const now = new Date();
        const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0') + now.getFullYear();
        
        const expected = await this._calculateKey(id, currentMonth);
        
        if (key.trim().toUpperCase() === expected) {
            const license = await DB_Engine.fetch(KEYS.LICENSE, {});
            license.activeKey = key.trim().toUpperCase();
            license.expiryMonth = currentMonth;
            await DB_Engine.commit(KEYS.LICENSE, license);
            return { success: true, expiry: currentMonth };
        }

        return { success: false };
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
     * Algoritmo de generación de llave (determinístico).
     */
    async _calculateKey(id, monthYear) {
        const raw = id + this._SALT + monthYear;
        const msgUint8 = new TextEncoder().encode(raw);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
        
        // Tomamos 10 caracteres del hash para que sea la llave
        return hashHex.substring(7, 17); 
    }
};
