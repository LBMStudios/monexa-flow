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

                // NUEVO: Extraer información visual directa de links/hipervínculos
                let extra = "";
                
                // Itaú suele pintar de azul y poner como hipervínculo la info valiosa en la segunda celda.
                // Buscamos cualquier elemento dentro de la celda que destaque (enlace, botón, o span con clase)
                const clickableElement = cells[1].querySelector('a, button, span.link, span[onclick]');
                
                if (clickableElement) {
                    // Tomamos el texto visible exacto que el humano lee en el renglón.
                    const visibleText = extractAndClean(clickableElement);
                    
                    // Solo lo guardamos si aporta algo más que el concepto base (a veces el concepto es "TRANSFERENCIA" 
                    // y el link dice lo mismo, o a veces el link dice "Juan Perez").
                    if (visibleText && visibleText.toLowerCase() !== concepto.toLowerCase()) {
                        extra = visibleText;
                    } else {
                        // Si el texto es idéntico, a lo mejor hay algo útil en el atributo title
                        const titleAttr = clickableElement.getAttribute('title') || "";
                        if (titleAttr && titleAttr.toLowerCase() !== concepto.toLowerCase()) {
                            extra = titleAttr;
                        }
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

                // Fingerprint basado en fecha + concepto + débito + crédito
                const importeKey = debito || credito || '';
                const hash = DataCore.createFingerprint(concepto, importeKey, fecha);
                let record = db.items[hash];

                // Rastrear click para vincular el modal que se abrirá (Detección en toda la fila)
                row.addEventListener('click', () => {
                    window._mxLastClickedHash = hash;
                    // Persistir por si hay navegación o recarga AJX
                    chrome.storage.local.set({ "_mxLastClickedHash": hash });
                    console.log("[Monexa] Rastreado click en row (completa):", hash);
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
                        tag: matchRule ? matchRule.label : "",
                        note: matchRule ? "Auto-Match" : "",
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
                        console.log(`[Monexa] Info Extra actualizada para registro existente: ${concepto}`);
                    }

                    if (matchRule && (!record.tag || record.tag.trim().toLowerCase() === 'etiqueta') && (record.status === "NONE" || record.status === "PENDING")) {
                        // Acción retroactiva: Si ya existía sin etiquetar, le aplica la nueva regla
                        record.tag = matchRule.label;
                        record.note = "Auto-Match (Retroactivo)";
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
            if (dbUpdated) {
                await DB_Engine.commit(KEYS.TRANSACTIONS, db);
            }

            // Detectar número de cuenta y actualizar chip del launcher
            const accountInfo = this.detectAccountInfo();
            if (accountInfo !== this.currentAccount) {
                this.currentAccount = accountInfo;
                if (typeof UI !== 'undefined') UI.updateLauncherAccount(accountInfo);
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
     * Inyecta una celda de auditoría al final de cada fila de transacción.
     * Incluye inputs de tag/nota, botón de ciclo de estado y botón de borrado.
     */
    renderRowUI(row, data, hash, user) {
        const existingCell = row.querySelector(".mx-cell-injected");
        if (existingCell) return;

        // Colores sutiles de fondo para no romper la estética de la tabla del banco
        const rowColors = {
            'VERDE': 'rgba(16, 185, 129, 0.06)',
            'AMARILLO': 'rgba(245, 158, 11, 0.06)',
            'ROJO': 'rgba(225, 29, 72, 0.06)',
            'NONE': 'transparent'
        };

        row.style.backgroundColor = rowColors[data.status] || 'transparent';
        row.style.transition = "background 0.3s ease";

        // Marcar visualmente si fue detectado por el motor de reglas (V1 Premium)
        if (data.note && data.note.includes("Auto-Match")) {
            row.classList.add('mx-row-automatched');
        }

        const td = document.createElement("td");
        td.className = "mx-cell-injected";
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

        // Estilos inline integrados al diseño Itaú
        const inputStyle = `
            font-family: inherit;
            font-size: 12px;
            color: #374151;
            background: transparent;
            border: 1px solid transparent;
            border-radius: 4px;
            padding: 3px 6px;
            outline: none;
            transition: border-color 0.2s, background 0.2s;
        `;

        // Tooltip con info de quién editó y cuándo
        const auditTip = data.user && data.ts
            ? `Editado por ${data.user} · ${data.ts}`
            : 'Sin editar aún';

        td.innerHTML = `
            <div style="display: flex; align-items: center; gap: 6px; height: 100%;">
                <input
                    type="text"
                    class="mx-input-tag"
                    placeholder="Etiqueta"
                    aria-label="Etiqueta"
                    value="${DataCore.sanitizeText(data.tag || '')}"
                    title="${auditTip}"
                style="${inputStyle} width: 70px; font-weight: 600; color: ${(data.ruleColor && RULE_COLORS[data.ruleColor]) ? RULE_COLORS[data.ruleColor].hex : '#059669'};"
                >
                <input
                    type="text"
                    class="mx-input-note"
                    placeholder="Nota..."
                    aria-label="Nota"
                    value="${DataCore.sanitizeText(data.note || '')}"
                    title="${auditTip}"
                    style="${inputStyle} width: 120px; font-style: ${data.note ? 'normal' : 'italic'}; color: ${data.note ? '#374151' : '#9ca3af'};"
                >
                <button
                    class="mx-btn-cycle"
                    title="${statusInfo.label}"
                    style="
                        background: ${statusInfo.color};
                        color: white;
                        border: none;
                        border-radius: 50%;
                        width: 22px; height: 22px;
                        min-width: 22px;
                        cursor: pointer;
                        display: flex; align-items: center; justify-content: center;
                        font-size: 11px;
                        font-weight: 700;
                        transition: transform 0.15s, box-shadow 0.15s;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.12);
                        line-height: 1;
                        padding: 0;
                    "
                >${statusInfo.icon}</button>
                <button
                    class="mx-btn-del"
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
            const del = row.querySelector('.mx-btn-del');
            if (del) del.style.opacity = '1';
        });
        row.addEventListener('mouseleave', () => {
            const del = row.querySelector('.mx-btn-del');
            if (del) del.style.opacity = '0';
        });

        const btnCycle = td.querySelector(".mx-btn-cycle");
        const btnDel = td.querySelector(".mx-btn-del");
        const inTag = td.querySelector(".mx-input-tag");
        const inNote = td.querySelector(".mx-input-note");

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

                await DB_Engine.commit(KEYS.TRANSACTIONS, currentDB);

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
            input.onblur = () => updateRecord(data.status);
            input.onkeydown = (e) => { if (e.key === 'Enter') updateRecord(data.status); };
        });
    },

    /**
     * Inicia un observador para detectar la apertura de modales de comprobantes.
     */
    initModalWatcher() {
        if (this._modalWatcher) return;
        console.log("[Monexa] Iniciando observador de modales profundos...");

        this._modalWatcher = new MutationObserver((mutations) => {
            // Buscamos el título o el modal según el HTML de Javier
            const titleElement = document.querySelector('.content-comprobante, #mySmallModalLabel');
            if (titleElement && titleElement.offsetParent !== null) {
                // Si encontramos el título, el "contenedor real" es el modal que lo envuelve
                const modalContainer = titleElement.closest('.modal-content, .modal-dialog, #commonModal, #detallesModal') || titleElement.parentElement;

                // Intentamos buscar el body específico dentro de ese modal
                const body = modalContainer?.querySelector('.modal-body, .content-comprobante-body, #imprimir-comprobante, #detalle-comprobante') || modalContainer;

                if (body && !body.hasAttribute('data-mx-scanned')) {
                    this.scrapeModalContent(body);
                    body.setAttribute('data-mx-scanned', 'true');
                }
            } else {
                // Limpiar marcas cuando NO hay modal visible
                document.querySelectorAll('[data-mx-scanned]').forEach(el => el.removeAttribute('data-mx-scanned'));
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
        if (!hash) {
            console.warn("[Monexa] No hay rastro de clic previo para este modal.");
            return;
        }

        console.log("[Monexa] Iniciando captura profunda con reintentos...");

        let text = "";
        let foundData = null;
        const maxRetries = 10;
        const retryDelay = 600;

        for (let i = 0; i < maxRetries; i++) {
            await new Promise(r => setTimeout(r, retryDelay));
            text = (container.innerText || "").trim();

            if (text.length < 20) continue; // Demasiado corto, esperar más

            const mapping = {
                "Tipo": /^(Transferencia\s+[^\n]+|Dep[óo]sito\s+[^\n]+|Pago\s+[^\n]+)/i,
                "Beneficiario": /Beneficiario[:\s]+([^\s][^\n]+)/i,
                "Ordenante": /Ordenante[:\s]+([^\s][^\n]+)/i,
                "Operación": /(N[úu]mero\s+de\s+operaci[óo]n|N[úu]mero\s+de\s+orden\s+de\s+pago)[:\s]+([^\n]+)/i,
                "Referencia": /Referencia\s+Bevsa[:\s]+([^\n]+)/i,
                "Importe": /(Importe\s+recibido|Total\s+acreditado)[:\s]+([^\s][^\n]+)/i,
                "Banco": /(Banco\s+ordenante|Nombre\s+del\s+banco)[:\s]+([^\s][^\n]+)/i,
                "Fecha": /Fecha[:\s]+([\dd-][^\t\n]+)/i,
                "Hora": /Hora[:\s]+([\dd:][^\n]+)/i,
                "Estado": /Estado[:\s]+([A-Z\s]{3,})/i
            };

            const fields = [];
            for (const [key, regex] of Object.entries(mapping)) {
                const match = text.match(regex);
                if (match) {
                    let val = match[match.length - 1].trim();
                    val = val.split(/(Beneficiario|Ordenante|Importe|N[úu]mero|Referencia|Banco|Moneda|Fecha|Subtitulo|T[íi]tulo)/i)[0].trim();
                    fields.push(`${key}: ${val}`);
                }
            }

            if (fields.length >= 2) { // Si encontramos al menos 2 campos relevantes, es un éxito
                foundData = fields.join(" | ");
                break;
            }

            // Si tiene palabras clave aunque no mapeemos campos, también vale como fallback
            if (text.toLowerCase().includes("operación") || text.toLowerCase().includes("beneficiario")) {
                foundData = "COMPROBANTE: " + text.replace(/[\n\t]+/g, " ").substring(0, 600).trim();
                break;
            }

            console.log(`[Monexa] Reintento ${i + 1}/${maxRetries}... esperando texto del banco.`);
        }

        if (foundData) {
            console.log("[Monexa] ¡ÉXITO! Data real capturada:", foundData.substring(0, 50) + "...");
            const db = await DB_Engine.fetch(KEYS.TRANSACTIONS, { items: {} });
            if (db.items[hash]) {
                const record = db.items[hash];
                const currentExtra = record.extra || "";

                // SOBREESCRITURA AGRESIVA: 
                // Si la info actual tiene "[ID]:" o "[URL]:" o es muy corta, sobreescribir SIEMPRE.
                const isTechnical = currentExtra.includes('[ID]:') || currentExtra.includes('[URL]:') || currentExtra.length < 15 || !currentExtra.includes(':');

                if (isTechnical || currentExtra.length < foundData.length) {
                    record.extra = foundData;
                    await DB_Engine.commit(KEYS.TRANSACTIONS, db);
                    console.log("[Monexa] Registro actualizado en DB con datos reales.");

                    if (typeof UI !== 'undefined' && UI.refreshDashboard) {
                        UI.refreshDashboard();
                    }
                    window.dispatchEvent(new CustomEvent('mx-db-updated'));
                }
            }
        } else {
            console.warn("[Monexa] No se pudo extraer información real del comprobante tras 5 segundos.");
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
