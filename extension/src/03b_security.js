/**
 * 03b_security.js — MONEXA FLOW SECURITY ENGINE
 * Implementación de Cifrado E2E Local usando Web Crypto API.
 * Blindaje AES-GCM 256-bit con derivación de llave PBKDF2.
 */

'use strict';

const SecurityEngine = {
    _key: null,
    _salt: "MonexaFlow_UltraSalt_2026", // Sal fija para la derivación local (podría ser dinámica x usuario)

    /**
     * Inicializa la llave de sesión a partir del password del auditor.
     * Esta llave vive solo en RAM. Se persiste en sessionStorage para sobrevivir a recargas de pestaña.
     */
    async initSession(password) {
        try {
            const encoder = new TextEncoder();
            const passwordData = encoder.encode(password);
            const saltData = encoder.encode(this._salt);

            // 1. Importar la contraseña base
            const keyMaterial = await crypto.subtle.importKey(
                "raw",
                passwordData,
                { name: "PBKDF2" },
                false,
                ["deriveBits", "deriveKey"]
            );

            // 2. Derivar llave AES-GCM 256
            this._key = await crypto.subtle.deriveKey(
                {
                    name: "PBKDF2",
                    salt: saltData,
                    iterations: 600000,
                    hash: "SHA-256"
                },
                keyMaterial,
                { name: "AES-GCM", length: 256 },
                false, // No exportable para máxima seguridad
                ["encrypt", "decrypt"]
            );

            // 3. Persistir sesión en el contexto de la pestaña (Tab-local)
            sessionStorage.setItem('mx_sec_pass', password);

            console.log("[SecurityEngine] Sesión Blindada: Llave E2E generada en RAM.");
            return true;
        } catch (err) {
            console.error("[SecurityEngine] Error inicializando sesión:", err);
            return false;
        }
    },

    /**
     * Intenta recuperar la sesión si existe en el almacenamiento de la pestaña.
     */
    async resumeSession() {
        const pass = sessionStorage.getItem('mx_sec_pass');
        if (pass) {
            return await this.initSession(pass);
        }
        return false;
    },

    /**
     * Cifra un objeto plano antes de guardarlo en la DB.
     */
    async encrypt(data) {
        if (!this._key) return data; // Fallback a texto claro si no hay llave (transición)

        try {
            const encoder = new TextEncoder();
            const plainText = encoder.encode(JSON.stringify(data));
            const iv = crypto.getRandomValues(new Uint8Array(12));

            const ciphertext = await crypto.subtle.encrypt(
                { name: "AES-GCM", iv: iv },
                this._key,
                plainText
            );

            return {
                iv: iv,
                ciphertext: ciphertext,
                _encrypted: true
            };
        } catch (err) {
            console.error("[SecurityEngine] Error cifrando datos:", err);
            return data;
        }
    },

    /**
     * Descifra un paquete de datos proveniente de la DB.
     */
    async decrypt(encryptedPackage) {
        if (!this._key || !encryptedPackage || !encryptedPackage._encrypted) {
            return encryptedPackage; // Devolver tal cual si no hay llave o no está cifrado
        }

        try {
            const decryptedBuffer = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv: encryptedPackage.iv },
                this._key,
                encryptedPackage.ciphertext
            );

            const decoder = new TextDecoder();
            return JSON.parse(decoder.decode(decryptedBuffer));
        } catch (err) {
            console.error("[SecurityEngine] Error descifrando datos. ¿Llave correcta?", err);
            return null; // Integridad fallida
        }
    },

    /**
     * Protocolo de Emergencia: Borra todo rastro local para permitir un nuevo inicio.
     * ADVERTENCIA: Los datos cifrados se perderán permanentemente.
     */
    async emergencyWipe() {
        console.warn("[SecurityEngine] Iniciando protocolo de borrado de emergencia...");
        
        // 1. Limpiar rastro en RAM/Pestaña
        this._key = null;
        sessionStorage.removeItem('mx_sec_pass');

        // 2. Limpiar Base de Datos Local (IndexedDB)
        if (typeof DB_Engine !== 'undefined') {
            await DB_Engine.clearEverything();
        }

        console.log("[SecurityEngine] Borrado completado. Sistema reiniciado.");
        return true;
    }
};
