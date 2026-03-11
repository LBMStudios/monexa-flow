/**
 * dashboard.js — MONEXA FLOW Analytics
 * Dashboard de análisis de auditoría bancaria para contadores y dueños de empresa.
 * Lee datos directamente de chrome.storage.local con las mismas claves que el content script.
 */

'use strict';

// ============================================================
// Estado local del dashboard
// ============================================================

const STATUS_CONFIG = {
    VERDE: { label: 'Validado', icon: '✓', color: '#10b981', bg: '#d1fae5' },
    AMARILLO: { label: 'Observado', icon: '!', color: '#f59e0b', bg: '#fef3c7' },
    ROJO: { label: 'Rechazado', icon: '×', color: '#e11d48', bg: '#ffe4e6' },
    NONE: { label: 'Sin revisar', icon: '○', color: '#94a3b8', bg: '#f1f5f9' }
};

// ============================================================
// Estado local del dashboard
// ============================================================
let allRecords = [];   // todos los registros cargados
let filteredRecs = [];   // registros tras aplicar filtros
let sortField = 'fecha';
let sortDir = 'asc';

// Estado para animación de KPIs
let _currentKPIs = { total: 0, verde: 0, amarillo: 0, rojo: 0, notag: 0, pct: 0 };

// ============================================================
// Fetch de storage
// ============================================================
function storageGet(key, fallback) {
    return new Promise(resolve => {
        try {
            const storage = chrome.storage.local;
            storage.get([key], res => {
                if (chrome.runtime.lastError) { resolve(fallback); return; }
                resolve(res[key] ?? fallback);
            });
        } catch (_) { resolve(fallback); }
    });
}

// ============================================================
// Arranque e inicialización
// ============================================================
async function refreshData() {
    console.log("[Monexa] Refrescando datos de storage...");
    const db = await storageGet(KEYS.TRANSACTIONS, { items: {} });
    allRecords = Object.entries(db.items || {}).map(([hash, r]) => ({ ...r, _hash: hash })).filter(r => {
        const fLower = (r.fecha || '').toLowerCase();
        return !fLower.includes('u$s') && !fLower.includes('pizarra') && !fLower.includes('brou');
    });
    populateTagFilter(allRecords);
    applyFiltersAndRender();

    // Re-abrir modal si estaba abierto para actualizar datos en vivo
    if (window._mxOpenExtraHash) {
        const r = allRecords.find(x => x._hash === window._mxOpenExtraHash);
        if (r && r.extra) {
            showExtraDetails(r.extra, r._hash);
        }
    }
}

// Escuchar actualizaciones desde el scanner u otras pestañas
window.addEventListener('mx-db-updated', refreshData);
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[KEYS.TRANSACTIONS]) {
        refreshData();
    }
});

// ============================================================
// Sistema de Actualización (Sideloading)
// ============================================================
async function checkUpdate() {
    try {
        const currentVersion = VERSION; // Usar la constante global sync
        let latestVersion = null;

        // 1. Intentar desde Cloud (Firebase) para aviso instantáneo
        if (typeof CloudConnector !== 'undefined') {
            const cloudVer = await CloudConnector.syncRemoteVersion();
            if (cloudVer) latestVersion = cloudVer.version;
        }

        // 2. Fallback a GitHub (Landing)
        if (!latestVersion) {
            const UPDATE_URL = "https://raw.githubusercontent.com/lbmstudios/monexa-flow/main/landing/version.json"; 
            const response = await fetch(UPDATE_URL + "?t=" + Date.now());
            if (response.ok) {
                const data = await response.json();
                latestVersion = data.version;
            }
        }

        if (latestVersion && latestVersion !== currentVersion) {
            const banner = document.getElementById('mx-update-banner');
            const versionVal = document.getElementById('mx-new-version-val');
            
            if (banner && versionVal) {
                versionVal.textContent = latestVersion;
                banner.style.display = 'block';
            }
        }
    } catch (e) {
        console.warn("[Monexa Update] Error al verificar actualizaciones:", e);
    }
}

