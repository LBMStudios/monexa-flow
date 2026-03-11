/**
 * 05_filesystem.js — MONEXA FLOW
 * Motor de archivos — exportación Excel (HTML styled) e importación CSV.
 * Maneja la exportación e importación de auditorías y reglas.
 * Depende de: 00_config.js (KEYS, VERSION), 01_db.js (DB_Engine),
 *             02_logger.js (Logger), 04_data.js (DataCore)
 */

'use strict';

const FileSystem = {
    /**
     * Mapa de estados para exportación legible.
     */
    _statusLabel: {
        'VERDE': 'VALIDADO',
        'AMARILLO': 'OBSERVADO',
        'ROJO': 'RECHAZADO',
        'NONE': 'SIN REVISAR'
    },

    /**
     * Escapa caracteres HTML para celdas del reporte.
     */
    _esc(s) {
        return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    /**
     * Genera un hash simple de integridad para el reporte.
     */
    _reportHash(str) {
        let h = 0;
        for (let i = 0; i < str.length; i++) {
            h = ((h << 5) - h) + str.charCodeAt(i);
            h = h & h;
        }
        return 'MX-' + Math.abs(h).toString(36).toUpperCase();
    },

    /**
     * Exporta todas las transacciones auditadas como informe Excel formateado.
     * Genera un HTML con estilos inline que Excel interpreta nativamente (.xls).
     */
    async exportAuditory() {
        const storage = await DB_Engine.fetch(KEYS.TRANSACTIONS, { items: {} });
        const config  = await DB_Engine.fetch(KEYS.SETTINGS, {});
        const records = Object.values(storage.items || {});

        if (!records.length) {
            alert("No hay registros para exportar.");
            return;
        }

        const now      = new Date();
        const fechaGen = now.toLocaleDateString('es-UY', { year:'numeric', month:'long', day:'numeric' });
        const horaGen  = now.toLocaleTimeString('es-UY');
        const auditor  = (config.user || 'N/D').toUpperCase();
        const e        = this._esc;

        // --- Estadísticas ---
        const stats = { VERDE: 0, AMARILLO: 0, ROJO: 0, NONE: 0, total: records.length };
        records.forEach(r => { stats[r.status in stats ? r.status : 'NONE']++; });
        const auditados = stats.VERDE + stats.AMARILLO + stats.ROJO;
        const cobertura = stats.total > 0 ? Math.round((auditados / stats.total) * 100) : 0;
        const pct = (v) => stats.total > 0 ? Math.round(v / stats.total * 100) + '%' : '0%';

        // --- Ordenar por fecha desc ---
        const sorted = [...records].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

        // --- Hash ---
        const hashSrc = sorted.map(r => `${r.fecha}|${r.concepto}|${r.debito||r.importe||''}|${r.credito||''}|${r.status}`).join('||');
        const hash = this._reportHash(hashSrc);

        // --- Estilos reutilizables ---
        const baseFont = 'font-family:Calibri,Arial,sans-serif;';
        const cellBase = `${baseFont} font-size:10pt; border:1px solid #D1D5DB; padding:6px 10px; vertical-align:middle;`;
        const metaCell = `${baseFont} font-size:10pt; color:#374151; border:none; padding:3px 10px;`;

        // Colores por estado para celdas
        const stColors = {
            VERDE:    { bg: '#D1FAE5', fg: '#065F46' },
            AMARILLO: { bg: '#FEF3C7', fg: '#92400E' },
            ROJO:     { bg: '#FFE4E6', fg: '#9F1239' },
            NONE:     { bg: '#F1F5F9', fg: '#64748B' }
        };

        // ==========================================
        // CONSTRUIR DOCUMENTO HTML/EXCEL
        // ==========================================
        let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:x="urn:schemas-microsoft-com:office:excel"
xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<!--[if gte mso 9]><xml>
<x:ExcelWorkbook>
  <x:ExcelWorksheets>
    <x:ExcelWorksheet>
      <x:Name>Auditor&#237;a</x:Name>
      <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
    </x:ExcelWorksheet>
  </x:ExcelWorksheets>
</x:ExcelWorkbook>
</xml><![endif]-->
</head>
<body>
<table border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse; width:100%;">

<!-- ========== HEADER ========== -->
<tr>
  <td colspan="9" style="${baseFont} font-size:16pt; font-weight:700; color:#FFFFFF; background:#EC7000; padding:16px 18px; border:none;">
    INFORME DE AUDITOR&#205;A BANCARIA
  </td>
</tr>
<tr>
  <td colspan="9" style="${baseFont} font-size:9pt; color:#FDE68A; background:#EC7000; padding:0 18px 14px; border:none;">
    Sistema Monexa Flow v${e(VERSION)} &middot; ${e(fechaGen)} &middot; ${e(horaGen)}
  </td>
</tr>
<tr><td colspan="9" style="height:4px; background:#004B8B; border:none;"></td></tr>

<!-- ========== METADATA ========== -->
<tr><td colspan="9" style="height:12px; border:none;"></td></tr>
<tr>
  <td colspan="2" style="${metaCell} font-weight:700;">Auditor responsable:</td>
  <td colspan="2" style="${metaCell} font-weight:700; font-size:11pt;">${e(auditor)}</td>
  <td style="width:20px; border:none;"></td>
  <td colspan="2" style="${metaCell} font-weight:700;">Fecha de generaci&#243;n:</td>
  <td colspan="2" style="${metaCell}">${e(fechaGen)} - ${e(horaGen)}</td>
</tr>
<tr>
  <td colspan="2" style="${metaCell} font-weight:700;">Total de movimientos:</td>
  <td colspan="2" style="${metaCell} font-weight:700; font-size:12pt; color:#1E293B;">${stats.total}</td>
  <td style="border:none;"></td>
  <td colspan="2" style="${metaCell} font-weight:700;">Cobertura de auditor&#237;a:</td>
  <td colspan="2" style="${metaCell} font-weight:700; font-size:12pt; color:#059669;">${cobertura}% <span style="font-size:9pt; color:#6B7280; font-weight:400;">(${auditados} de ${stats.total})</span></td>
</tr>
<tr><td colspan="9" style="height:16px; border:none;"></td></tr>

<!-- ========== RESUMEN ========== -->
<tr>
  <td colspan="9" style="${baseFont} font-size:11pt; font-weight:700; color:#1E293B; background:#F1F5F9; border:1px solid #D1D5DB; padding:10px 14px;">
    &#128202; RESUMEN DE AUDITOR&#205;A
  </td>
</tr>
<tr>
  <td colspan="2" style="${cellBase} font-weight:700; background:#F8FAFC;">Estado</td>
  <td style="${cellBase} font-weight:700; background:#F8FAFC; text-align:center;">Cantidad</td>
  <td style="${cellBase} font-weight:700; background:#F8FAFC; text-align:center;">Porcentaje</td>
  <td colspan="5" style="border:none;"></td>
</tr>
<tr>
  <td colspan="2" style="${cellBase}">&#10003; Validados</td>
  <td style="${cellBase} text-align:center; background:${stColors.VERDE.bg}; color:${stColors.VERDE.fg}; font-weight:700;">${stats.VERDE}</td>
  <td style="${cellBase} text-align:center;">${pct(stats.VERDE)}</td>
  <td colspan="5" style="border:none;"></td>
</tr>
<tr>
  <td colspan="2" style="${cellBase}">! Observados</td>
  <td style="${cellBase} text-align:center; background:${stColors.AMARILLO.bg}; color:${stColors.AMARILLO.fg}; font-weight:700;">${stats.AMARILLO}</td>
  <td style="${cellBase} text-align:center;">${pct(stats.AMARILLO)}</td>
  <td colspan="5" style="border:none;"></td>
</tr>
<tr>
  <td colspan="2" style="${cellBase}">&times; Rechazados</td>
  <td style="${cellBase} text-align:center; background:${stColors.ROJO.bg}; color:${stColors.ROJO.fg}; font-weight:700;">${stats.ROJO}</td>
  <td style="${cellBase} text-align:center;">${pct(stats.ROJO)}</td>
  <td colspan="5" style="border:none;"></td>
</tr>
<tr>
  <td colspan="2" style="${cellBase}">&#9675; Sin revisar</td>
  <td style="${cellBase} text-align:center; background:${stColors.NONE.bg}; color:${stColors.NONE.fg}; font-weight:700;">${stats.NONE}</td>
  <td style="${cellBase} text-align:center;">${pct(stats.NONE)}</td>
  <td colspan="5" style="border:none;"></td>
</tr>
<tr><td colspan="9" style="height:16px; border:none;"></td></tr>

<!-- ========== DETALLE ========== -->
<tr>
  <td colspan="9" style="${baseFont} font-size:11pt; font-weight:700; color:#1E293B; background:#F1F5F9; border:1px solid #D1D5DB; padding:10px 14px;">
    &#128203; DETALLE DE MOVIMIENTOS
  </td>
</tr>
<tr>
  <td style="${cellBase} background:#EC7000; color:#FFF; font-weight:700; text-align:center; width:40px;">N&#176;</td>
  <td style="${cellBase} background:#EC7000; color:#FFF; font-weight:700; width:90px;">FECHA</td>
  <td style="${cellBase} background:#EC7000; color:#FFF; font-weight:700; width:260px;">CONCEPTO</td>
  <td style="${cellBase} background:#EC7000; color:#FFF; font-weight:700; text-align:right; width:90px;">DEBE</td>
  <td style="${cellBase} background:#EC7000; color:#FFF; font-weight:700; text-align:right; width:90px;">HABER</td>
  <td style="${cellBase} background:#EC7000; color:#FFF; font-weight:700; text-align:right; width:100px;">SALDO</td>
  <td style="${cellBase} background:#EC7000; color:#FFF; font-weight:700; width:90px;">ETIQUETA</td>
  <td style="${cellBase} background:#EC7000; color:#FFF; font-weight:700; width:150px;">NOTA</td>
  <td style="${cellBase} background:#EC7000; color:#FFF; font-weight:700; text-align:center; width:100px;">ESTADO</td>
  <td style="${cellBase} background:#EC7000; color:#FFF; font-weight:700; width:70px;">AUDITOR</td>
  <td style="${cellBase} background:#EC7000; color:#FFF; font-weight:700; width:130px;">FECHA AUD.</td>
</tr>`;

        // --- Filas de datos ---
        sorted.forEach((r, i) => {
            const zebra = i % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
            const stKey = r.status in stColors ? r.status : 'NONE';
            const sc    = stColors[stKey];
            const label = this._statusLabel[r.status] || r.status || '';
            // Compatibilidad: registros antiguos pueden tener 'importe' en vez de debe/haber
            const debe  = r.debito  || '';
            const haber = r.credito || '';
            const saldo = r.saldo   || r.importe || '';

            html += `
<tr>
  <td style="${cellBase} background:${zebra}; text-align:center; color:#9CA3AF;">${i + 1}</td>
  <td style="${cellBase} background:${zebra};">${e(r.fecha || '')}</td>
  <td style="${cellBase} background:${zebra};">${e(r.concepto || '')}</td>
  <td style="${cellBase} background:${zebra}; text-align:right; font-family:Consolas,monospace; color:${debe ? '#DC2626' : '#D1D5DB'};">${e(debe || '—')}</td>
  <td style="${cellBase} background:${zebra}; text-align:right; font-family:Consolas,monospace; color:${haber ? '#059669' : '#D1D5DB'};">${e(haber || '—')}</td>
  <td style="${cellBase} background:${zebra}; text-align:right; font-family:Consolas,monospace; font-weight:600;">${e(saldo || '—')}</td>
  <td style="${cellBase} background:${zebra};"><b style="background:#D1FAE5; color:#059669; padding:2px 6px;">${e(r.tag || '')}</b></td>
  <td style="${cellBase} background:${zebra}; color:#6B7280; font-style:italic;">${e(r.note || '')}</td>
  <td style="${cellBase} background:${sc.bg}; color:${sc.fg}; font-weight:700; text-align:center;">${e(label)}</td>
  <td style="${cellBase} background:${zebra};">${e(r.user || '')}</td>
  <td style="${cellBase} background:${zebra}; color:#9CA3AF; font-size:9pt;">${e(r.ts || '')}</td>
</tr>`;
        });

        // --- PIE ---
        html += `
<tr><td colspan="11" style="height:18px; border:none;"></td></tr>
<tr><td colspan="11" style="height:3px; background:#EC7000; border:none;"></td></tr>
<tr><td colspan="11" style="height:8px; border:none;"></td></tr>
<tr>
  <td colspan="5" style="${baseFont} font-size:8pt; color:#9CA3AF; border:none; padding:2px 10px;">Hash de integridad: ${e(hash)}</td>
  <td colspan="6" style="${baseFont} font-size:8pt; color:#9CA3AF; border:none; padding:2px 10px; text-align:right;">Monexa Flow v${e(VERSION)} &mdash; Sistema de Auditor&#237;a Bancaria</td>
</tr>
<tr>
  <td colspan="11" style="${baseFont} font-size:7pt; color:#9CA3AF; border:none; padding:2px 10px;">
    Este documento fue generado autom&#225;ticamente. Cualquier modificaci&#243;n manual invalida el hash de integridad.
  </td>
</tr>

</table>
</body>
</html>`;

        // --- Descargar ---
        const fechaFile = now.toISOString().slice(0, 10);
        const filename  = `Auditoria_${auditor.replace(/\s+/g, '_')}_${fechaFile}.xls`;

        this.triggerDownload(html, filename, 'application/vnd.ms-excel');
        await Logger.info(`Exportación Excel completada. Hash: ${hash}`);
    },

    /**
     * Exporta todas las reglas de auto-etiquetado como CSV.
     */
    async exportRules() {
        const rules = await DB_Engine.fetch(KEYS.RULES, []);
        if (!rules.length) {
            alert("No hay reglas para exportar.");
            return;
        }

        let csv = "\uFEFF";
        csv += "PATTERN;LABEL;COLOR;IMPORTE;NOTE\n";

        rules.forEach(r => {
            const pattern = (r.pattern || "").toString().replace(/"/g, '""');
            const label   = (r.label   || "").toString().replace(/"/g, '""');
            const color   = (r.color   || 'verde').toString().replace(/"/g, '""');
            const importe = (r.importe || "").toString().replace(/"/g, '""');
            const note    = (r.note    || "").toString().replace(/"/g, '""');
            csv += `"${pattern}";"${label}";"${color}";"${importe}";"${note}"\n`;
        });

        this.triggerDownload(csv, `Monexa_Rules_${Date.now()}.csv`);
        await Logger.info("Exportación de reglas completada.");
    },

    /**
     * Importa un CSV externo.
     * @param {File} file  - Archivo seleccionado por el usuario.
     * @param {string} type - "NOTES" para transacciones, "RULES" para reglas.
     */
    async importExternalCSV(file, type = "NOTES") {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text  = e.target.result;
                const lines = text.split(/\r?\n/);

                const db = await DB_Engine.fetch(
                    type === "NOTES" ? KEYS.TRANSACTIONS : KEYS.RULES,
                    type === "NOTES" ? { items: {} } : []
                );

                let count = 0;

                lines.slice(1).forEach(line => {
                    if (!line.trim()) return;

                    const cols = line.split(/[;,]/).map(c => c.replace(/^"|"$/g, '').trim());

                    if (type === "NOTES" && cols.length >= 3) {
                        const hash = DataCore.createFingerprint(cols[1], cols[2], cols[0]);
                        db.items[hash] = {
                            fecha:    cols[0],
                            concepto: cols[1],
                            importe:  cols[2],
                            tag:      cols[3] || "",
                            note:     cols[4] || "",
                            status:   cols[5] || "VERDE",
                            user:     "Import",
                            ts:       new Date().toLocaleString()
                        };
                        count++;
                    } else if (type === "RULES" && cols.length >= 2) {
                        const rule = { pattern: cols[0], label: cols[1], color: cols[2] || 'verde' };
                        if (cols[3]) rule.importe = cols[3];
                        if (cols[4]) rule.note = cols[4];
                        db.push(rule);
                        count++;
                    }
                });

                await DB_Engine.commit(
                    type === "NOTES" ? KEYS.TRANSACTIONS : KEYS.RULES,
                    db
                );

                alert(`Importación finalizada: ${count} registros procesados.`);
                window.location.reload();
            } catch (err) {
                console.error("Import CSV error:", err);
                await Logger.error("Import CSV failure: " + err.message);
                alert("Ocurrió un error durante la importación.");
            }
        };

        reader.readAsText(file);
    },

    /**
     * Dispara la descarga de un archivo en el navegador.
     * @param {string} content  - Contenido del archivo.
     * @param {string} filename - Nombre del archivo.
     * @param {string} [mimeType] - Tipo MIME (default: text/csv).
     */
    triggerDownload(content, filename, mimeType = 'text/csv;charset=utf-8;') {
        const blob = new Blob([content], { type: mimeType });
        const url  = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};
