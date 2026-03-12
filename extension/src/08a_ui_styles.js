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
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

            #mx-master-launcher {
                position: fixed;
                bottom: 30px;
                right: 30px;
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
                gap: 6px;
                z-index: 99999;
            }

            #mx-account-chip {
                background: rgba(236,112,0,0.85);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                color: white;
                font-family: 'Inter', sans-serif;
                font-size: 10px;
                font-weight: 700;
                padding: 3px 8px;
                border-radius: 20px;
                white-space: nowrap;
                max-width: 140px;
                overflow: hidden;
                text-overflow: ellipsis;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                border: 1px solid rgba(255,255,255,0.15);
                letter-spacing: 0.04em;
                opacity: 0;
                transform: translateY(4px);
                transition: opacity 0.3s ease, transform 0.3s ease;
                pointer-events: none;
            }

            #mx-account-chip.visible {
                opacity: 1;
                transform: translateY(0);
            }

            #mx-control-panel {
                position: fixed;
                top: 0;
                right: -400px;
                width: 380px;
                height: 100vh;
                background: rgba(10, 15, 25, 0.94);
                backdrop-filter: blur(32px) saturate(1.8);
                -webkit-backdrop-filter: blur(32px) saturate(1.8);
                z-index: 100000;
                box-shadow: -20px 0 80px rgba(0,0,0,0.6);
                border-left: 1px solid rgba(255,255,255,0.08);
                transition: right 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                display: flex;
                flex-direction: column;
                font-family: 'Inter', sans-serif;
            }

            #mx-control-panel.active {
                right: 0;
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
                padding: 20px;
                background: transparent;
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
                border-color: rgba(255,255,255,0.2);
                background: rgba(255,255,255,0.05);
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
        `;

        const style = document.createElement('style');
        style.id = "mx-global-styles";
        style.textContent = css;
        document.head.appendChild(style);
        this.stylesInjected = true;
    }
};
