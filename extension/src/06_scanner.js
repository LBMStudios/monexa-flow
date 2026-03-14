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
    _worker: null,          // Instancia del Web Worker

    /**
     * Inicializa el scanner: procesa el DOM actual y activa el MutationObserver.
     */
    async init() {
        this.initWorker();
        this.initEventListeners();
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

        // 🛡️ Heartbeat de seguridad: re-escanea cada 3 segundos
        // para capturar cambios que el Observer por alguna razón no detecte (ej: iframes, AJAX lento)
        setInterval(() => {
            if (!this.isScanning) this.processDOM();
        }, 3000);
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
     * Fuerza un re-escaneo completo limpiando las marcas de 'procesado'.
     * Útil cuando cambian las reglas y queremos que se apliquen retroactivamente.
     */
    async reprocess() {
        // Limpiamos marcas de procesado y celdas inyectadas para forzar el repintado con las nuevas reglas
        const rows = document.querySelectorAll('tr[data-monexa-ready]');
        rows.forEach(r => {
            r.removeAttribute('data-monexa-ready');
            const cell = r.querySelector('.it-data-node');
            if (cell) cell.remove();
            
            // Resetear estilos de borde/fondo previos
            r.style.backgroundColor = "transparent";
            r.style.borderLeft = "none";
        });
        await this.processDOM();
    },

    /**
     * Inicializa el Web Worker si no existe.
     */
    initWorker() {
        if (this._worker) return;
        try {
            // Cargar worker desde la raíz de la extensión
            this._worker = new Worker(chrome.runtime.getURL('src/01a_worker.js'));
            console.log("[Monexa] Worker inicializado correctamente.");
        } catch (e) {
            console.error("[Monexa] No se pudo iniciar el Worker, se usará fallback inline:", e);
            this._worker = null;
        }
    },

    /**
     * Matching de reglas INLINE (fallback cuando el Worker no está disponible).
     * Replica la misma lógica que el Worker para garantizar consistencia.
     */
    _matchRulesInline(data, rules, dbItems) {
        const normalizeStr = (s) => (s || '').toString().replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
        const c_clean = normalizeStr(data.concepto);
        const e_clean = normalizeStr(data.extra);

        const parseAmount = (s) => {
            if (!s) return NaN;
            let clean = s.toString().replace(/[^\d,.-]/g, '');
            if (clean.includes(',') && clean.includes('.')) {
                clean = clean.replace(/\./g, '').replace(',', '.');
            } else if (clean.includes(',')) {
                clean = clean.replace(',', '.');
            } else if (clean.includes('.')) {
                const parts = clean.split('.');
                const lastPart = parts[parts.length - 1];
                if (lastPart.length === 3) {
                    clean = clean.replace(/\./g, '');
                }
            }
            return parseFloat(clean);
        };

        const sortedRules = [...rules].sort((a, b) => (b.importe ? 1 : 0) - (a.importe ? 1 : 0));

        const matchRule = sortedRules.find(r => {
            const r_pattern = normalizeStr(r.pattern);
            if (!r_pattern) return false;
            const inText = c_clean.indexOf(r_pattern) !== -1 || e_clean.indexOf(r_pattern) !== -1;
            if (!inText) return false;
            if (r.importe) {
                const rN = parseAmount(r.importe);
                const txN = parseAmount(data.debito) || parseAmount(data.credito);
                return !isNaN(rN) && !isNaN(txN) && Math.abs(rN - txN) < 0.01;
            }
            return true;
        });

        let prediction = null;
        if (!matchRule) {
            prediction = DataCore.getPrediction ? DataCore.getPrediction(data.concepto, dbItems) : null;
        }

        return {
            matchRule: matchRule ? { label: matchRule.label, note: matchRule.note, color: matchRule.color } : null,
            prediction
        };
    },

    /**
     * Envía una fila al worker y devuelve una promesa con el resultado.
     * Si el Worker no está disponible, ejecuta el matching inline.
     */
    async processRowAsync(data, rules, dbItems) {
        // FALLBACK: Si el worker no cargó, hacer matching inline
        if (!this._worker) {
            return this._matchRulesInline(data, rules, dbItems);
        }

        return new Promise((resolve) => {
            const requestId = Math.random().toString(36).substring(7);
            
            // Timeout de seguridad: si el worker no responde en 3s, usar fallback inline
            const timeout = setTimeout(() => {
                this._worker.removeEventListener('message', handler);
                console.warn("[Monexa] Worker timeout, usando fallback inline para esta fila.");
                resolve(this._matchRulesInline(data, rules, dbItems));
            }, 3000);

            const handler = (e) => {
                if (e.data.action === 'ROW_PROCESSED' && e.data.requestId === requestId) {
                    clearTimeout(timeout);
                    this._worker.removeEventListener('message', handler);
                    resolve(e.data.result);
                }
            };
            
            this._worker.addEventListener('message', handler);
            this._worker.postMessage({
                action: 'PROCESS_ROW',
                requestId,
                data: { ...data, rules, dbItems }
            });
        });
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

            // Diagnóstico de reglas cargadas
            if (rules.length > 0) {
                console.log(`[Monexa] Motor de Reglas: ${rules.length} regla(s) activa(s)`, rules.map(r => r.pattern));
            } else {
                console.warn("[Monexa] Motor de Reglas: Sin reglas configuradas. Crea reglas en el panel lateral.");
            }

            // --- Gestión Eficiente de Datalists ---
            const allItems = Object.values(db.items || {});
            const uniqueTags = [...new Set(allItems.map(i => i.tag).filter(t => t))];
            const uniqueNotes = [...new Set(allItems.map(i => i.note).filter(n => n))];

            let dlTags = document.getElementById('mx-data-tags');
            let dlNotes = document.getElementById('mx-data-notes');
            
            if (!dlTags) {
                dlTags = document.createElement('datalist');
                dlTags.id = 'mx-data-tags';
                document.body.appendChild(dlTags);
                dlNotes = document.createElement('datalist');
                dlNotes.id = 'mx-data-notes';
                document.body.appendChild(dlNotes);
            }

            // Solo actualizar el DOM si el contenido cambió (previene reflows)
            const tagsHTML = uniqueTags.map(t => `<option value="${DataCore.sanitizeText(t)}">`).join('');
            const notesHTML = uniqueNotes.map(n => `<option value="${DataCore.sanitizeText(n)}">`).join('');
            
            if (dlTags.innerHTML !== tagsHTML) dlTags.innerHTML = tagsHTML;
            if (dlNotes.innerHTML !== notesHTML) dlNotes.innerHTML = notesHTML;
            // BUSCA EL CONTENEDOR DE TABLA ACTIVO (ITAÚ ESPECÍFICO)
            const view =
                document.querySelector(".tab-pane.active") ||
                document.querySelector("#principal") ||
                document.querySelector(".contenedor-tabla") ||
                document.body;

            const rows = view.querySelectorAll("tbody tr");

            let dbUpdated = false;

            for (const row of rows) {
                if (row.hasAttribute('data-monexa-ready')) continue;
                
                const cells = row.querySelectorAll("td");
                if (cells.length < 3) continue;

                // Helper para limpiar espacios invisibles de las celdas del banco
                const extractAndClean = (cell) => (cell?.innerText || '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();

                const fecha    = extractAndClean(cells[0]);
                const concepto = extractAndClean(cells[1]);
                const debito   = extractAndClean(cells[2]);
                const credito  = extractAndClean(cells[3]);
                const saldo    = extractAndClean(cells[4]);

                // NUEVO: Extraer información visual extra de Itaú (Links/Hipervínculos)
                let extra = "";
                const clickable = cells[1].querySelector('a, button, span.link, [onclick], [data-id], [data-nro]');
                
                if (clickable) {
                    const visibleText = extractAndClean(clickable);
                    const onclickText = clickable.getAttribute('onclick') || "";
                    
                    if (visibleText && visibleText.toLowerCase() !== concepto.toLowerCase()) {
                        extra = visibleText;
                    } 
                    
                    // Capturar IDs técnicos de Itaú
                    const techMatch = onclickText.match(/['"](\d{6,})['"]/) || onclickText.match(/(\d{10,})/);
                    if (techMatch) extra += (extra ? " | ID:" : "ID:") + techMatch[1];
                }

                // Normalización de moneda y sentido (Itaú Pro)
                const moneda    = DataCore.normalizeCurrency(fecha + concepto);
                const direction = DataCore.detectDirection(debito, credito);
                const amount    = DataCore.normalizeAmount(direction === 'OUT' ? debito : credito);

                // Filtro de integridad (Itaú)
                const fLower = fecha.toLowerCase();
                if (!fecha || !concepto || concepto.toLowerCase().includes('saldo') || fLower.includes('u$s') || fLower.includes('pizarra')) {
                    continue;
                }

                const hash = DataCore.createFingerprint(concepto, (debito || credito || ''), fecha, saldo, moneda, this.currentAccount || "GLOBAL");
                let record = db.items[hash];

                // Guardar el hash en el dataset de la fila para delegación de eventos
                row.dataset.monexaHash = hash;


                // DELEGACIÓN AL WORKER (OFF-MAIN-THREAD)
                const workerResult = await this.processRowAsync(
                    { concepto, extra, debito, credito },
                    rules,
                    db.items
                );

                const { matchRule, prediction } = workerResult;

                // Crear registro en la DB obligatoriamente si no existe
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
                    if (extra && record.extra !== extra) {
                        record.extra = extra;
                        dbUpdated = true;
                    }

                    const canUpdate = !record.tag || 
                                      record.tag.trim().toLowerCase() === 'etiqueta' || 
                                      (record.note && record.note.includes("Auto-Match"));

                    if (matchRule && canUpdate && (record.status === "NONE" || record.status === "VERDE" || record.status === "PENDING")) {
                        record.tag = matchRule.label;
                        record.note = matchRule.note || "Auto-Match (Retroactivo)";
                        record.status = "VERDE";
                        record.ruleColor = matchRule.color || 'verde';
                        record.ts = new Date().toLocaleString();
                        dbUpdated = true;
                    }
                }

                if (prediction && record.status === 'NONE') {
                    row.dataset.mxPrediction = JSON.stringify(prediction);
                }

                this.renderRowUI(
                    row,
                    record,
                    hash,
                    config.user,
                    prediction
                );

                row.setAttribute('data-monexa-ready', 'true');
            }

            // Commit solo una vez al final si agregamos registros nuevos
            if (dbUpdated) {
                const finalizeCommit = async () => {
                    if (typeof UI !== 'undefined') UI.setSyncing(true);
                    await DB_Engine.commit(KEYS.TRANSACTIONS, db);
                    if (typeof UI !== 'undefined') {
                        setTimeout(() => UI.setSyncing(false), 800);
                        await UI.refreshDashboard();
                    }
                };

                // Prioridad baja para el guardado
                if (window.requestIdleCallback) {
                    window.requestIdleCallback(() => finalizeCommit());
                } else {
                    setTimeout(() => finalizeCommit(), 100);
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
    renderRowUI(row, data, hash, user, prediction = null) {
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

        row.style.transition = "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)";

        // Determinar colores a aplicar
        let bgColor = rowColors[data.status] || 'transparent';
        let borderColor = null;

        if (data.ruleColor && RULE_COLORS[data.ruleColor]) {
            const hex = RULE_COLORS[data.ruleColor].hex;
            bgColor = hex + '18';
            borderColor = hex;
        } else if (data.status && data.status !== 'NONE') {
            const statusHexMap = { 'VERDE': '#10b981', 'AMARILLO': '#f59e0b', 'ROJO': '#ef4444' };
            borderColor = statusHexMap[data.status] || null;
        }

        // Aplicar a TODAS las celdas del renglón para forzar el color completo
        const allCells = row.querySelectorAll('td');
        allCells.forEach((cell, i) => {
            cell.style.setProperty('background-color', bgColor, 'important');
            
            // Matamos CUALQUIER rastro de bordes, sombras o brillos del banco
            cell.style.setProperty('border-left', 'none', 'important');
            cell.style.setProperty('box-shadow', 'none', 'important');
            cell.style.setProperty('outline', 'none', 'important');
            
            // Solo la primera celda real lleva el color de la regla (más gruesa para que tape todo)
            if (i === 0 && borderColor) {
                cell.style.setProperty('border-left', `6px solid ${borderColor}`, 'important');
            }
        });

        // Limpieza extra en el renglón
        row.style.setProperty('background-color', bgColor, 'important');
        row.style.setProperty('border', 'none', 'important');
        row.style.setProperty('box-shadow', 'none', 'important');
        // Marcar visualmente si fue detectado por el motor de reglas (V1 Premium)
        if (data.note && data.note.includes("Auto-Match")) {
            row.classList.add('mx-row-automatched');
        }

        const td = document.createElement("td");
        td.className = "it-data-node";
        td.dataset.hash = hash;
        const statusInfo =
            STATUS_MAP[
            Object.keys(STATUS_MAP).find(k => STATUS_MAP[k].id === data.status)
            ] || STATUS_MAP.PENDING;

        // Tooltip con info de quién editó y cuándo
        const auditTip = data.user && data.ts
            ? `Editado por ${data.user} · ${data.ts}`
            : 'Sin editar aún';

        td.innerHTML = `
            <div class="it-row-container">
                <input
                    type="text"
                    class="it-field-tag"
                    placeholder="Etiqueta"
                    aria-label="Etiqueta"
                    list="mx-data-tags"
                    value="${DataCore.sanitizeText(data.tag || '')}"
                    title="${auditTip}"
                    style="color: ${(data.ruleColor && RULE_COLORS[data.ruleColor]) ? RULE_COLORS[data.ruleColor].hex : '#059669'};"
                >
                <div class="it-note-wrapper">
                    <input
                        type="text"
                        class="it-field-note"
                        placeholder="${prediction ? '' : 'Nota...'}"
                        aria-label="Nota"
                        list="mx-data-notes"
                        value="${DataCore.sanitizeText(data.note || '')}"
                        title="${auditTip}"
                        style="font-style: ${data.note ? 'normal' : 'italic'}; color: ${data.note ? '#374151' : '#9ca3af'}; background: transparent; z-index: 2;"
                    >
                    <div class="it-note-suggestion">
                        ${prediction ? (data.note ? '' : prediction.note) : ''}
                    </div>
                </div>
                <button 
                    class="it-btn-cycle" 
                    title="${statusInfo.label}"
                    style="background: ${statusInfo.color}; box-shadow: 0 4px 10px ${statusInfo.color}44;"
                >${statusInfo.icon}</button>
                <button class="it-btn-del" title="Borrar registro">×</button>
            </div>
        `;

        row.appendChild(td);

    },

    /**
     * Motor de delegación de eventos global. 
     * Centraliza todas las interacciones de las filas de transacciones en un solo punto.
     */
    initEventListeners() {
        if (this._eventsInitialized) return;
        this._eventsInitialized = true;

        document.body.addEventListener('click', async (e) => {
            const target = e.target;
            const row = target.closest('tr[data-monexa-hash]');
            if (!row) return;

            const hash = row.dataset.monexaHash;
            
            // 1. Click en la fila -> Guardar hash para el modal de comprobantes
            window._mxLastClickedHash = hash;
            chrome.storage.local.set({ "_mxLastClickedHash": hash });

            // 2. Botón de Ciclo de Estado
            if (target.closest('.it-btn-cycle')) {
                e.stopPropagation();
                const db = await DB_Engine.fetch(KEYS.TRANSACTIONS, { items: {} });
                const record = db.items[hash];
                if (!record) return;

                const nextStatus = STATE_NEXT[record.status] || 'NONE';
                record.status = nextStatus;
                record.ts = new Date().toLocaleString();
                
                await this.updateRecordAndUI(row, record, hash);
            }

            // 3. Botón Borrar
            if (target.closest('.it-btn-del')) {
                e.stopPropagation();
                if (!confirm("¿Eliminar nota y estado de este movimiento?")) return;

                const db = await DB_Engine.fetch(KEYS.TRANSACTIONS, { items: {} });
                delete db.items[hash];
                await DB_Engine.commit(KEYS.TRANSACTIONS, db);

                const itNode = row.querySelector('.it-data-node');
                if (itNode) {
                    itNode.querySelector('.it-field-tag').value = "";
                    itNode.querySelector('.it-field-note').value = "";
                }
                
                row.style.backgroundColor = "transparent";
                row.style.borderLeft = "0 solid transparent";
                
                const btnPulse = row.querySelector('.it-btn-cycle');
                if (btnPulse) {
                    btnPulse.style.background = STATUS_MAP.PENDING.color;
                    btnPulse.innerText = STATUS_MAP.PENDING.icon;
                }

                await UI.refreshDashboard();
            }
        });

        // Eventos de Input (Tag y Note) con Throttling
        document.body.addEventListener('focusout', async (e) => {
            const target = e.target;
            if (target.classList.contains('it-field-tag') || target.classList.contains('it-field-note')) {
                const row = target.closest('tr[data-monexa-hash]');
                if (!row) return;
                
                const hash = row.dataset.monexaHash;
                const db = await DB_Engine.fetch(KEYS.TRANSACTIONS, { items: {} });
                const record = db.items[hash];
                if (!record) return;

                const tagInput = row.querySelector('.it-field-tag');
                const noteInput = row.querySelector('.it-field-note');
                
                record.tag = tagInput.value;
                record.note = noteInput.value;
                record.ts = new Date().toLocaleString();

                await this.updateRecordAndUI(row, record, hash);
            }
        });

        // Ocultar sugerencia al escribir
        document.body.addEventListener('input', (e) => {
            const target = e.target;
            if (target.classList.contains('it-field-note')) {
                const suggestion = target.parentElement.querySelector('.it-note-suggestion');
                if (suggestion) suggestion.style.display = 'none';
            }
        });

        document.body.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.target.classList.contains('it-field-tag') || e.target.classList.contains('it-field-note'))) {
                e.target.blur();
            }

            // AUTO-COMPLETE (GHOST ACTION) CON TAB
            if (e.key === 'Tab' && e.target.classList.contains('it-field-note')) {
                const row = e.target.closest('tr[data-monexa-hash]');
                if (row && row.dataset.mxPrediction && !e.target.value) {
                    const prediction = JSON.parse(row.dataset.mxPrediction);
                    e.preventDefault(); // Evitar que el foco salte
                    
                    const tagInput = row.querySelector('.it-field-tag');
                    const noteInput = e.target;
                    
                    tagInput.value = prediction.tag;
                    noteInput.value = prediction.note;
                    
                    const suggestion = row.querySelector('.it-note-suggestion');
                    if (suggestion) suggestion.style.display = 'none';
                    
                    noteInput.focus();
                    noteInput.blur(); // Trigger focusout per-save logic
                    
                    // Efecto visual de Flash Verde sutil
                    noteInput.style.background = "rgba(16, 185, 129, 0.1)";
                    setTimeout(() => noteInput.style.background = "rgba(0,0,0,0.03)", 300);
                }
            }
        });
    },

    /**
     * Actualiza el registro en la DB y refresca visualmente la fila específica.
     */
    async updateRecordAndUI(row, record, hash) {
        const config = await DB_Engine.fetch(KEYS.SETTINGS, { user: "Auditor" });
        record.user = config.user;

        const db = await DB_Engine.fetch(KEYS.TRANSACTIONS, { items: {} });
        db.items[hash] = record;

        if (typeof UI !== 'undefined') UI.setSyncing(true);
        await DB_Engine.commit(KEYS.TRANSACTIONS, db);
        if (typeof UI !== 'undefined') {
            setTimeout(() => UI.setSyncing(false), 500);
            await UI.refreshDashboard();
        }

        // Refresco visual de la fila
        const statusColors = { 'VERDE': 'rgba(16, 185, 129, 0.08)', 'AMARILLO': 'rgba(245, 158, 11, 0.08)', 'ROJO': 'rgba(225, 29, 72, 0.08)', 'NONE': 'transparent' };
        const statusBorders = { 'VERDE': '4px solid #10b981', 'AMARILLO': '4px solid #f59e0b', 'ROJO': '4px solid #ef4444', 'NONE': '0px solid transparent' };
        
        row.style.backgroundColor = statusColors[record.status] || 'transparent';
        row.style.borderLeft = statusBorders[record.status] || '0 solid transparent';

        const statusInfo = STATUS_MAP[Object.keys(STATUS_MAP).find(k => STATUS_MAP[k].id === record.status)] || STATUS_MAP.PENDING;
        const btn = row.querySelector('.it-btn-cycle');
        if (btn) {
            btn.style.background = statusInfo.color;
            btn.innerText = statusInfo.icon;
            btn.title = statusInfo.label;
        }
    },

    /**
     * Inicia un observador para detectar la apertura de modales de comprobantes.
     */
    initModalWatcher() {
        if (this._modalWatcher) return;

        let lastMarkedBody = null;

        this._modalWatcher = new MutationObserver((mutations) => {
            // Filtrado rápido: solo procesar si hubo cambios en los nodos hijos
            let hasRelevantChanges = false;
            for (const m of mutations) {
                if (m.addedNodes.length > 0 || m.removedNodes.length > 0) {
                    hasRelevantChanges = true;
                    break;
                }
            }
            if (!hasRelevantChanges) return;

            const titleElement = document.querySelector('.content-comprobante, #mySmallModalLabel');
            if (titleElement && titleElement.offsetParent !== null) {
                const modalContainer = titleElement.closest('.modal-content, .modal-dialog, #commonModal, #detallesModal') || titleElement.parentElement;
                const body = modalContainer?.querySelector('.modal-body, .content-comprobante-body, #imprimir-comprobante, #detalle-comprobante') || modalContainer;

                if (body && !body.hasAttribute('data-it-node')) {
                    this.scrapeModalContent(body);
                    body.setAttribute('data-it-node', 'true');
                    lastMarkedBody = body;
                }
            } else {
                if (lastMarkedBody) {
                    lastMarkedBody.removeAttribute('data-it-node');
                    lastMarkedBody = null;
                }
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
