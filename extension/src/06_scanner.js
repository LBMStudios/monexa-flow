/**
 * 06_scanner.js — MONEXA FLOW
 * Motor de escaneo y observer del DOM (Scanner).
 * Detecta filas de transacciones en las tablas del banco e inyecta la UI de auditoría.
 * Depende de: 00_config.js (KEYS, STATUS_MAP, STATE_NEXT, PALETTE)
 *             01_db.js (DB_Engine), 02_logger.js (Logger),
 *             03_system.js (SystemControl), 04_data.js (DataCore)
 *             08_ui.js (UI) — referencia circular: UI.refreshDashboard()
 */

'use strict';

const Scanner = {
    isScanning: false,
    observer: null,
    currentAccount: null,   // Número/nombre de cuenta detectado en el DOM
    _debounceTimer: null,   // Timer para debounce del observer

    /**
     * Inicializa el scanner: procesa el DOM actual y activa el MutationObserver.
     */
    async init() {
        await this.processDOM();

        if (this.observer) {
            try { this.observer.disconnect(); } catch (_) { }
        }

        this.observer = new MutationObserver((mutations) => {
            // Filtro inmediato y agresivo (pre-debounce) 
            // Si las mutaciones no involucran elementos dentro de tablas (<TR>, <TBODY>), las ignoramos de plano.
            let relevantMutation = false;
            for (const m of mutations) {
                if (m.addedNodes) {
                    for (const node of m.addedNodes) {
                        if (node.nodeName === 'TR' || node.nodeName === 'TBODY' || (node.querySelector && node.querySelector('tr'))) {
                            relevantMutation = true;
                            break;
                        }
                    }
                }
                if (relevantMutation) break;
            }

            if (!relevantMutation) return;

            // Debounce: acumula mutaciones relevantes y ejecuta processDOM solo una vez
            // cada 300ms para evitar sobrecargar la página del banco.
            if (this._debounceTimer) clearTimeout(this._debounceTimer);
            this._debounceTimer = setTimeout(async () => {
                try {
                    if (!chrome.runtime?.id) { this.stop(); return; }

                    const enabled = await SystemControl.isEnabled();
                    if (!enabled) return;

                    await this.processDOM();
                } catch (e) {
                    if (e.message && e.message.includes("Extension context invalidated")) {
                        console.warn("Monexa: contexto invalidado, deteniendo observer.");
                        this.stop();
                    } else {
                        console.error("Scanner MutationObserver error:", e);
                    }
                }
            }, 300);
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    },


    /**
     * Detiene el observer y resetea el estado de escaneo.
     */
    stop() {
        if (this.observer) {
            try { this.observer.disconnect(); } catch (_) { }
            this.observer = null;
        }
        this.isScanning = false;
    },

    /**
     * Recorre las filas del DOM activo, genera fingerprints, aplica reglas
     * de auto-etiquetado y delega el renderizado a renderRowUI().
     */
    async processDOM() {
        const enabled = await SystemControl.isEnabled();
        if (!enabled) return;
        if (this.isScanning) return;

        this.isScanning = true;

        try {
            const config = await DB_Engine.fetch(KEYS.SETTINGS, { user: "" });
            if (!config.user) {
                this.isScanning = false;
                return;
            }

            const db = await DB_Engine.fetch(KEYS.TRANSACTIONS, { items: {} });
            const rules = await DB_Engine.fetch(KEYS.RULES, []);

            // --- Generar Datalists de Sugerencias para Autocompletado ---
            const allItems = Object.values(db.items);
            const uniqueTags = [...new Set(allItems.map(i => (i.tag || '').trim()).filter(t => t.length > 0))].sort();
            const uniqueNotes = [...new Set(allItems.map(i => (i.note || '').trim()).filter(n => n.length > 0 && !n.includes('Auto-Match')))].sort();

            if (!document.getElementById('mx-data-tags')) {
                const dlTags = document.createElement('datalist');
                dlTags.id = 'mx-data-tags';
                document.body.appendChild(dlTags);
                const dlNotes = document.createElement('datalist');
                dlNotes.id = 'mx-data-notes';
                document.body.appendChild(dlNotes);
            }
            document.getElementById('mx-data-tags').innerHTML = uniqueTags.map(t => `<option value="${DataCore.sanitizeText(t)}">`).join('');
            document.getElementById('mx-data-notes').innerHTML = uniqueNotes.map(n => `<option value="${DataCore.sanitizeText(n)}">`).join('');
            // ------------------------------------------------------------

            // Busca el contenedor de tabla activo de forma tolerante
            const view =
                document.querySelector(".tab-pane.active") ||
                document.querySelector("#principal") ||
                document.querySelector(".contenedor-tabla") ||
                document.body;

            const rows = view.querySelectorAll("tbody tr");

            let dbUpdated = false;

            for (const row of rows) {
                if (row.hasAttribute('data-monexa-ready') || row.cells.length < 3) continue;

                const cells = row.querySelectorAll("td");
                const nCols = cells.length;

                // Helper para limpiar espacios invisibles de las celdas del banco
                const extractAndClean = (cell) => (cell?.innerText || '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();

                const fecha = extractAndClean(cells[0]);
                const concepto = extractAndClean(cells[1]);

                // NUEVO: Extraer información visual directa de links/hipervínculos Y DATA TÉCNICA
                let extra = "";
                
                // Itaú suele pintar de azul y poner como hipervínculo la info valiosa en la segunda celda.
                // Buscamos cualquier elemento dentro de la celda que destaque (enlace, botón, o span con clase)
                const clickable = cells[1].querySelector('a, button, span.link, [onclick], [data-id], [data-nro]');
                
                if (clickable) {
                    const visibleText = extractAndClean(clickable);
                    const onclickText = clickable.getAttribute('onclick') || "";
                    const titleText   = clickable.getAttribute('title') || "";
                    const dataId      = clickable.getAttribute('data-id') || clickable.getAttribute('data-nro') || "";

                    // 1. Prioridad: Texto que el humano realmente leyó
                    if (visibleText && visibleText.toLowerCase() !== concepto.toLowerCase()) {
                        extra = visibleText;
                    } 
                    
                    // 2. Enriquecimiento técnico: Capturar IDs de operaciones (clave para auditoría forense)
                    const technicalMatch = onclickText.match(/['"](\d{6,})['"]/) || onclickText.match(/(\d{10,})/);
                    if (technicalMatch) {
                        const techId = technicalMatch[1];
                        extra += (extra ? " | ID:" : "ID:") + techId;
                    }

                    // 3. Atributos de ayuda
                    if (titleText && !extra.includes(titleText) && titleText.toLowerCase() !== concepto.toLowerCase()) {
                        extra += (extra ? " | " : "") + titleText;
                    }

                    if (dataId && !extra.includes(dataId)) {
                        extra += (extra ? " | REF:" : "REF:") + dataId;
                    }
                }

                // Ignorar filas que no sean movimientos reales (ej: Saldo anterior, cotizaciones)
                const fLower = fecha.toLowerCase();
                if (!fecha || !concepto || concepto.toLowerCase().includes('saldo') || fLower.includes('u$s') || fLower.includes('pizarra') || fLower.includes('brou')) {
                    continue;
                }

                // Itaú: Fecha | Concepto | Débito | Crédito | Saldo
                let debito = '';
                let credito = '';
                let saldo = '';

                if (nCols >= 5) {
                    // Tabla estándar de Itaú: col2=débito, col3=crédito, col4=saldo
                    debito = extractAndClean(cells[2]);
                    credito = extractAndClean(cells[3]);
                    saldo = extractAndClean(cells[4]);
                } else if (nCols >= 4) {
                    debito = extractAndClean(cells[2]);
                    credito = extractAndClean(cells[3]);
                } else {
                    debito = extractAndClean(cells[nCols - 1]);
                }

                // Contabilidad Avanzada: Detección de Moneda y Contexto
                const moneda = DataCore.normalizeCurrency(row.innerText + (this.currentAccount || ""));
                const direction = DataCore.detectDirection(debito, credito);
                const amount = DataCore.normalizeAmount(debito || credito);

                // Fingerprint basado en cuenta + moneda + fecha + concepto + débito + crédito + saldo
                const importeKey = debito || credito || '';
                const hash = DataCore.createFingerprint(concepto, importeKey, fecha, saldo, moneda, this.currentAccount || "GLOBAL");
                let record = db.items[hash];

                // Rastrear click para vincular el modal que se abrirá (Detección en toda la fila)
                // Rastrear click para vincular el modal que se abrirá (Detección en toda la fila)
                row.addEventListener('click', () => {
                    window._mxLastClickedHash = hash;
                    chrome.storage.local.set({ "_mxLastClickedHash": hash });
                }, true); // Use capture to catch it before potential redirection


                // Buscar si hace match con alguna regla
                // Prioridad: primero reglas con texto+importe (más específicas), luego solo texto
                const c_clean = concepto.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
                const e_clean = extra.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
                const normalizeAmt = (s) => (s || '').replace(/[.\s]/g, '').replace(/,/g, '').trim();
                const sortedRules = [...rules].sort((a, b) => (b.importe ? 1 : 0) - (a.importe ? 1 : 0));

                const matchRule = sortedRules.find(r => {
                    const r_clean = (r.pattern || "").replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
                    if (!r_clean) return false;

                    // Match en concepto O en info extra (links)
                    const matchConcepto = c_clean.includes(r_clean);
                    const matchExtra = e_clean.includes(r_clean);

                    if (!matchConcepto && !matchExtra) return false;

                    // Si la regla tiene importe, verificar que coincida
                    if (r.importe) {
                        const rAmt = normalizeAmt(r.importe);
                        const txAmt = normalizeAmt(debito) || normalizeAmt(credito);
                        return rAmt === txAmt;
                    }
                    return true;
                });

                // Crear registro en la DB obligatoriamente si no existe
                // (Para que SIEMPRE aparezca en el Dashboard aunque el usuario no interactúe con él)
                if (!record) {
                    record = {
                        fecha, concepto, extra, debito, credito, saldo,
                        moneda, direction, amount,
                        tag: matchRule ? matchRule.label : "",
                        note: matchRule ? (matchRule.note || "Auto-Match") : "",
                        status: matchRule ? "VERDE" : "NONE",
                        ruleColor: matchRule ? (matchRule.color || 'verde') : "",
                        user: config.user,
                        ts: new Date().toLocaleString()
                    };
                    db.items[hash] = record;
                    dbUpdated = true;
                } else {
                    // Acción retroactiva: Si ya existía pero no tenía 'extra' o cambió, lo actualizamos
                    if (extra && record.extra !== extra) {
                        record.extra = extra;
                        dbUpdated = true;
                    }

                    if (matchRule && (!record.tag || record.tag.trim().toLowerCase() === 'etiqueta') && (record.status === "NONE" || record.status === "PENDING")) {
                        // Acción retroactiva: Si ya existía sin etiquetar, le aplica la nueva regla
                        record.tag = matchRule.label;
                        record.note = matchRule.note || "Auto-Match (Retroactivo)";
                        record.status = "VERDE";
                        record.ruleColor = matchRule.color || 'verde';
                        record.ts = new Date().toLocaleString();
                        dbUpdated = true;
                    }
                }

                this.renderRowUI(
                    row,
                    record,
                    hash,
                    config.user
                );

                row.setAttribute('data-monexa-ready', 'true');
            }

            // Commit solo una vez al final si agregamos registros nuevos
            // Usamos requestIdleCallback para no bloquear la UI del banco en el guardado
            if (dbUpdated) {
                const finalizeCommit = async () => {
                    UI.setSyncing(true);
                    await DB_Engine.commit(KEYS.TRANSACTIONS, db);
                    setTimeout(() => UI.setSyncing(false), 800);
                    await UI.refreshDashboard();
                };

                if (window.requestIdleCallback) {
                    window.requestIdleCallback(() => finalizeCommit());
                } else {
                    finalizeCommit();
                }
            }
            // Detectar número de cuenta y actualizar chip del launcher
            const accountInfo = this.detectAccountInfo();
            if (accountInfo !== this.currentAccount) {
                this.currentAccount = accountInfo;
                if (typeof UI !== 'undefined') UI.updateLauncherAccount(accountInfo);
            }

            // Detectar saldo oficial para Gap Detection
            const officialBalance = this.detectOfficialBalance();
            if (officialBalance !== null && typeof UI !== 'undefined' && UI.updateOfficialBalance) {
                UI.updateOfficialBalance(officialBalance);
            }

        } catch (err) {
            console.error("Scanner processDOM error:", err);
            await Logger.error("Scanner failure: " + err.message);
        } finally {
            this.isScanning = false;
        }
    },

    /**
     * Intenta extraer el número o nombre de cuenta bancaria del DOM.
     * Prueba múltiples selectores comunes del sitio de Itaú Uruguay.
     * @returns {string|null} Número/nombre de cuenta encontrado, o null.
     */
    detectAccountInfo() {
        // Lista de estrategias de detección, ordenadas por precisión
        const strategies = [
            // 1. Atributo data específico de Itaú
            () => document.querySelector('[data-cuenta]')?.dataset?.cuenta,
            () => document.querySelector('[data-account]')?.dataset?.account,

            // 2. Selectores de clase comunes en homebanking
            () => document.querySelector('.numero-cuenta')?.innerText,
            () => document.querySelector('.account-number')?.innerText,
            () => document.querySelector('.cuenta-numero')?.innerText,
            () => document.querySelector('#numeroCuenta')?.innerText,
            () => document.querySelector('.nro-cuenta')?.innerText,
            () => document.querySelector('.num-cuenta')?.innerText,

            // 3. Texto del título de la sección activa (pestañas / breadcrumb)
            () => document.querySelector('.tab-pane.active h3')?.innerText,
            () => document.querySelector('.tab-pane.active h4')?.innerText,
            () => document.querySelector('.contenedor-tabla h3')?.innerText,
            () => document.querySelector('.contenedor-tabla h4')?.innerText,
            () => document.querySelector('#titulo-cuenta')?.innerText,
            () => document.querySelector('.titulo-cuenta')?.innerText,

            // 4. Select/option activo (selector de cuentas)
            () => {
                const sel = document.querySelector('select[name*="cuenta"], select[id*="cuenta"], select[name*="account"]');
                return sel ? sel.options[sel.selectedIndex]?.text : null;
            },

            // 5. Regex sobre el texto del encabezado: busca patrones de cuenta bancaria
            //    Ejemplos: "001-123456/7", "0011234560", "CA 000123456"
            () => {
                const headers = document.querySelectorAll('h1, h2, h3, h4, .page-title, .section-title, .breadcrumb');
                const reAccount = /(?:(?:CC|CA|CU|N[\u00BA°]?\.?\s*)\s*[\d\-\/]{5,}|\b\d{3}[-\/]\d{4,}[-\/]\d)/i;
                for (const el of headers) {
                    const match = el.innerText?.match(reAccount);
                    if (match) return match[0].trim();
                }
                return null;
            }
        ];

        for (const fn of strategies) {
            try {
                const val = fn();
                if (val && val.trim()) return val.trim();
            } catch (_) { /* continuar con la siguiente estrategia */ }
        }
        return null;
    },

    /**
     * Intenta extraer el saldo oficial de la cuenta del DOM.
     * @returns {number|null} Saldo oficial detectado.
     */
    detectOfficialBalance() {
        const selectors = [
            '.saldo-disponible', '.available-balance', '#saldoTotal', '.total-balance',
            '.monto-saldo', '.valor-saldo', '.saldo-cuenta', '.amount-balance',
            'span[title*="Saldo"]', 'div[title*="Saldo"]'
        ];

        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) {
                const val = DataCore.normalizeAmount(el.innerText);
                if (val !== 0) return val;
            }
        }
        return null;
    },

    /**
     * Inyecta una celda de auditoría al final de cada fila de transacción.
     * Incluye inputs de tag/nota, botón de ciclo de estado y botón de borrado.
     */
    renderRowUI(row, data, hash, user) {
        const existingCell = row.querySelector(".it-data-node");
        if (existingCell) return;

        // Colores sutiles de fondo para no romper la estética de la tabla del banco
        const rowColors = {
            'VERDE': 'rgba(16, 185, 129, 0.08)',
            'AMARILLO': 'rgba(245, 158, 11, 0.08)',
            'ROJO': 'rgba(225, 29, 72, 0.08)',
            'NONE': 'transparent'
        };

        const statusBorder = {
            'VERDE': '4px solid #10b981',
            'AMARILLO': '4px solid #f59e0b',
            'ROJO': '4px solid #ef4444',
            'NONE': '0px solid transparent'
        };

        row.style.backgroundColor = rowColors[data.status] || 'transparent';
        row.style.transition = "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)";
        row.style.borderLeft = statusBorder[data.status];

        // Marcar visualmente si fue detectado por el motor de reglas (V1 Premium)
        if (data.note && data.note.includes("Auto-Match")) {
            row.classList.add('mx-row-automatched');
        }

        const td = document.createElement("td");
        td.className = "it-data-node";
        td.style.cssText = `
            border-left: 2px solid #e5e7eb;
            padding: 0 8px;
            white-space: nowrap;
            vertical-align: middle;
        `;

        const statusInfo =
            STATUS_MAP[
            Object.keys(STATUS_MAP).find(k => STATUS_MAP[k].id === data.status)
            ] || STATUS_MAP.PENDING;

        // Estilos inline integrados al diseño Itaú pero con toque premium
        const inputStyle = `
            font-family: 'Outfit', sans-serif;
            font-size: 11px;
            color: #1f2937;
            background: rgba(0,0,0,0.03);
            border: 1px solid rgba(0,0,0,0.05);
            border-radius: 8px;
            padding: 5px 10px;
            outline: none;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        `;

        // Tooltip con info de quién editó y cuándo
        const auditTip = data.user && data.ts
            ? `Editado por ${data.user} · ${data.ts}`
            : 'Sin editar aún';

        td.innerHTML = `
            <div style="display: flex; align-items: center; gap: 6px; height: 100%;">
                <input
                    type="text"
                    class="it-field-tag"
                    placeholder="Etiqueta"
                    aria-label="Etiqueta"
                    list="mx-data-tags"
                    value="${DataCore.sanitizeText(data.tag || '')}"
                    title="${auditTip}"
                style="${inputStyle} width: 70px; font-weight: 600; color: ${(data.ruleColor && RULE_COLORS[data.ruleColor]) ? RULE_COLORS[data.ruleColor].hex : '#059669'};"
                >
                <div style="position: relative; display: flex; align-items: center; width: 120px;">
                    <input
                        type="text"
                        class="it-field-note"
                        placeholder="Nota..."
                        aria-label="Nota"
                        list="mx-data-notes"
                        value="${DataCore.sanitizeText(data.note || '')}"
                        title="${auditTip}"
                        style="${inputStyle} width: 120px; font-style: ${data.note ? 'normal' : 'italic'}; color: ${data.note ? '#374151' : '#9ca3af'}; position: relative; z-index: 2; background: transparent;"
                    >
                    <div class="it-note-suggestion" style="position: absolute; left: 10px; top: 0; bottom: 0; display: flex; align-items: center; color: rgba(0,0,0,0.2); font-family: 'Outfit', sans-serif; font-size: 11px; pointer-events: none; z-index: 1; white-space: nowrap; overflow: hidden; width: 100px;"></div>
                </div>
                <button
                    class="it-btn-cycle"
                    title="${statusInfo.label}"
                    style="
                        background: ${statusInfo.color};
                        color: white;
                        border: none;
                        border-radius: 10px;
                        width: 26px; height: 26px;
                        min-width: 26px;
                        cursor: pointer;
                        display: flex; align-items: center; justify-content: center;
                        font-size: 12px;
                        font-weight: 800;
                        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                        box-shadow: 0 4px 10px ${statusInfo.color}44;
                        line-height: 1;
                        padding: 0;
                    "
                >${statusInfo.icon}</button>
                <button
                    class="it-btn-del"
                    title="Borrar registro"
                    style="
                        background: none;
                        border: none;
                        color: #d1d5db;
                        cursor: pointer;
                        font-size: 13px;
                        padding: 0 2px;
                        line-height: 1;
                        transition: color 0.2s;
                        opacity: 0;
                    "
                >×</button>
            </div>
        `;

        row.appendChild(td);

        // --- Hover en fila: mostrar botón borrar ---
        row.addEventListener('mouseenter', () => {
            const del = row.querySelector('.it-btn-del');
            if (del) del.style.opacity = '1';
        });
        row.addEventListener('mouseleave', () => {
            const del = row.querySelector('.it-btn-del');
            if (del) del.style.opacity = '0';
        });

        const btnCycle = td.querySelector(".it-btn-cycle");
        const btnDel = td.querySelector(".it-btn-del");
        const inTag = td.querySelector(".it-field-tag");
        const inNote = td.querySelector(".it-field-note");

        // --- Input focus styling (borde naranja Itaú sutil) ---
        [inTag, inNote].forEach(input => {
            input.addEventListener('focus', () => {
                input.style.borderColor = '#ec7000';
                input.style.background = 'rgba(236,112,0,0.04)';
                if (input === inNote) {
                    input.style.fontStyle = 'normal';
                    input.style.color = '#374151';
                }
            });
            input.addEventListener('blur', () => {
                input.style.borderColor = 'transparent';
                input.style.background = 'transparent';
                if (input === inNote && !input.value) {
                    input.style.fontStyle = 'italic';
                    input.style.color = '#9ca3af';
                }
            });
        });

        // --- Hover en botón de estado ---
        btnCycle.addEventListener('mouseenter', () => {
            btnCycle.style.transform = 'scale(1.15)';
            btnCycle.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
        });
        btnCycle.addEventListener('mouseleave', () => {
            btnCycle.style.transform = 'scale(1)';
            btnCycle.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
        });

        // --- Hover en botón borrar ---
        btnDel.addEventListener('mouseenter', () => { btnDel.style.color = '#ef4444'; });
        btnDel.addEventListener('mouseleave', () => { btnDel.style.color = '#d1d5db'; });

        // Guarda cambios en storage y actualiza visualmente la fila
        const updateRecord = async (newStatus) => {
            try {
                const enabled = await SystemControl.isEnabled();
                if (!enabled) return;

                const currentDB = await DB_Engine.fetch(KEYS.TRANSACTIONS, { items: {} });
                const cells = row.querySelectorAll("td");
                const nC = cells.length;

                // Extraer débito/crédito/saldo de las columnas del banco (limpiando NBSP)
                const extractAndClean = (cell) => (cell?.innerText || '').replace(/\u00A0/g, ' ').trim();

                let deb = '', cred = '', sal = '';
                if (nC >= 5) {
                    deb = extractAndClean(cells[2]);
                    cred = extractAndClean(cells[3]);
                    sal = extractAndClean(cells[4]);
                } else if (nC >= 4) {
                    deb = extractAndClean(cells[2]);
                    cred = extractAndClean(cells[3]);
                } else {
                    deb = extractAndClean(cells[nC - 1]);
                }

                currentDB.items[hash] = {
                    fecha: (cells[0]?.innerText || "").trim(),
                    concepto: (cells[1]?.innerText || "").trim(),
                    debito: deb,
                    credito: cred,
                    saldo: sal,
                    tag: inTag.value,
                    note: inNote.value,
                    status: newStatus,
                    user: user,
                    ts: new Date().toLocaleString()
                };

                UI.setSyncing(true);
                await DB_Engine.commit(KEYS.TRANSACTIONS, currentDB);
                setTimeout(() => UI.setSyncing(false), 500);

                row.style.backgroundColor = rowColors[newStatus];
                const nextStatusObj = STATUS_MAP[
                    Object.keys(STATUS_MAP).find(k => STATUS_MAP[k].id === newStatus)
                ] || STATUS_MAP.PENDING;

                btnCycle.style.background = nextStatusObj.color;
                btnCycle.innerText = nextStatusObj.icon;
                btnCycle.title = nextStatusObj.label;

                // Actualizar tooltip con info de auditoría
                const newTip = `Editado por ${user} · ${new Date().toLocaleString()}`;
                inTag.title = newTip;
                inNote.title = newTip;

                await UI.refreshDashboard();
            } catch (err) {
                console.error("Update record error:", err);
                await Logger.error("Update record failure: " + err.message);
            }
        };

        // Cicla el estado: NONE → VERDE → AMARILLO → ROJO → NONE
        btnCycle.onclick = async () => {
            const next = STATE_NEXT[data.status] || 'NONE';
            const concepto = (row.querySelector('td:nth-child(2)')?.innerText || '').trim();
            data.status = next;
            await updateRecord(next);
            await Logger.info(`Estado → ${next} | ${concepto.substring(0, 40)}`, 'STATUS_CHANGE');
        };

        // Borra el registro de este movimiento
        btnDel.onclick = async () => {
            if (!confirm("¿Eliminar nota y estado de este movimiento?")) return;

            try {
                const currentDB = await DB_Engine.fetch(KEYS.TRANSACTIONS, { items: {} });
                delete currentDB.items[hash];
                await DB_Engine.commit(KEYS.TRANSACTIONS, currentDB);

                inTag.value = "";
                inNote.value = "";
                data.status = "NONE";
                row.style.backgroundColor = "transparent";
                btnCycle.style.background = STATUS_MAP.PENDING.color;
                btnCycle.innerText = STATUS_MAP.PENDING.icon;

                const concepto = (row.querySelector('td:nth-child(2)')?.innerText || '').trim();
                await Logger.info(`Registro eliminado | ${concepto.substring(0, 40)}`, 'DELETE');
                await UI.refreshDashboard();
            } catch (err) {
                console.error("Delete record error:", err);
                await Logger.error("Delete record failure: " + err.message);
            }
        };

        // Guarda al perder foco o al presionar Enter
        [inTag, inNote].forEach(input => {
            input.onblur = () => {
                updateRecord(data.status);
                if (input === inNote) {
                    const sugg = td.querySelector('.it-note-suggestion');
                    if (sugg) sugg.textContent = '';
                }
            };
            input.onkeydown = (e) => { 
                if (e.key === 'Enter') updateRecord(data.status); 
                if (input === inNote && (e.key === 'Tab' || e.key === 'ArrowRight')) {
                    const sugg = td.querySelector('.it-note-suggestion');
                    if (sugg && sugg.textContent) {
                        e.preventDefault();
                        input.value = sugg.textContent;
                        sugg.textContent = '';
                        updateRecord(data.status);
                    }
                }
            };
        });

        // --- Lógica de autocompletado (Ghost Text y Control de Datalist) ---
        [inTag, inNote].forEach(input => {
            const listId = input.getAttribute('list');
            input.removeAttribute('list'); // Empezamos sin lista

            input.addEventListener('input', async () => {
                const val = input.value.trim().toLowerCase();
                
                // Mostrar datalist solo desde el 2ndo caracter
                if (val.length >= 2) {
                    input.setAttribute('list', listId);
                } else {
                    input.removeAttribute('list');
                }

                // Específico para Ghost Text de notas
                if (input === inNote) {
                    const sugg = td.querySelector('.it-note-suggestion');
                    if (!sugg) return;

                    if (val.length < 2) {
                        sugg.textContent = '';
                        return;
                    }

                    try {
                        const db = await DB_Engine.fetch(KEYS.TRANSACTIONS, { items: {} });
                        const allNotes = Object.values(db.items)
                            .map(i => (i.note || '').trim())
                            .filter(n => n && n.toLowerCase() !== 'auto-match' && !n.includes('Auto-Match'));
                        
                        const match = allNotes.find(n => n.toLowerCase().startsWith(val));
                        
                        if (match && match.toLowerCase() !== val) {
                            sugg.textContent = match;
                        } else {
                            sugg.textContent = '';
                        }
                    } catch (err) {
                        sugg.textContent = '';
                    }
                }
            });
        });
    },

    /**
     * Inicia un observador para detectar la apertura de modales de comprobantes.
     */
    initModalWatcher() {
        if (this._modalWatcher) return;

        this._modalWatcher = new MutationObserver((mutations) => {
            const titleElement = document.querySelector('.content-comprobante, #mySmallModalLabel');
            if (titleElement && titleElement.offsetParent !== null) {
                const modalContainer = titleElement.closest('.modal-content, .modal-dialog, #commonModal, #detallesModal') || titleElement.parentElement;
                const body = modalContainer?.querySelector('.modal-body, .content-comprobante-body, #imprimir-comprobante, #detalle-comprobante') || modalContainer;

                if (body && !body.hasAttribute('data-it-node')) {
                    this.scrapeModalContent(body);
                    body.setAttribute('data-it-node', 'true');
                }
            } else {
                document.querySelectorAll('[data-it-node]').forEach(el => el.removeAttribute('data-it-node'));
            }
        });

        this._modalWatcher.observe(document.body, { childList: true, subtree: true });
    },

    /**
     * Extrae información estructurada del modal y la guarda en la DB.
     */
    async scrapeModalContent(container) {
        let hash = window._mxLastClickedHash;
        if (!hash) {
            const data = await chrome.storage.local.get("_mxLastClickedHash");
            hash = data._mxLastClickedHash;
        }
        if (!hash) return;

        let text = "";
        let foundData = null;
        const maxRetries = 12;
        const retryDelay = 500;

        for (let i = 0; i < maxRetries; i++) {
            await new Promise(r => setTimeout(r, retryDelay));
            text = (container.innerText || "").trim();

            if (text.length < 25 || text.toLowerCase().includes("cargando")) continue;

            const mapping = {
                "Tipo": /^(Transferencia\s+[^\n]+|Dep[óo]sito\s+[^\n]+|Pago\s+[^\n]+|Cobro\s+[^\n]+|Debito\s+[^\n]+|Cr[eé]dito\s+[^\n]+)/i,
                "Detalle": /(?:Beneficiario|Destino|Nombre del receptor|Comercio|Convenio|Servicio)[:\s]+([^\s][^\n]+)/i,
                "Origen": /(?:Ordenante|Origen|De la cuenta|Cuenta de cargo)[:\s]+([^\s][^\n]+)/i,
                "Operación": /(?:N[úu]mero\s+de\s+operaci[óo]n|Operaci[óo]n\s+N[\u00BA°]|N[úu]mero\s+de\s+orden\s+de\s+pago|Folio|ID|Transacción)[:\s]+([^\n]+)/i,
                "Referencia": /(?:Referencia|Concepto de la operaci[óo]n|Motivo|Referencia\s+del\s+cliente)[:\s]+([^\n]+)/i,
                "Importe": /(?:Importe\s+recibido|Total\s+acreditado|Importe|Monto|Total\s+a\s+pagar)[:\s]+([^\d]*)([\d.,\s]+)/i,
                "Moneda": /Moneda[:\s]+([A-Z$]{1,3})/i,
                "Banco": /(?:Banco\s+ordenante|Nombre\s+del\s+banco|Entidad|Banco\s+destino)[:\s]+([^\s][^\n]+)/i,
                "Fecha": /(?:Fecha|Realizado el|Fecha\s+de\s+pago)[:\s]+([\dd-][^\t\n]+)/i,
                "Hora": /Hora[:\s]+([\dd:][^\n]+)/i,
                "Estado": /(?:Estado|Resultado)[:\s]+([A-Z\s]{3,})/i
            };

            const fields = [];
            const processRegex = () => {
                for (const [key, regex] of Object.entries(mapping)) {
                    const match = text.match(regex);
                    if (match) {
                        let val = "";
                        if (key === "Importe" && match.length >= 3) {
                            val = (match[1] + match[2]).trim();
                        } else {
                            val = match[match.length - 1].trim();
                        }
                        val = val.split(/(Beneficiario|Ordenante|Importe|N[úu]mero|Referencia|Banco|Moneda|Fecha|Hora|Estado|Monto|Convenio|Tipo)/i)[0].trim();
                        fields.push(`${key}: ${val}`);
                    }
                }
            };

            processRegex();

            if (fields.length >= 2) { 
                foundData = fields.join(" | ");
                break;
            }

            const fullKeywords = ["comprobante", "ticket", "vencimiento", "confirmación", "operación exitosa"];
            if (fullKeywords.some(k => text.toLowerCase().includes(k))) {
                foundData = "[INFO] " + text.replace(/[\n\r\t]+/g, " ").replace(/\s+/g, " ").substring(0, 700).trim();
                break;
            }
        }

        if (foundData) {
            const db = await DB_Engine.fetch(KEYS.TRANSACTIONS, { items: {} });
            if (db.items[hash]) {
                const record = db.items[hash];
                const currentExtra = record.extra || "";

                if (foundData.length > currentExtra.length || (currentExtra.includes("ID:") && foundData.includes("Beneficiario:"))) {
                    record.extra = foundData;
                    await DB_Engine.commit(KEYS.TRANSACTIONS, db);
                    if (typeof UI !== 'undefined' && UI.refreshDashboard) UI.refreshDashboard();
                }
            }
        }
    }
};

// Auto-iniciar el watcher al cargar
if (typeof Scanner !== 'undefined') {
    Scanner.initModalWatcher();
}

// Interceptar eventos dirigidos al Banco (AutoScraping)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'autoScrapeInfo') {
        const { params, hash } = msg; 
        console.log("[Monexa] Auto-scrape solicitado por Dashboard:", params, hash);
        
        let foundLink = null;
        // Buscar el <a onclick="..."> que contenga los códigos de Itaú
        document.querySelectorAll('a[onclick], button[onclick]').forEach(el => {
            const onclickText = el.getAttribute('onclick') || '';
            // Validar que todos los parámetros del ID Técnico coincidan con este link
            const allMatch = params.every(p => onclickText.includes(p));
            if (allMatch) foundLink = el;
        });

        if (foundLink) {
            console.log("[Monexa] Fila encontrada. Simulando clic para extraer detalles.");
            window._mxLastClickedHash = hash; // Engañamos al scanner habitual simulando que dimos el clic
            
            // Guardamos localmente para asegurar
            chrome.storage.local.set({ _mxLastClickedHash: hash });
            
            foundLink.click(); // Al abrirse el modal de Itaú, Scanner.scrapeModalContent capturará todo
            sendResponse({ status: "CLICKED" });
        } else {
            console.warn("[Monexa] El banco cambió o ya no estás en la pantalla donde figura ese movimiento.");
            sendResponse({ error: "LINK_NOT_FOUND" });
        }
    }
    return true;
});
