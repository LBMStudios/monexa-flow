/**
 * 08a_ui_styles.js — MONEXA FLOW
 * Módulo dedicado exclusivamente al CSS Global.
 */

'use strict';

const UIStyles = {
    stylesInjected: false,

    inject() {
        if (this.stylesInjected || document.getElementById("mx-global-styles")) return;

        const css = `
            #mx-master-launcher {
                position: relative;
                width: 64px;
                height: 64px;
                background: ${PALETTE.itau_orange};
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 99999;
                cursor: pointer;
                box-shadow: 0 0 20px rgba(236,112,0,0.4), 0 10px 25px -5px rgba(0,0,0,0.4);
                border: 3px solid rgba(255,255,255,0.15);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                font-family: 'Inter', sans-serif;
                font-weight: 700;
                font-size: 20px;
                user-select: none;
            }

            #mx-master-launcher:hover {
                transform: scale(1.1) rotate(5deg);
                background: ${PALETTE.itau_orange_hover};
                box-shadow: 0 0 30px rgba(236,112,0,0.6), 0 10px 30px -5px rgba(0,0,0,0.5);
            }

            #mx-launcher-wrapper {
                position: fixed;
                bottom: 30px;
                right: 30px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 15px;
                z-index: 100000;
            }

            #mx-account-chip {
                background: rgba(10, 15, 25, 0.8);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                color: white;
                font-family: 'Inter', sans-serif;
                font-size: 9px;
                font-weight: 800;
                padding: 4px 14px;
                border-radius: 12px;
                white-space: nowrap;
                max-width: 160px;
                overflow: hidden;
                text-overflow: ellipsis;
                box-shadow: 0 4px 12px rgba(0,0,0,0.25);
                border: 1px solid rgba(255,255,255,0.1);
                text-transform: uppercase;
                letter-spacing: 0.8px;
                letter-spacing: 0.04em;
                opacity: 0;
                transform: translateY(8px);
                transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                pointer-events: none;
                position: relative;
                z-index: 5;
            }

            #mx-account-chip.visible {
                opacity: 1;
                transform: translateY(0);
            }

            #mx-control-panel {
                position: fixed;
                top: 0;
                right: -420px;
                width: 400px !important;
                height: 100vh !important;
                background: #0a0f19;
                backdrop-filter: blur(32px) saturate(1.8);
                -webkit-backdrop-filter: blur(32px) saturate(1.8);
                z-index: 10000000 !important;
                box-shadow: -20px 0 80px rgba(0,0,0,0.8);
                border-left: 1px solid rgba(255,255,255,0.1);
                transition: right 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                display: flex;
                flex-direction: column;
                font-family: 'Inter', sans-serif;
                margin: 0 !important;
                padding: 0 !important;
                box-sizing: border-box;
            }

            #mx-control-panel.active {
                right: 0 !important;
            }

            .mx-header {
                background: ${PALETTE.itau_orange};
                color: white;
                padding: 40px 25px;
            }

            .mx-header h2 {
                margin: 0;
                font-size: 24px;
                font-weight: 700;
                letter-spacing: -0.5px;
            }

            .mx-content {
                flex: 1;
                overflow-y: auto;
                overflow-x: hidden;
                padding: 20px;
                background: transparent;
                scrollbar-width: thin;
                scrollbar-color: rgba(255,255,255,0.1) transparent;
            }

            .mx-content::-webkit-scrollbar {
                width: 6px;
            }

            .mx-content::-webkit-scrollbar-track {
                background: transparent;
            }

            .mx-content::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0.1);
                border-radius: 10px;
            }

            .mx-content::-webkit-scrollbar-thumb:hover {
                background: rgba(255,255,255,0.2);
            }

            .mx-card {
                background: rgba(255,255,255,0.03);
                border-radius: 16px;
                padding: 22px;
                margin-bottom: 24px;
                border: 1px solid rgba(255,255,255,0.1);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                box-shadow: 0 8px 32px rgba(0,0,0,0.2);
                transition: all 0.3s ease;
            }

            .mx-card:hover {
                border-color: rgba(255,255,255,0.25);
                background: rgba(255,255,255,0.06);
                transform: translateY(-4px);
                box-shadow: -10px 10px 40px rgba(59, 130, 246, 0.15), 0 20px 40px rgba(0,0,0,0.4);
            }

            .mx-card h4 {
                margin: 0 0 18px 0;
                font-size: 11px;
                text-transform: uppercase;
                color: rgba(255,255,255,0.9);
                letter-spacing: 0.12em;
                font-weight: 800;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .mx-btn-action {
                width: 100%;
                padding: 12px;
                border-radius: 10px;
                border: 1px solid rgba(255,255,255,0.08);
                background: ${PALETTE.itau_orange};
                color: white;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.25s;
                font-size: 13px;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                font-family: 'Inter', sans-serif;
            }

            .mx-btn-action:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 16px rgba(236,112,0,0.3);
            }

            .mx-btn-secondary {
                background: rgba(255,255,255,0.08);
                border: 1px solid rgba(255,255,255,0.12);
            }

            .mx-btn-secondary:hover {
                background: rgba(255,255,255,0.14);
            }

            .mx-btn-outline {
                background: rgba(255,255,255,0.05);
                color: rgba(255,255,255,0.8);
                border: 1px solid rgba(255,255,255,0.12);
            }

            .mx-btn-outline:hover {
                background: rgba(255,255,255,0.1);
            }

            .mx-stat-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 10px;
            }

            .mx-stat-item {
                text-align: center;
                padding: 15px 5px;
                border-radius: 12px;
                color: white;
                border: 1px solid rgba(255,255,255,0.08);
            }

            .mx-search-box {
                width: 100%;
                padding: 12px 14px;
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: 12px;
                margin-bottom: 12px;
                font-size: 13px;
                box-sizing: border-box;
                background: rgba(0,0,0,0.2);
                color: white;
                font-family: 'Inter', sans-serif;
                transition: all 0.2s;
            }

            .mx-search-box::placeholder {
                color: rgba(255,255,255,0.3);
            }

            .mx-search-box:focus {
                outline: none;
                border-color: ${PALETTE.itau_orange};
            }

            /* Estilos Panel Maestro - Admin */
            @keyframes mx-spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            .mx-switch-mini {
                display: inline-block;
                vertical-align: middle;
            }

            .mx-switch-mini input:checked + span {
                background: #10b981 !important;
            }

            .mx-switch-mini input:checked + span span {
                left: 16px !important;
            }

            #mx-admin-card {
                animation: mx-slide-up 0.4s ease-out;
            }

            @keyframes mx-slide-up {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            /* Estilos Inyectados en Filas del Banco */
            .it-data-node {
                padding: 0 12px !important;
                vertical-align: middle !important;
                background: transparent !important;
            }

            .it-row-container {
                display: flex;
                align-items: center;
                gap: 8px;
                height: 100%;
                padding: 4px 0;
            }

            .it-field-tag, .it-field-note {
                font-family: 'Outfit', sans-serif !important;
                font-size: 11px !important;
                background: white !important;
                border: 1px solid #e2e8f0 !important;
                border-radius: 8px !important;
                padding: 6px 10px !important;
                outline: none !important;
                transition: all 0.2s ease !important;
                box-shadow: inset 0 1px 2px rgba(0,0,0,0.02) !important;
            }

            .it-field-tag:focus, .it-field-note:focus {
                border-color: ${PALETTE.itau_orange} !important;
                box-shadow: 0 0 0 3px ${PALETTE.itau_orange}22 !important;
                background: white !important;
            }

            .it-field-tag {
                width: 90px !important;
                font-weight: 700 !important;
            }

            .it-field-note {
                width: 140px !important;
                flex: 1;
                min-width: 100px;
            }

            .it-btn-cycle {
                border: none !important;
                border-radius: 10px !important;
                width: 28px !important;
                height: 28px !important;
                min-width: 28px !important;
                cursor: pointer !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-size: 12px !important;
                font-weight: 800 !important;
                color: white !important;
                transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
                padding: 0 !important;
                line-height: 1 !important;
            }

            .it-btn-cycle:hover {
                transform: scale(1.1) rotate(5deg);
                filter: brightness(1.1);
            }

            .it-btn-del {
                background: none !important;
                border: none !important;
                color: #94a3b8 !important;
                cursor: pointer !important;
                font-size: 18px !important;
                padding: 0 4px !important;
                line-height: 1 !important;
                transition: all 0.2s !important;
                opacity: 0.4;
            }

            tr:hover .it-btn-del {
                opacity: 1;
            }

            .it-btn-del:hover {
                color: #ef4444 !important;
                transform: scale(1.2);
            }

            .it-note-wrapper {
                position: relative;
                display: flex;
                align-items: center;
                flex: 1;
            }

            .it-note-suggestion {
                position: absolute;
                left: 11px;
                top: 0;
                bottom: 0;
                display: flex;
                align-items: center;
                color: #94a3b8;
                font-family: 'Outfit', sans-serif;
                font-size: 11px;
                pointer-events: none;
                z-index: 1;
                white-space: nowrap;
                overflow: hidden;
                opacity: 0.5;
            }
            /* Kill bank decorations */
            tr::before, tr::after, td::before, td::after {
                display: none !important;
                background: none !important;
                border: none !important;
                box-shadow: none !important;
            }
        `;

        const style = document.createElement('style');
        style.id = "mx-global-styles";
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
        this.stylesInjected = true;
    }
};