// Handler para cerrar el banner de actualización
document.addEventListener('click', e => {
    if (e.target && e.target.id === 'mx-close-update') {
        const banner = document.getElementById('mx-update-banner');
        if (banner) banner.style.display = 'none';
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    // Header meta
    const config = await storageGet(KEYS.SETTINGS, {});
    const now = new Date();

    // Greeting name
    const userNameDisplay = document.getElementById('user-name-display');
    if (userNameDisplay && config.user) {
        userNameDisplay.textContent = config.user.charAt(0).toUpperCase() + config.user.slice(1);
    }

    const dashMeta = document.getElementById('dash-meta');
    if (dashMeta) {
        dashMeta.innerHTML =
            `Auditor: <b style="color:white">${(config.user || 'N/D').toUpperCase()}</b><br>` +
            now.toLocaleDateString('es-UY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    // Admin Features
    if (config.role === 'admin') {
        const navUsers = document.getElementById('nav-users');
        if (navUsers) navUsers.style.display = 'flex';

        const adminReleaseSec = document.getElementById('admin-release-section');
        if (adminReleaseSec) adminReleaseSec.style.display = 'block';

        const btnPublish = document.getElementById('btn-admin-publish');
        if (btnPublish) {
            btnPublish.onclick = async () => {
                const newVer = document.getElementById('admin-new-ver-input').value.trim();
                const changelog = document.getElementById('admin-changelog-input').value.trim();

                if (!newVer) { alert("Por favor indica la versión."); return; }
                
                btnPublish.disabled = true;
                btnPublish.textContent = "Publicando...";
                
                try {
                    const ok = await CloudConnector.publishRemoteVersion(newVer, changelog);
                    if (ok) {
                        // Lanzar cohete
                        const overlay = document.getElementById('mx-rocket-overlay');
                        const particles = document.getElementById('mx-rocket-particles');
                        if (overlay) {
                            // Generar partículas aleatorias
                            particles.innerHTML = "";
                            for(let i=0; i<30; i++) {
                                const p = document.createElement('div');
                                p.className = 'particle';
                                p.style.left = '50%'; p.style.top = '50%';
                                p.style.width = Math.random() * 8 + 4 + 'px';
                                p.style.height = p.style.width;
                                p.style.setProperty('--tx', (Math.random() - 0.5) * 800 + 'px');
                                p.style.setProperty('--ty', (Math.random() - 0.5) * 800 + 'px');
                                particles.appendChild(p);
                            }

                            overlay.classList.add('active');
                            setTimeout(() => overlay.classList.add('launching'), 100);

                            const btnCloseRocket = document.getElementById('btn-close-rocket');
                            if (btnCloseRocket) {
                                btnCloseRocket.onclick = () => {
                                    overlay.classList.remove('active', 'launching');
                                };
                            }
                        }

                        document.getElementById('admin-new-ver-input').value = "";
                        document.getElementById('admin-changelog-input').value = "";
                    } else {
                        alert("Error al publicar. Verifica la configuración de Firebase.");
                    }
                } catch (e) {
                    alert("Falla crítica: " + e.message);
                } finally {
                    btnPublish.disabled = false;
                    btnPublish.textContent = "Lanzar Actualización";
                }
            };
        }
    }

    const btnPurge = document.getElementById('btn-purge-audit');
    if (btnPurge) {
        btnPurge.style.display = 'flex';
        btnPurge.title = (config.role === 'admin') ? 'Resetear Auditoría Completa' : 'Borrar mis etiquetas y notas';
        btnPurge.addEventListener('click', purgeAudit);
    }
    
    // Check for updates (Sideloading support)
    checkUpdate();


    // Sidebar Toggle
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    if (sidebar && toggleBtn) {
        // Cargar estado previo
        const isCollapsed = localStorage.getItem('mx_sidebar_collapsed') === 'true';
        if (isCollapsed) sidebar.classList.add('collapsed');

        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            localStorage.setItem('mx_sidebar_collapsed', sidebar.classList.contains('collapsed'));
        });
    }

    const footerInfo = document.getElementById('footer-info');
    if (footerInfo) {
        footerInfo.innerHTML =
            `<b>Versión 1.2.3</b> · Desarrollada por <b>LBM Studios</b> · Generado el ${now.toLocaleString('es-UY')} · Auditor: ${config.user || 'N/D'}`;
    }

    // Cargar datos
    const db = await storageGet(KEYS.TRANSACTIONS, { items: {} });
    allRecords = Object.entries(db.items || {}).map(([hash, r]) => ({ ...r, _hash: hash })).filter(r => {
        const fLower = (r.fecha || '').toLowerCase();
        return !fLower.includes('u$s') && !fLower.includes('pizarra') && !fLower.includes('brou');
    });

    // Poblar select de tags
    populateTagFilter(allRecords);

    // Render inicial (SE MUEVE AL TIMEOUT DEL LOADER PARA QUE SEA VISIBLE)
    // applyFiltersAndRender(); 

    // Cargar panel de logs
    loadLogs();

    // Dismiss Loader
    const loader = document.getElementById('monexa-loader');
    if (loader) {
        setTimeout(() => {
            loader.classList.add('fade-out');
            document.body.classList.remove('loading');

            // Iniciar renderizado y animaciones cuando el loader empieza a irse
            applyFiltersAndRender();
        }, 1200); // 1.2s para que empiece justo antes de verse
    } else {
        applyFiltersAndRender();
    }


    // Eventos filtros principales (se aplican al instante)
    const fSearch = document.getElementById('filter-search');
    const fStatus = document.getElementById('filter-status');
    const fTag = document.getElementById('filter-tag');

    if (fSearch) fSearch.addEventListener('input', applyFiltersAndRender);
    if (fStatus) fStatus.addEventListener('change', applyFiltersAndRender);
    if (fTag) fTag.addEventListener('change', applyFiltersAndRender);

    // Delegación de eventos para la tabla (Detalles Extra)
    const movementsTbody = document.getElementById('movements-tbody');
    if (movementsTbody) {
        movementsTbody.addEventListener('click', (e) => {
            const tdExtra = e.target.closest('.td-extra');
            if (tdExtra) {
                const tr = tdExtra.closest('tr');
                const tdHash = tr ? tr.getAttribute('data-hash') : null;
                const rawData = tdExtra.getAttribute('data-extra');
                if (rawData) showExtraDetails(rawData, tdHash);
            }
        });
    }

    const btnClear = document.getElementById('btn-clear-filters');
    if (btnClear) btnClear.addEventListener('click', clearFilters);

    const btnExport = document.getElementById('btn-export-csv');
    if (btnExport) btnExport.addEventListener('click', exportCSV);

    const btnExportRaw = document.getElementById('btn-export-raw-csv');
    if (btnExportRaw) btnExportRaw.addEventListener('click', exportRawCSV);

    // Modal de Detalles Extra
    const modalExtra = document.getElementById('modal-extra');
    const btnClose1 = document.getElementById('btn-close-modal-extra');
    const btnClose2 = document.getElementById('btn-close-modal-extra-2');

    const closeModal = () => { if (modalExtra) modalExtra.style.display = 'none'; };
    if (btnClose1) btnClose1.onclick = closeModal;
    if (btnClose2) btnClose2.onclick = closeModal;
    if (modalExtra) {
        modalExtra.onclick = (e) => { if (e.target === modalExtra) closeModal(); };
    }

    // Header buttons (defensive adding)
    const btnNotif = document.getElementById('btn-notifications');
    if (btnNotif) btnNotif.addEventListener('click', toggleNotifications);

    const btnExpJson = document.getElementById('btn-export-json');
    if (btnExpJson) btnExpJson.addEventListener('click', exportJSON);

    // KPI Card buttons (defensive adding)
    const btnDetAma = document.getElementById('btn-details-amarillo');
    if (btnDetAma) btnDetAma.addEventListener('click', () => filterByStatus('AMARILLO'));

    const btnDetRoj = document.getElementById('btn-details-rojo');
    if (btnDetRoj) btnDetRoj.addEventListener('click', () => filterByStatus('ROJO'));

    const btnDetVer = document.getElementById('btn-details-verde');
    if (btnDetVer) btnDetVer.addEventListener('click', () => filterByStatus('VERDE'));

    // Eventos de presets de fecha
    document.querySelectorAll('.date-preset').forEach(btn => {
        btn.addEventListener('click', () => handlePresetClick(btn));
    });

    // Botón Aplicar rango personalizado
    const btnApplyDates = document.getElementById('btn-apply-dates');
    if (btnApplyDates) btnApplyDates.addEventListener('click', applyFiltersAndRender);

    // Ordenamiento de tabla
    document.querySelectorAll('thead th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.dataset.sort;
            if (sortField === field) {
                sortDir = sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                sortField = field;
                sortDir = 'asc';
            }
            document.querySelectorAll('thead th').forEach(h => {
                h.classList.remove('sorted-asc', 'sorted-desc');
            });
            th.classList.add(sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
            renderTable(filteredRecs);
        });
    });
});

// ============================================================
// Presets de fecha
// ============================================================
let activePeriod = 'all';

function handlePresetClick(btn) {
    const period = btn.dataset.period;
    activePeriod = period;

    // Actualizar estado activo visual
    document.querySelectorAll('.date-preset').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const rangeGroup = document.getElementById('date-range-group');
    const applyGroup = document.getElementById('date-apply-group');

    if (period === 'custom') {
        // Mostrar inputs de rango y botón aplicar
        rangeGroup.style.display = 'flex';
        applyGroup.style.display = 'flex';
    } else {
        // Ocultar rango, calcular fechas y aplicar
        rangeGroup.style.display = 'none';
        applyGroup.style.display = 'none';

        const { from, to } = calculatePeriodDates(period);
        document.getElementById('filter-date-from').value = from;
        document.getElementById('filter-date-to').value = to;
        applyFiltersAndRender();
    }
}

/**
 * Calcula las fechas desde/hasta para un período predefinido.
 * @returns {{ from: string, to: string }} fechas en formato yyyy-mm-dd
 */
function calculatePeriodDates(period) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const day = now.getDate();

    // Formatear fecha LOCAL (evita desfasaje UTC que causa toISOString)
    const fmt = (d) => {
        const yy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yy}-${mm}-${dd}`;
    };

    switch (period) {
        case 'current-month':
            return {
                from: fmt(new Date(year, month, 1)),
                to: fmt(new Date(year, month + 1, 0)) // último día del mes
            };
        case 'last-month':
            return {
                from: fmt(new Date(year, month - 1, 1)),
                to: fmt(new Date(year, month, 0))
            };
        case '3-months':
            return {
                from: fmt(new Date(year, month - 2, 1)),
                to: fmt(now)
            };
        case '6-months':
            return {
                from: fmt(new Date(year, month - 5, 1)),
                to: fmt(now)
            };
        case '1-year':
            return {
                from: fmt(new Date(year - 1, month, day)),
                to: fmt(now)
            };
        case 'all':
        default:
            return { from: '', to: '' };
    }
}

// ============================================================
// Filtros
// ============================================================
function populateTagFilter(records) {
    const sel = document.getElementById('filter-tag');
    const tags = new Set();
    records.forEach(r => {
        const t = (r.tag || '').trim();
        if (t && t.toLowerCase() !== 'etiqueta') tags.add(t);
    });
    const sorted = Array.from(tags).sort();

    let html = '<option value="">Todas</option>';
    html += '<option value="NO_TAG">○ Sin etiqueta</option>';
    sorted.forEach(t => html += `<option value="${esc(t)}">${esc(t)}</option>`);
    sel.innerHTML = html;
}

function clearFilters() {
    document.getElementById('filter-search').value = '';
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-tag').value = '';
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';

    // Reset presets al estado "Todo"
    activePeriod = 'all';
    document.querySelectorAll('.date-preset').forEach(b => b.classList.remove('active'));
    document.querySelector('.date-preset[data-period="all"]').classList.add('active');
    document.getElementById('date-range-group').style.display = 'none';
    document.getElementById('date-apply-group').style.display = 'none';

    applyFiltersAndRender();
}

function filterByStatus(status) {
    document.getElementById('filter-status').value = status;
    applyFiltersAndRender();

    // Scroll a la tabla
    document.querySelector('.table-card').scrollIntoView({ behavior: 'smooth' });
}

function applyFiltersAndRender() {
    const q = (document.getElementById('filter-search').value || '').toLowerCase();
    const status = document.getElementById('filter-status').value;
    const tag = document.getElementById('filter-tag').value;
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo = document.getElementById('filter-date-to').value;

    filteredRecs = allRecords.filter(r => {
        const matchSearch =
            !q ||
            (r.concepto || '').toLowerCase().includes(q) ||
            (r.extra || '').toLowerCase().includes(q) ||
            (r.note || '').toLowerCase().includes(q) ||
            (r.tag || '').toLowerCase().includes(q);
        const matchStatus = !status || r.status === status;

        let matchTag = true;
        const currentTag = (r.tag || '').trim().toLowerCase();
        if (tag === 'NO_TAG') {
            matchTag = (!currentTag || currentTag === 'etiqueta');
        } else if (tag) {
            matchTag = (r.tag || '').trim() === tag;
        }

        let matchDate = true;
        if (dateFrom || dateTo) {
            const isoFecha = normalizeDateToISO(r.fecha || '');
            if (isoFecha) {
                if (dateFrom && isoFecha < dateFrom) matchDate = false;
                if (dateTo && isoFecha > dateTo) matchDate = false;
            }
        }

        return matchSearch && matchStatus && matchTag && matchDate;
    });

    renderKPIs(filteredRecs);
    renderDonut(filteredRecs);
    renderTags(filteredRecs);
    renderMonthlyChart(filteredRecs);
    renderTable(filteredRecs);

    removeSkeletons();
}

/**
 * Remueve las clases de skeleton una vez que los datos están listos.
 */
function removeSkeletons() {
    const skeletons = document.querySelectorAll('.skeleton');
    skeletons.forEach(el => {
        el.classList.remove('skeleton');
        // Si tenía un estilo de ancho fijo para el skeleton, lo limpiamos
        if (el.id === 'v-total') el.style.width = '';
    });
}

/**
 * Normaliza una fecha en diversos formatos a ISO yyyy-mm-dd.
 * Soporta: dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy, yyyy-mm-dd,
 *          y formatos tipo "08 Mar 2026" etc.
 */
function normalizeDateToISO(dateStr) {
    if (!dateStr) return null;
    const s = dateStr.trim();

    // Ya es ISO: yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);

    // dd/mm/yyyy o dd-mm-yyyy o dd.mm.yyyy
    const m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})/);
    if (m) {
        return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    }

    // dd/mm/yy (año de 2 dígitos)
    const m2 = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2})$/);
    if (m2) {
        const fullYear = parseInt(m2[3]) > 50 ? '19' + m2[3] : '20' + m2[3];
        return `${fullYear}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`;
    }

    // Intentar con Date.parse como fallback
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
        const yy = parsed.getFullYear();
        const mm = String(parsed.getMonth() + 1).padStart(2, '0');
        const dd = String(parsed.getDate()).padStart(2, '0');
        return `${yy}-${mm}-${dd}`;
    }

    return null;
}

// ============================================================
// KPIs
// ============================================================
function renderKPIs(records) {
    const counts = { VERDE: 0, AMARILLO: 0, ROJO: 0, NONE: 0, NO_TAG: 0 };
    records.forEach(r => {
        const k = r.status in counts ? r.status : 'NONE';
        counts[k]++;
        const t = (r.tag || '').trim().toLowerCase();
        if (!t || t === 'etiqueta') counts.NO_TAG++;
    });

    // Animación fluida de los números
    animateCounter('v-total', _currentKPIs.total, records.length, 1800);
    animateCounter('v-verde', _currentKPIs.verde, counts.VERDE, 1200);
    animateCounter('v-amarillo', _currentKPIs.amarillo, counts.AMARILLO, 1200);

    const vRojo = document.getElementById('v-rojo');
    if (vRojo) animateCounter('v-rojo', _currentKPIs.rojo, counts.ROJO, 1200);

    animateCounter('v-notag', _currentKPIs.notag, counts.NO_TAG, 1200);

    // Actualizar estado para la próxima animación de forma segura
    _currentKPIs.total = records.length;
    _currentKPIs.verde = counts.VERDE;
    _currentKPIs.amarillo = counts.AMARILLO;
    _currentKPIs.rojo = counts.ROJO;
    _currentKPIs.notag = counts.NO_TAG;
}

/**
 * Anima un contador numérico de forma fluida con suavizado.
 */
function animateCounter(id, start, end, duration = 1500, suffix = '') {
    const el = document.getElementById(id);
    if (!el) return;
    if (start === end) {
        el.textContent = end + suffix;
        return;
    }

    const range = end - start;
    let startTime = null;

    function step(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);

        // Easing function (easeOutQuart) para un movimiento premium
        const easedProgress = 1 - Math.pow(1 - progress, 4);

        el.textContent = Math.floor(start + range * easedProgress) + suffix;

        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            el.textContent = end + suffix;
        }
    }
    window.requestAnimationFrame(step);
}


// ============================================================
// Donut Chart (Canvas puro)
// ============================================================
function renderDonut(records) {
    const counts = { VERDE: 0, AMARILLO: 0, ROJO: 0, NONE: 0 };
    records.forEach(r => {
        const k = r.status in counts ? r.status : 'NONE';
        counts[k]++;
    });

    const total = records.length || 1;
    const audited = counts.VERDE + counts.AMARILLO + counts.ROJO;
    const pct = total > 0 ? Math.round((audited / total) * 100) : 0;

    animateCounter('donut-pct', _currentKPIs.pct, pct, 1500, '%');
    _currentKPIs.pct = pct; // Actualizar para el próximo render

    document.getElementById('chart-total-label').textContent = `${total} movimientos`;

    const canvas = document.getElementById('donut-chart');
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = 80;
    const ir = 54;

    const segments = [
        { key: 'VERDE', value: counts.VERDE, color: '#34d399' },
        { key: 'AMARILLO', value: counts.AMARILLO, color: '#fbbf24' },
        { key: 'ROJO', value: counts.ROJO, color: '#f87171' },
        { key: 'NONE', value: counts.NONE, color: 'rgba(255,255,255,0.1)' }
    ];

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (records.length === 0) {
        // Donut vacío
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = '#e2e8f0';
        ctx.fill();
    } else {
        // Dibujar todos los segmentos del anillo exterior
        let startAngle = -Math.PI / 2;
        const gap = 0.03;

        segments.forEach(seg => {
            if (seg.value === 0) return;
            const slice = (seg.value / total) * (Math.PI * 2);
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, startAngle + gap, startAngle + slice - gap);
            ctx.closePath();
            ctx.fillStyle = seg.color;
            ctx.fill();
            startAngle += slice;
        });
    }

    // Agujero central (limpiar o pintar del color del glassmorphism)
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx, cy, ir, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // Leyenda
    const legend = document.getElementById('chart-legend');
    legend.innerHTML = segments.map(seg => `
        <div class="legend-item">
            <div class="legend-left">
                <span class="legend-dot" style="background:${seg.color}"></span>
                ${STATUS_CONFIG[seg.key].label}
            </div>
            <div class="legend-right">${seg.value}</div>
        </div>
    `).join('');
}

// ============================================================
// Resumen por Etiqueta
// ============================================================
function parseCurrency(str) {
    if (!str) return 0;
    const clean = String(str).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val;
}

function renderTags(records) {
    const tagMap = {};
    records.forEach(r => {
        const t = r.tag || '(Sin etiqueta)';
        if (!tagMap[t]) tagMap[t] = { count: 0, sum: 0 };
        tagMap[t].count++;

        const d = parseCurrency(r.debito);
        const c = parseCurrency(r.credito);
        tagMap[t].sum += (c - d);
    });

    const sorted = Object.entries(tagMap).sort((a, b) => b[1].count - a[1].count);
    const container = document.getElementById('tags-list');

    if (sorted.length === 0) {
        container.innerHTML = '<div class="tags-empty">Sin etiquetas registradas.</div>';
        return;
    }

    container.innerHTML = sorted.map(([tag, data]) => `
        <div class="tag-item">
            <div class="tag-name">
                <span class="tag-pill">#</span>
                ${esc(tag)}
            </div>
            <div class="tag-meta" style="gap:24px;">
                <span class="tag-sum" style="font-weight:700; color: ${data.sum < 0 ? '#DC2626' : (data.sum > 0 ? '#059669' : 'var(--slate)')}; font-variant-numeric: tabular-nums;">
                    $ ${data.sum.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span class="tag-count" style="width: 55px; text-align: right;">${data.count} mov.</span>
            </div>
        </div>
    `).join('');
}

// ============================================================
// Gráfico de líneas mensual INTERACTIVO (Canvas + DOM)
// ============================================================
const TAG_COLORS = [
    '#2563eb', '#10b981', '#f59e0b', '#e11d48', '#8b5cf6',
    '#06b6d4', '#ea580c', '#ec4899', '#64748b', '#84cc16',
    '#6366f1', '#14b8a6', '#dc2626', '#a855f7'
];

// Estado persistente del gráfico
const _chartState = {
    hiddenTags: new Set(),
    dataByMonth: {},
    months: [],
    tags: [],
    colorMap: {},
    hitPoints: [],
    maxVal: 1
};

function renderMonthlyChart(records) {
    const canvas = document.getElementById('monthly-chart');
    if (!canvas) return;

    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('es-UY', { month: 'short', year: '2-digit' });
        months.push({ key, label });
    }

    const tagSet = new Set();
    const dataByMonth = {};
    months.forEach(m => dataByMonth[m.key] = {});

    records.forEach(r => {
        const iso = normalizeDateToISO(r.fecha || '');
        if (!iso) return;
        const mKey = iso.substring(0, 7);
        if (!dataByMonth[mKey]) return;

        const tag = (r.tag || '').trim();
        const label = (!tag || tag.toLowerCase() === 'etiqueta') ? 'Sin etiqueta' : tag;
        tagSet.add(label);

        if (!dataByMonth[mKey][label]) dataByMonth[mKey][label] = 0;
        const deb = parseCurrency(r.debito);
        const cred = parseCurrency(r.credito);
        dataByMonth[mKey][label] += Math.abs(deb) + Math.abs(cred);
    });

    const tags = Array.from(tagSet).sort();
    const colorMap = {};
    tags.forEach((t, i) => colorMap[t] = TAG_COLORS[i % TAG_COLORS.length]);

    _chartState.dataByMonth = dataByMonth;
    _chartState.months = months;
    _chartState.tags = tags;
    _chartState.colorMap = colorMap;
    _chartState.hiddenTags.forEach(t => { if (!tags.includes(t)) _chartState.hiddenTags.delete(t); });

    // Crear tooltip si no existe
    if (!document.getElementById('mx-chart-tooltip')) {
        const tip = document.createElement('div');
        tip.id = 'mx-chart-tooltip';
        tip.style.cssText = `
            position:absolute; display:none; z-index:1000;
            background:rgba(15,17,21,0.95); border:1px solid rgba(255,255,255,0.1);
            border-radius:10px; padding:10px 14px;
            box-shadow:0 8px 30px rgba(0,0,0,0.5);
            font-family:Inter,sans-serif; font-size:12px;
            pointer-events:none; min-width:140px;
        `;
        canvas.parentElement.style.position = 'relative';
        canvas.parentElement.appendChild(tip);
    }

    if (!canvas._mxClickBound) {
        canvas.addEventListener('click', _onChartClick);
        canvas._mxClickBound = true;
    }

    drawMonthlyLines();
    _renderMonthlyLegend();

    const totalInChart = records.filter(r => {
        const iso = normalizeDateToISO(r.fecha || '');
        return iso && !!dataByMonth[iso.substring(0, 7)];
    }).length;
    const lbl = document.getElementById('monthly-chart-label');
    if (lbl) lbl.textContent = `${totalInChart} movimientos · 12 meses`;
}

function drawMonthlyLines() {
    const canvas = document.getElementById('monthly-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { dataByMonth, months, tags, colorMap, hiddenTags } = _chartState;
    const visibleTags = tags.filter(t => !hiddenTags.has(t));

    let maxVal = 0;
    months.forEach(m => {
        visibleTags.forEach(t => {
            const v = dataByMonth[m.key][t] || 0;
            if (v > maxVal) maxVal = v;
        });
    });
    if (maxVal === 0) maxVal = 1;
    maxVal *= 1.1;
    _chartState.maxVal = maxVal;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.parentElement.clientWidth || 1200;
    const H = 350;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const padL = 70, padR = 20, padT = 25, padB = 50;
    const cW = W - padL - padR;
    const cH = H - padT - padB;
    const stepX = cW / (months.length - 1 || 1);

    const fmtVal = v => v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'k' : v.toFixed(0);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '11px Inter,sans-serif'; ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
        const y = padT + (cH / 5) * i;
        const val = maxVal - (maxVal / 5) * i;
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + cW, y); ctx.stroke();
        ctx.fillText(fmtVal(val), padL - 10, y + 4);
    }

    // X labels
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '11px Inter,sans-serif'; ctx.textAlign = 'center';
    months.forEach((m, i) => {
        const x = padL + i * stepX;
        ctx.fillText(m.label, x, padT + cH + 20);
        ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + cH); ctx.stroke();
        ctx.restore();
    });

    _chartState.hitPoints = [];

    visibleTags.forEach(tag => {
        const color = colorMap[tag];
        const pts = months.map((m, i) => ({
            x: padL + i * stepX,
            y: padT + cH - ((dataByMonth[m.key][tag] || 0) / maxVal) * cH,
            val: dataByMonth[m.key][tag] || 0,
            monthLabel: m.label
        }));

        // Area fill
        ctx.beginPath(); ctx.moveTo(pts[0].x, padT + cH);
        pts.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(pts[pts.length - 1].x, padT + cH); ctx.closePath();
        ctx.fillStyle = color + '15'; ctx.fill();

        // Line
        ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();

        // Dots
        pts.forEach(p => {
            if (p.val === 0) return;
            ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#1e2026'; ctx.fill();
            ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.stroke();

            _chartState.hitPoints.push({ x: p.x, y: p.y, tag, color, month: p.monthLabel, val: p.val });
        });
    });

    if (visibleTags.length === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '14px Inter,sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('Seleccione al menos una etiqueta', W / 2, H / 2);
    }
}

function _onChartClick(e) {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const sx = (e.clientX - rect.left) * (canvas.width / rect.width) / dpr;
    const sy = (e.clientY - rect.top) * (canvas.height / rect.height) / dpr;

    const tip = document.getElementById('mx-chart-tooltip');
    if (!tip) return;

    let nearest = null, minD = 16;
    _chartState.hitPoints.forEach(p => {
        const d = Math.sqrt((p.x - sx) ** 2 + (p.y - sy) ** 2);
        if (d < minD) { minD = d; nearest = p; }
    });

    if (nearest) {
        const fmtM = v => '$ ' + v.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        tip.innerHTML = `
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                <div style="width:10px;height:10px;border-radius:50%;background:${nearest.color};"></div>
                <b style="color:white;">${esc(nearest.tag)}</b>
            </div>
            <div style="color:rgba(255,255,255,0.6);font-size:11px;margin-bottom:2px;">${nearest.month}</div>
            <div style="font-size:16px;font-weight:800;color:white;">${fmtM(nearest.val)}</div>
        `;
        let left = nearest.x + 14, top = nearest.y - 40;
        if (left + 160 > canvas.parentElement.clientWidth) left = nearest.x - 170;
        if (top < 0) top = nearest.y + 14;
        tip.style.left = left + 'px'; tip.style.top = top + 'px'; tip.style.display = 'block';
    } else {
        tip.style.display = 'none';
    }
}

function _renderMonthlyLegend() {
    const el = document.getElementById('monthly-legend');
    if (!el) return;
    const { tags, colorMap, dataByMonth, months, hiddenTags } = _chartState;

    el.innerHTML = tags.map(t => {
        let total = 0;
        months.forEach(m => total += (dataByMonth[m.key][t] || 0));
        const off = hiddenTags.has(t);
        return `
            <div class="monthly-legend-item" data-tag="${esc(t)}" style="cursor:pointer;opacity:${off ? '0.35' : '1'};transition:opacity 0.2s;user-select:none;">
                <div class="monthly-legend-dot" style="background:${off ? 'rgba(255,255,255,0.2)' : colorMap[t]}"></div>
                ${esc(t)}
                <span style="color:${off ? 'rgba(255,255,255,0.4)' : 'white'};font-weight:700;margin-left:2px;">
                    $ ${total.toLocaleString('es-UY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
            </div>`;
    }).join('');

    el.querySelectorAll('.monthly-legend-item').forEach(item => {
        item.onclick = () => {
            const tag = item.dataset.tag;
            if (hiddenTags.has(tag)) hiddenTags.delete(tag); else hiddenTags.add(tag);
            const tt = document.getElementById('mx-chart-tooltip');
            if (tt) tt.style.display = 'none';
            drawMonthlyLines();
            _renderMonthlyLegend();
        };
    });
}

// ============================================================
// Tabla de movimientos
// ============================================================
function renderTable(records) {
    const sorted = [...records].sort((a, b) => {
        let vA = (a[sortField] || '').toString().toLowerCase();
        let vB = (b[sortField] || '').toString().toLowerCase();

        // Si ordenamos por fecha, normalizar a ISO para orden correcto
        if (sortField === 'fecha') {
            vA = normalizeDateToISO(vA) || vA;
            vB = normalizeDateToISO(vB) || vB;
        }

        if (sortDir === 'asc') return vA < vB ? -1 : vA > vB ? 1 : 0;
        else return vA > vB ? -1 : vA < vB ? 1 : 0;
    });

    const tbody = document.getElementById('movements-tbody');
    const empty = document.getElementById('table-empty');

    document.getElementById('table-count').textContent = `${sorted.length} registros`;

    if (sorted.length === 0) {
        tbody.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    const cfg = STATUS_CONFIG;

    tbody.innerHTML = sorted.map(r => {
        const statusKey = r.status in cfg ? r.status : 'NONE';
        const s = cfg[statusKey];
        const t = (r.tag || '').trim();
        const tagHTML = (!t || t.toLowerCase() === 'etiqueta')
            ? '<span style="color:rgba(255,255,255,0.3)">—</span>'
            : `<span style="background:rgba(16,185,129,0.15);color:#34d399;padding:2px 7px;border-radius:99px;font-size:10px;font-weight:700;">${esc(t)}</span>`;
        // Compatibilidad: registros antiguos tenían 'importe' del último campo (saldo)
        const debe = r.debito || '';
        const haber = r.credito || '';
        const saldo = r.saldo || r.importe || '';
        return `
            <tr data-hash="${esc(r._hash || '')}">
                <td>${esc(r.fecha || '—')}</td>
                <td class="td-concepto" title="${esc(r.concepto || '')}">
                    ${esc((r.concepto || '').substring(0, 45))}${(r.concepto || '').length > 45 ? '…' : ''}
                </td>
                <td class="td-importe" style="color:${debe ? '#DC2626' : '#ccc'}">${esc(debe || '—')}</td>
                <td class="td-importe" style="color:${haber ? '#059669' : '#ccc'}">${esc(haber || '—')}</td>
                <td class="td-importe" style="font-weight:600">${esc(saldo || '—')}</td>
                <td>${tagHTML}</td>
                <td class="td-note" title="${esc(r.note || '')}">${esc((r.note || '').substring(0, 40))}${(r.note || '').length > 40 ? '…' : ''}</td>
                <td>
                    <span class="status-badge status-${statusKey}">
                        ${s.icon} ${s.label}
                    </span>
                </td>
                <td class="td-user">${esc(r.user || '—')}</td>
                <td class="td-ts">${esc(r.ts || '—')}</td>
            </tr>
        `;
    }).join('');
}

// ============================================================
// Exportar CSV
// ============================================================
async function exportCSV() {
    const records = filteredRecs.length > 0 ? filteredRecs : allRecords;

    if (!records.length) {
        alert('No hay registros para exportar.');
        return;
    }

    const e = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const now = new Date();
    const fechaGen = now.toLocaleDateString('es-UY', { year: 'numeric', month: 'long', day: 'numeric' });
    const horaGen = now.toLocaleTimeString('es-UY');
    const config = await storageGet(KEYS.SETTINGS, {});
    const auditor = (config.user || 'N/D').toUpperCase();

    // Estadísticas
    const stats = { VERDE: 0, AMARILLO: 0, ROJO: 0, NONE: 0, total: records.length };
    records.forEach(r => { stats[r.status in stats ? r.status : 'NONE']++; });
    const auditados = stats.VERDE + stats.AMARILLO + stats.ROJO;
    const cobertura = stats.total > 0 ? Math.round((auditados / stats.total) * 100) : 0;
    const pct = (v) => stats.total > 0 ? Math.round(v / stats.total * 100) + '%' : '0%';

    const statusLabel = { VERDE: 'VALIDADO', AMARILLO: 'OBSERVADO', ROJO: 'RECHAZADO', NONE: 'SIN REVISAR' };
    const stColors = {
        VERDE: { bg: '#D1FAE5', fg: '#065F46' },
        AMARILLO: { bg: '#FEF3C7', fg: '#92400E' },
        ROJO: { bg: '#FFE4E6', fg: '#9F1239' },
        NONE: { bg: '#F1F5F9', fg: '#64748B' }
    };

    const sorted = [...records].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    const hashSrc = sorted.map(r => `${r.fecha}|${r.concepto}|${r.debito || r.importe || ''}|${r.credito || ''}|${r.status}`).join('||');
    let h = 0;
    for (let i = 0; i < hashSrc.length; i++) { h = ((h << 5) - h) + hashSrc.charCodeAt(i); h = h & h; }
    const hash = 'MX-' + Math.abs(h).toString(36).toUpperCase();

    const bf = 'font-family:Calibri,Arial,sans-serif;';
    const cb = `${bf} font-size:10pt; border:1px solid #D1D5DB; padding:6px 10px; vertical-align:middle;`;
    const mc = `${bf} font-size:10pt; color:#374151; border:none; padding:3px 10px;`;

    const isFiltered = filteredRecs.length > 0 && filteredRecs.length !== allRecords.length;
    const filterNote = isFiltered ? `<tr><td colspan="9" style="${mc} color:#B45309; font-weight:700;">&#9888; DATOS FILTRADOS: ${filteredRecs.length} de ${allRecords.length} movimientos totales</td></tr>` : '';

    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Dashboard</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
</head><body>
<table border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse; width:100%;">
<tr><td colspan="9" style="${bf} font-size:16pt; font-weight:700; color:#FFF; background:#EC7000; padding:16px 18px; border:none;">INFORME DE AUDITOR&#205;A BANCARIA</td></tr>
<tr><td colspan="9" style="${bf} font-size:9pt; color:#FDE68A; background:#EC7000; padding:0 18px 14px; border:none;">Dashboard Monexa Flow &middot; ${e(fechaGen)} &middot; ${e(horaGen)}</td></tr>
<tr><td colspan="9" style="height:4px; background:#004B8B; border:none;"></td></tr>
<tr><td colspan="9" style="height:12px; border:none;"></td></tr>
${filterNote}
<tr>
  <td colspan="2" style="${mc} font-weight:700;">Auditor:</td>
  <td colspan="2" style="${mc} font-weight:700; font-size:11pt;">${e(auditor)}</td>
  <td style="border:none;"></td>
  <td colspan="2" style="${mc} font-weight:700;">Cobertura:</td>
  <td colspan="2" style="${mc} font-weight:700; font-size:12pt; color:#059669;">${cobertura}%</td>
</tr>
<tr><td colspan="9" style="height:16px; border:none;"></td></tr>

<tr><td colspan="9" style="${bf} font-size:11pt; font-weight:700; color:#1E293B; background:#F1F5F9; border:1px solid #D1D5DB; padding:10px 14px;">&#128202; RESUMEN</td></tr>
<tr>
  <td colspan="2" style="${cb} font-weight:700; background:#F8FAFC;">Estado</td>
  <td style="${cb} font-weight:700; background:#F8FAFC; text-align:center;">Cant.</td>
  <td style="${cb} font-weight:700; background:#F8FAFC; text-align:center;">%</td>
  <td colspan="5" style="border:none;"></td>
</tr>`;

    ['VERDE', 'AMARILLO', 'ROJO', 'NONE'].forEach(k => {
        const sc = stColors[k];
        const icons = { VERDE: '&#10003;', AMARILLO: '!', ROJO: '&times;', NONE: '&#9675;' };
        const names = { VERDE: 'Validados', AMARILLO: 'Observados', ROJO: 'Rechazados', NONE: 'Sin revisar' };
        html += `<tr>
  <td colspan="2" style="${cb}">${icons[k]} ${names[k]}</td>
  <td style="${cb} text-align:center; background:${sc.bg}; color:${sc.fg}; font-weight:700;">${stats[k]}</td>
  <td style="${cb} text-align:center;">${pct(stats[k])}</td>
  <td colspan="5" style="border:none;"></td>
</tr>`;
    });

    html += `<tr><td colspan="9" style="height:16px; border:none;"></td></tr>
<tr><td colspan="9" style="${bf} font-size:11pt; font-weight:700; color:#1E293B; background:#F1F5F9; border:1px solid #D1D5DB; padding:10px 14px;">&#128203; DETALLE DE MOVIMIENTOS</td></tr>
<tr>
  <td style="${cb} background:#EC7000; color:#FFF; font-weight:700; text-align:center; width:40px;">N&#176;</td>
  <td style="${cb} background:#EC7000; color:#FFF; font-weight:700; width:90px;">FECHA</td>
  <td style="${cb} background:#EC7000; color:#FFF; font-weight:700; width:220px;">CONCEPTO</td>
  <td style="${cb} background:#EC7000; color:#FFF; font-weight:700; text-align:right; width:90px;">DEBE</td>
  <td style="${cb} background:#EC7000; color:#FFF; font-weight:700; text-align:right; width:90px;">HABER</td>
  <td style="${cb} background:#EC7000; color:#FFF; font-weight:700; text-align:right; width:100px;">SALDO</td>
  <td style="${cb} background:#EC7000; color:#FFF; font-weight:700; width:90px;">ETIQUETA</td>
  <td style="${cb} background:#EC7000; color:#FFF; font-weight:700; width:150px;">NOTA</td>
  <td style="${cb} background:#EC7000; color:#FFF; font-weight:700; text-align:center; width:100px;">ESTADO</td>
  <td style="${cb} background:#EC7000; color:#FFF; font-weight:700; width:70px;">AUDITOR</td>
  <td style="${cb} background:#EC7000; color:#FFF; font-weight:700; width:130px;">FECHA AUD.</td>
</tr>`;

    sorted.forEach((r, i) => {
        const z = i % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
        const sk = r.status in stColors ? r.status : 'NONE';
        const sc = stColors[sk];
        const deb = r.debito || '';
        const hab = r.credito || '';
        const sal = r.saldo || r.importe || '';
        html += `<tr>
  <td style="${cb} background:${z}; text-align:center; color:#9CA3AF;">${i + 1}</td>
  <td style="${cb} background:${z};">${e(r.fecha || '')}</td>
  <td style="${cb} background:${z};">${e(r.concepto || '')}</td>
  <td style="${cb} background:${z}; text-align:right; font-family:Consolas,monospace; color:${deb ? '#DC2626' : '#D1D5DB'};">${e(deb || '\u2014')}</td>
  <td style="${cb} background:${z}; text-align:right; font-family:Consolas,monospace; color:${hab ? '#059669' : '#D1D5DB'};">${e(hab || '\u2014')}</td>
  <td style="${cb} background:${z}; text-align:right; font-family:Consolas,monospace; font-weight:600;">${e(sal || '\u2014')}</td>
  <td style="${cb} background:${z};"><b style="background:#D1FAE5; color:#059669; padding:2px 6px;">${e(r.tag || '')}</b></td>
  <td style="${cb} background:${z}; color:#6B7280; font-style:italic;">${e(r.note || '')}</td>
  <td style="${cb} background:${sc.bg}; color:${sc.fg}; font-weight:700; text-align:center;">${e(statusLabel[sk] || '')}</td>
  <td style="${cb} background:${z};">${e(r.user || '')}</td>
  <td style="${cb} background:${z}; color:#9CA3AF; font-size:9pt;">${e(r.ts || '')}</td>
</tr>`;
    });

    html += `
<tr><td colspan="11" style="height:18px; border:none;"></td></tr>
<tr><td colspan="11" style="height:3px; background:#EC7000; border:none;"></td></tr>
<tr><td colspan="11" style="height:8px; border:none;"></td></tr>
<tr>
  <td colspan="5" style="${bf} font-size:8pt; color:#9CA3AF; border:none;">Hash: ${e(hash)}</td>
  <td colspan="6" style="${bf} font-size:8pt; color:#9CA3AF; border:none; text-align:right;">Monexa Flow &mdash; Dashboard de Auditor&#237;a</td>
</tr>
<tr><td colspan="11" style="${bf} font-size:7pt; color:#9CA3AF; border:none; padding:2px 10px;">Generado autom&#225;ticamente. Modificaciones manuales invalidan el hash.</td></tr>
</table></body></html>`;

    const fechaFile = now.toISOString().slice(0, 10);
    const filename = `Dashboard_${auditor.replace(/\s+/g, '_')}_${fechaFile}.xls`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ============================================================
// Utilidad: escape HTML
// ============================================================
function esc(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ============================================================
// Exportar JSON
// ============================================================
function exportJSON() {
    const records = filteredRecs.length > 0 ? filteredRecs : allRecords;

    if (!records.length) {
        alert('No hay registros para exportar.');
        return;
    }

    const now = new Date();
    const fechaFile = now.toISOString().replace(/[:.]/g, '-');
    const filename = `MonexaFlow_Backup_${fechaFile}.json`;

    const data = JSON.stringify(records, null, 2);

    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ============================================================
// Exportar CSV Datos Crudos (Fiel a la data interna)
// ============================================================
async function exportRawCSV() {
    const records = filteredRecs.length > 0 ? filteredRecs : allRecords;

    if (!records.length) {
        alert('No hay registros para exportar.');
        return;
    }

    // Cabeceras (UTF-8 con BOM para Excel)
    const headers = [
        "Fecha", "Concepto", "Debito", "Credito", 
        "Saldo", "Etiqueta", "Nota", "Estado", "Auditor", "Timestamp"
    ];

    const csvContent = records.map(r => {
        return [
            r.fecha || '',
            r.concepto || '',
            r.debito || '',
            r.credito || '',
            r.saldo || r.importe || '',
            r.tag || '',
            r.note || '',
            r.status || 'NONE',
            r.user || '',
            r.ts || ''
        ].map(val => {
            // Escapar comillas dobles y envolver en comillas
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        }).join(';');
    });

    const csvBody = [headers.join(';'), ...csvContent].join('\n');
    const bom = '\uFEFF'; // Para que Excel detecte UTF-8
    const blob = new Blob([bom + csvBody], { type: 'text/csv;charset=utf-8;' });
    
    const now = new Date();
    const config = await storageGet(KEYS.SETTINGS, {});
    const auditor = (config.user || 'N/D').replace(/\s+/g, '_');
    const filename = `Monexa_Datos_Crudos_${auditor}_${now.toISOString().slice(0, 10)}.csv`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ============================================================
// Notificaciones
// ============================================================
let notificationsEnabled = false;
function toggleNotifications(e) {
    const btn = e.currentTarget;
    notificationsEnabled = !notificationsEnabled;

    if (notificationsEnabled) {
        btn.style.color = '#f59e0b';
        btn.title = "Desactivar Notificaciones";
        alert("Notificaciones activadas. Recibirás alertas sobre nuevos cambios en la revisión.");
    } else {
        btn.style.color = '';
        btn.title = "Activar Notificaciones";
        alert("Notificaciones desactivadas.");
    }
}

// ============================================================
// Panel de Logs (Registro de Actividad)
// ============================================================
let allLogs = [];

async function loadLogs() {
    allLogs = await storageGet(KEYS.LOGS, []);
    // Mostrar los más recientes primero
    allLogs.reverse();
    renderLogs();

    // Toggle colapsable
    document.getElementById('logs-toggle').addEventListener('click', (e) => {
        // No colapsar si clickearon en un input/select
        if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT' || e.target.tagName === 'OPTION') return;
        const body = document.getElementById('logs-body');
        const chevron = document.getElementById('logs-chevron');
        const isOpen = body.style.display !== 'none';
        body.style.display = isOpen ? 'none' : 'block';
        chevron.textContent = isOpen ? '▼' : '▲';
    });
}


function renderLogs() {
    const levelEl = document.getElementById('logs-level-filter');
    const searchEl = document.getElementById('logs-search');

    const levelFilter = levelEl ? levelEl.value : '';
    const searchQ = searchEl ? (searchEl.value || '').toLowerCase() : '';

    const filtered = allLogs.filter(log => {
        const matchLevel = !levelFilter || log.level === levelFilter;
        const matchSearch = !searchQ ||
            (log.msg || '').toLowerCase().includes(searchQ) ||
            (log.action || '').toLowerCase().includes(searchQ);
        return matchLevel && matchSearch;
    });

    document.getElementById('logs-count').textContent = filtered.length;

    const tbody = document.getElementById('logs-tbody');
    const empty = document.getElementById('logs-empty');

    if (filtered.length === 0) {
        tbody.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';

    const levelColors = {
        INFO: { bg: '#DBEAFE', color: '#1D4ED8' },
        WARN: { bg: '#FEF3C7', color: '#D97706' },
        ERROR: { bg: '#FEE2E2', color: '#DC2626' }
    };

    tbody.innerHTML = filtered.map(log => {
        const lc = levelColors[log.level] || levelColors.INFO;
        const ts = log.timestamp
            ? new Date(log.timestamp).toLocaleString('es-UY', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : '—';
        return `
            <tr>
                <td style="font-family:monospace;font-size:11px;color:#6B7280;">${esc(ts)}</td>
                <td><span style="background:${lc.bg};color:${lc.color};padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;">${esc(log.level)}</span></td>
                <td style="font-size:12px;color:#6B7280;">${esc(log.action || '—')}</td>
                <td style="font-size:12px;">${esc(log.msg || '')}</td>
                <td style="font-size:10px;color:#9CA3AF;text-align:center;">${esc(log.version || '')}</td>
            </tr>`;
    }).join('');
}
async function purgeAudit() {
    if (confirm("¿Desea eliminar TODAS las etiquetas, notas y reglas de auditoría? Esta acción no afectará a los usuarios registrados ni la configuración del sistema.")) {
        try {
            // Borrar transacciones (local)
            await chrome.storage.local.set({ [KEYS.TRANSACTIONS]: { items: {} } });

            // Borrar reglas (sync)
            await chrome.storage.sync.set({ [KEYS.RULES]: [] });

            // Recargar para reflejar cambios
            document.body.classList.add('fade-out'); // opcional
            setTimeout(() => window.location.reload(), 300);
        } catch (e) {
            console.warn("Error purging audit data:", e);
        }
    }
}
// ============================================================
// Modal de Detalles Extra
// ============================================================
function showExtraDetails(rawExtra, hash) {
    console.log("[Monexa] Abriendo detalles extra:", rawExtra, hash);
    
    // Guardar el hash abierto globalmente por si hay updates in-vivo
    window._mxOpenExtraHash = hash;

    const modal = document.getElementById('modal-extra');
    const body = document.getElementById('modal-extra-body');
    if (!modal || !body) {
        console.error("[Monexa] No se encontró el modal o el cuerpo en el DOM.");
        return;
    }

    modal.style.display = 'flex';
    body.innerHTML = '';

    if (!rawExtra || rawExtra === '—' || rawExtra === 'null' || rawExtra === 'undefined') {
        body.innerHTML = '<p style="color:rgba(255,255,255,0.4); text-align:center; padding:20px;">No hay información adicional capturada para este movimiento.</p>';
        return;
    }

    // Ya no hay "Extra Protegido", el scanner (V3) extrae el texto puro
    if (rawExtra.startsWith("COMPROBANTE:")) {
        const cleanText = rawExtra.replace("COMPROBANTE:", "").trim();
        body.innerHTML = `<div class="extra-fallback-text">${esc(cleanText)}</div>`;
        return;
    }

    // Formatear la info extra (separada por | o ||)
    const parts = rawExtra.split(/\|\||\|/);
    let html = '<div class="extra-details-container">';

    // Mapeo amigable de etiquetas técnicas a nombres reales si fuera necesario
    const labelMap = {
        "Número de operación": "Operación",
        "Ref Bevsa": "Referencia Bevsa",
        "Banco": "Banco Ordenante"
    };

    parts.forEach(p => {
        const trimP = p.trim();
        if (!trimP) return;

        if (trimP.includes(':')) {
            const [label, ...valParts] = trimP.split(':');
            const cleanLabel = label.trim();
            const displayLabel = labelMap[cleanLabel] || cleanLabel;
            const value = valParts.join(':').trim();

            html += `
                <div class="extra-detail-row">
                    <div class="extra-label">${esc(displayLabel)}</div>
                    <div class="extra-value">${esc(value)}</div>
                </div>
            `;
        } else {
            html += `
                <div class="extra-detail-row">
                    <div class="extra-value">${esc(trimP)}</div>
                </div>
            `;
        }
    });

    html += '</div>';
    body.innerHTML = html;
}






