/**
 * Monexa Flow — Presentación Ejecutiva para Itaú Uruguay
 * Generado con PptxGenJS
 */
const pptxgen = require("pptxgenjs");
const path = require("path");

// ── Paths de imágenes reales del producto ─────────────────────────────────────
const BRAIN = "C:\\Users\\Javier\\.gemini\\antigravity\\brain\\3f217c62-f128-4a41-98a8-bf0e130b90f9";
const ROOT  = "C:\\Users\\Javier\\Desktop\\chromelectureitau";

const IMG = {
  hero:     path.join(BRAIN, "landing_page_hero_1773518444776.png"),
  features: path.join(BRAIN, "landing_page_product_features_detail_1773518476709.png"),
  security: path.join(BRAIN, "landing_page_features_1773518465050.png"),
  sidebar:  path.join(ROOT,  "cws_captura_1280x800.jpg"),
  promo:    path.join(ROOT,  "cws_promo_1400x560.jpg"),
  icon:     path.join(ROOT,  "icono_tienda_128x128.png"),
};

// ── Paleta de colores (Monexa + Itaú) ─────────────────────────────────────────
const C = {
  bg:         "0D1117",   // Negro carbon fondo
  bg2:        "111827",   // Fondo alternativo
  orange:     "EC7000",   // Naranja Itaú primario
  orangeL:    "F88C2B",   // Naranja claro
  white:      "FFFFFF",
  slate:      "94A3B8",
  darkCard:   "1E293B",
  green:      "10B981",
  accent:     "F97316",
};

// ── Helper: sombra standard ──────────────────────────────────────────────────
const mkShadow = () => ({ type: "outer", blur: 20, offset: 4, angle: 135, color: "000000", opacity: 0.35 });

// ── Nueva presentación ────────────────────────────────────────────────────────
let pres = new pptxgen();
pres.layout  = "LAYOUT_16x9";
pres.title   = "Monexa Flow — Propuesta de Integración Oficial Itaú Uruguay";
pres.author  = "LBM Studios";
pres.company = "LBM Studios";

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 1 — PORTADA
// ─────────────────────────────────────────────────────────────────────────────
{
  let s = pres.addSlide();
  s.background = { color: C.bg };

  // Franja naranja lateral izquierda
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.18, h: 5.625, fill: { color: C.orange } });

  // Bloque oscuro derecho con mockup real
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.3, y: 0, w: 4.7, h: 5.625,
    fill: { color: "0A0F1A" },
  });

  // Imagen real del producto (hero landing)
  s.addImage({
    path: IMG.hero,
    x: 5.4, y: 0.15, w: 4.5, h: 5.3,
    sizing: { type: "contain", w: 4.5, h: 5.3 },
  });

  // Icono
  s.addImage({ path: IMG.icon, x: 0.45, y: 0.45, w: 0.7, h: 0.7 });

  // Tag versión
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.45, y: 1.3, w: 2.1, h: 0.28,
    fill: { color: C.orange, transparency: 85 },
    rectRadius: 0.05,
  });
  s.addText("v1.3.8 — Itaú Direct Access Edition", {
    x: 0.45, y: 1.3, w: 2.1, h: 0.28,
    fontSize: 8, color: C.orange, bold: true, margin: 0,
    align: "center", valign: "middle",
  });

  // Título principal
  s.addText("MONEXA FLOW", {
    x: 0.35, y: 1.75, w: 4.7, h: 0.85,
    fontSize: 46, fontFace: "Arial Black", bold: true,
    color: C.white, charSpacing: 3, margin: 0,
  });

  // Subtítulo naranja
  s.addText("Integración Oficial Itaú Uruguay", {
    x: 0.35, y: 2.65, w: 4.7, h: 0.45,
    fontSize: 18, fontFace: "Calibri", bold: true,
    color: C.orange, margin: 0,
  });

  // Descripción
  s.addText("Transformando el Home Banking en una\nTerminal de Auditoría Contable Profesional.", {
    x: 0.35, y: 3.18, w: 4.7, h: 0.85,
    fontSize: 13, fontFace: "Calibri", color: C.slate, margin: 0,
  });

  // Empresa + fecha
  s.addText("LBM Studios  ·  Marzo 2026  ·  Propuesta Confidencial", {
    x: 0.35, y: 5.1, w: 4.7, h: 0.3,
    fontSize: 9, color: C.slate, italic: true, margin: 0,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 2 — EL PROBLEMA
// ─────────────────────────────────────────────────────────────────────────────
{
  let s = pres.addSlide();
  s.background = { color: C.bg };

  // Header naranja
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 1.1, fill: { color: C.orange } });
  s.addText("EL PROBLEMA QUE ENFRENTAN LOS USUARIOS DE ITAÚ", {
    x: 0.4, y: 0, w: 9.2, h: 1.1,
    fontSize: 20, fontFace: "Arial Black", bold: true, color: C.white,
    align: "left", valign: "middle", margin: 0,
  });

  // 3 tarjetas de pain points
  const pains = [
    { icon: "📋", title: "Exportación Manual", desc: "Los clientes copian movimientos a Excel\nmanualmente, generando errores y\nperdiendo horas de trabajo cada cierre." },
    { icon: "🔍", title: "Sin Trazabilidad", desc: "No existe forma de auditar en tiempo real\nsi el saldo calculado coincide con el\nsaldo oficial reportado por el banco." },
    { icon: "⚠️", title: "Conciliación a Ciegas", desc: "Contadores y empresas no tienen\nherramientas nativas integradas en\nItaú Link para validar transacciones." },
  ];

  pains.forEach((p, i) => {
    const x = 0.35 + i * 3.15;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.35, w: 2.95, h: 3.85,
      fill: { color: C.darkCard },
      shadow: mkShadow(),
    });
    // Borde superior naranja
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.35, w: 2.95, h: 0.07, fill: { color: C.orange } });

    s.addText(p.icon, { x: x + 0.1, y: 1.55, w: 2.75, h: 0.6, fontSize: 28, margin: 0 });
    s.addText(p.title, {
      x: x + 0.15, y: 2.2, w: 2.65, h: 0.45,
      fontSize: 14, fontFace: "Arial Black", bold: true, color: C.white, margin: 0,
    });
    s.addText(p.desc, {
      x: x + 0.15, y: 2.75, w: 2.65, h: 1.9,
      fontSize: 11, fontFace: "Calibri", color: C.slate,
      margin: 0,
    });
  });

  // Stat destacado
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.35, y: 5.05, w: 9.3, h: 0.42,
    fill: { color: C.orange, transparency: 90 },
  });
  s.addText("⏱  Estudios internos indican que el proceso de conciliación manual consume entre 2 y 4 horas por cierre mensual por cuenta.", {
    x: 0.5, y: 5.05, w: 9.0, h: 0.42,
    fontSize: 10, color: C.orange, italic: true, valign: "middle", margin: 0,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 3 — LA SOLUCIÓN
// ─────────────────────────────────────────────────────────────────────────────
{
  let s = pres.addSlide();
  s.background = { color: C.bg };

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 1.1, fill: { color: "111827" } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.07, h: 1.1, fill: { color: C.orange } });
  s.addText("LA SOLUCIÓN: MONEXA FLOW", {
    x: 0.25, y: 0, w: 9.5, h: 1.1,
    fontSize: 22, fontFace: "Arial Black", bold: true, color: C.white,
    align: "left", valign: "middle", margin: 0,
  });

  // Imagen real de la extensión en el banco
  s.addImage({
    path: IMG.sidebar,
    x: 5.2, y: 1.2, w: 4.6, h: 4.2,
    sizing: { type: "cover", w: 4.6, h: 4.2 },
    shadow: mkShadow(),
  });
  // Label sobre la imagen
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.2, y: 4.9, w: 4.6, h: 0.38,
    fill: { color: C.orange, transparency: 10 },
  });
  s.addText("📸  Captura real: Monexa Flow en Itaú Link Uruguay", {
    x: 5.2, y: 4.9, w: 4.6, h: 0.38,
    fontSize: 9, color: C.white, align: "center", valign: "middle", bold: true, margin: 0,
  });

  // Features lista
  const features = [
    { icon: "⚡", t: "Captura Orgánica en Tiempo Real",    d: "Lee el DOM del banco sin APIs ni credenciales." },
    { icon: "📊", t: "Dashboard Analytics Premium",        d: "Gráficos, filtros avanzados, KPIs en tiempo real." },
    { icon: "🏷️", t: "Motor de Reglas Inteligentes",       d: "Control total de prioridades con Dragon & Drop manual." },
    { icon: "🔒", t: "100% Local — Zero Cloud",            d: "Los datos NUNCA salen del dispositivo del usuario." },
    { icon: "📤", t: "Exportación Contable",               d: "Excel/CSV normalizado listo para software contable." },
  ];

  features.forEach((f, i) => {
    const y = 1.25 + i * 0.75;
    s.addText(f.icon, { x: 0.3, y, w: 0.5, h: 0.6, fontSize: 20, margin: 0, valign: "middle" });
    s.addText(f.t, { x: 0.9, y: y + 0.02, w: 4.1, h: 0.28, fontSize: 12, fontFace: "Arial Black", bold: true, color: C.white, margin: 0 });
    s.addText(f.d, { x: 0.9, y: y + 0.32, w: 4.1, h: 0.28, fontSize: 10, color: C.slate, margin: 0 });
    if (i < features.length - 1) {
      s.addShape(pres.shapes.LINE, { x: 0.3, y: y + 0.65, w: 4.7, h: 0, line: { color: "1E293B", width: 0.5 } });
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 4 — CONCEPTO: EL PLUGIN TRANSPARENTE
// ─────────────────────────────────────────────────────────────────────────────
{
  let s = pres.addSlide();
  s.background = { color: C.bg };

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 1.1, fill: { color: "111827" } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.07, h: 1.1, fill: { color: C.orange } });
  s.addText("CONCEPTO: EL PLUGIN TRANSPARENTE", {
    x: 0.25, y: 0, w: 9.5, h: 1.1,
    fontSize: 22, fontFace: "Arial Black", bold: true, color: C.white,
    align: "left", valign: "middle", margin: 0,
  });

  // Texto conceptual (basado en audio)
  const conceptText = [
    { text: "Monexa Flow no 'entra' en el banco. ", options: { bold: true, color: C.orange } },
    { text: "Actúa como una lámina transparente colocada sobre la interfaz de Itaú Link.\n\n", options: { color: C.white } },
    { text: "• Cero APIs / Cero Invasión: ", options: { bold: true, color: C.white } },
    { text: "No intercepta procesos internos del servidor bancario.\n", options: { color: C.slate } },
    { text: "• Visualización Extendida: ", options: { bold: true, color: C.white } },
    { text: "Simplemente añade columnas de auditoría (Tags, Notas) sobre la vista actual.\n", options: { color: C.slate } },
    { text: "• Privacidad por Diseño: ", options: { bold: true, color: C.white } },
    { text: "Solo lo que el usuario escribe (etiquetas) se guarda, y reside 100% en su navegador local.\n", options: { color: C.slate } }
  ];

  s.addText(conceptText, {
    x: 0.4, y: 1.5, w: 4.8, h: 3.5,
    fontSize: 13, fontFace: "Calibri", margin: 0,
  });

  // Imagen conceptual de la capa
  s.addImage({
    path: path.join(BRAIN, "monexa_transparent_layer_concept_1773519441314.png"),
    x: 5.4, y: 1.2, w: 4.2, h: 4.0,
    sizing: { type: "contain", w: 4.2, h: 4.0 },
    shadow: mkShadow(),
  });

  s.addText("Una herramienta de lectura y anotación local, no un intermediario financiero.", {
    x: 5.4, y: 5.15, w: 4.2, h: 0.3,
    fontSize: 9, color: C.slate, italic: true, align: "center", margin: 0,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 5 — CÓMO FUNCIONA (3 pasos)
// ─────────────────────────────────────────────────────────────────────────────
{
  let s = pres.addSlide();
  s.background = { color: C.bg };

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 1.1, fill: { color: "111827" } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.07, h: 1.1, fill: { color: C.orange } });
  s.addText("¿CÓMO FUNCIONA?", {
    x: 0.25, y: 0, w: 9.5, h: 1.1,
    fontSize: 22, fontFace: "Arial Black", bold: true, color: C.white,
    align: "left", valign: "middle", margin: 0,
  });

  const steps = [
    { n: "01", icon: "🏦", t: "Usuario abre Itaú Link", d: "Monexa se activa automáticamente\nal detectar el portal bancario.\nNo requiere configuración manual." },
    { n: "02", icon: "🔄", t: "Captura & Análisis", d: "El motor escanea las transacciones\nvisibles, valida la integridad del saldo\ny aplica reglas de etiquetado." },
    { n: "03", icon: "📊", t: "Dashboard & Exportación", d: "El usuario accede al dashboard\ncon visualizaciones en tiempo real\ny exporta en formatos contables." },
  ];

  steps.forEach((st, i) => {
    const x = 0.4 + i * 3.1;
    // Tarjeta
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.3, w: 2.9, h: 4.1,
      fill: { color: C.darkCard },
      shadow: mkShadow(),
    });
    // Número grande con fondo naranja
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.3, w: 2.9, h: 0.85,
      fill: { color: C.orange },
    });
    s.addText(st.n, {
      x, y: 1.3, w: 2.9, h: 0.85,
      fontSize: 36, fontFace: "Arial Black", bold: true, color: C.white,
      align: "center", valign: "middle", margin: 0,
    });
    // Icono
    s.addText(st.icon, { x, y: 2.3, w: 2.9, h: 0.65, fontSize: 30, align: "center", margin: 0 });
    // Título paso
    s.addText(st.t, {
      x: x + 0.15, y: 3.05, w: 2.6, h: 0.52,
      fontSize: 13, fontFace: "Arial Black", bold: true, color: C.white, align: "center", margin: 0,
    });
    // Descripción
    s.addText(st.d, {
      x: x + 0.15, y: 3.65, w: 2.6, h: 1.65,
      fontSize: 10.5, fontFace: "Calibri", color: C.slate, align: "center", margin: 0,
    });
    // Flecha entre pasos
    if (i < steps.length - 1) {
      s.addText("→", {
        x: x + 2.9, y: 2.8, w: 0.22, h: 0.5,
        fontSize: 18, color: C.orange, bold: true, align: "center", margin: 0,
      });
    }
  });

  // Footer
  s.addText("Sin APIs  ·  Sin servidores externos  ·  Manifest V3 Chrome Extension", {
    x: 0.5, y: 5.25, w: 9, h: 0.3,
    fontSize: 9, color: C.slate, align: "center", italic: true, margin: 0,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 6 — EL PRODUCTO EN ACCIÓN (Screenshot real)
// ─────────────────────────────────────────────────────────────────────────────
{
  let s = pres.addSlide();
  s.background = { color: "080C14" };

  // Imagen a pantalla casi completa
  s.addImage({
    path: IMG.sidebar,
    x: 0, y: 0, w: 10, h: 5.625,
    sizing: { type: "cover", w: 10, h: 5.625 },
  });

  // Overlay oscuro superior para texto
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 1.0,
    fill: { color: "000000", transparency: 25 },
  });

  // Título sobre overlay
  s.addText("EL PRODUCTO EN ACCIÓN", {
    x: 0.3, y: 0.15, w: 7, h: 0.7,
    fontSize: 22, fontFace: "Arial Black", bold: true, color: C.white, margin: 0,
  });
  s.addText("Monexa Flow integrado nativamente en Itaú Link  ·  Sidebar interactivo en tiempo real", {
    x: 0.3, y: 0.72, w: 9, h: 0.25,
    fontSize: 9, color: C.orange, margin: 0,
  });

  // Callouts sobre la imagen
  const callouts = [
    { x: 7.5, y: 1.1, label: "Panel de Control\nInteligente" },
    { x: 7.5, y: 2.6, label: "KPIs en\nTiempo Real" },
    { x: 7.5, y: 4.0, label: "Export & Reglas\nAutomáticas" },
  ];
  callouts.forEach(c => {
    s.addShape(pres.shapes.RECTANGLE, {
      x: c.x, y: c.y, w: 2.3, h: 0.55,
      fill: { color: C.orange },
      shadow: mkShadow(),
    });
    s.addText(c.label, {
      x: c.x, y: c.y, w: 2.3, h: 0.55,
      fontSize: 9, fontFace: "Calibri", bold: true, color: C.white,
      align: "center", valign: "middle", margin: 0,
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 7 — DASHBOARD ANALYTICS (Screenshot real)
// ─────────────────────────────────────────────────────────────────────────────
{
  let s = pres.addSlide();
  s.background = { color: C.bg };

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 1.1, fill: { color: "111827" } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.07, h: 1.1, fill: { color: C.orange } });
  s.addText("DASHBOARD ANALYTICS", {
    x: 0.25, y: 0, w: 6, h: 1.1,
    fontSize: 22, fontFace: "Arial Black", bold: true, color: C.white,
    align: "left", valign: "middle", margin: 0,
  });
  s.addText("Visualización profesional en tiempo real", {
    x: 6.2, y: 0, w: 3.6, h: 1.1,
    fontSize: 11, color: C.orange, italic: true,
    align: "right", valign: "middle", margin: 0,
  });

  // Screenshot del promo (dashboard)
  s.addImage({
    path: IMG.promo,
    x: 0.35, y: 1.2, w: 9.3, h: 3.3,
    sizing: { type: "cover", w: 9.3, h: 3.3 },
    shadow: mkShadow(),
  });

  // 3 stats abajo
  const stats = [
    { n: "100%", l: "Privacidad Local" },
    { n: "< 1s",  l: "Captura por transacción" },
    { n: "MV3",   l: "Estándar Chrome moderno" },
  ];
  stats.forEach((st, i) => {
    const x = 0.35 + i * 3.15;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 4.7, w: 2.95, h: 0.78,
      fill: { color: C.darkCard },
    });
    s.addText(st.n, {
      x: x + 0.1, y: 4.72, w: 2.75, h: 0.36,
      fontSize: 22, fontFace: "Arial Black", bold: true, color: C.orange,
      align: "center", margin: 0,
    });
    s.addText(st.l, {
      x: x + 0.1, y: 5.08, w: 2.75, h: 0.3,
      fontSize: 9, color: C.slate,
      align: "center", margin: 0,
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 8 — SEGURIDAD (Screenshot real)
// ─────────────────────────────────────────────────────────────────────────────
{
  let s = pres.addSlide();
  s.background = { color: C.bg };

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 1.1, fill: { color: "0D2B1A" } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.07, h: 1.1, fill: { color: C.green } });
  s.addText("SEGURIDAD & PRIVACIDAD", {
    x: 0.25, y: 0, w: 9.5, h: 1.1,
    fontSize: 22, fontFace: "Arial Black", bold: true, color: C.white,
    align: "left", valign: "middle", margin: 0,
  });

  // Screenshot de features de seguridad
  s.addImage({
    path: IMG.security,
    x: 5.0, y: 1.2, w: 4.8, h: 4.2,
    sizing: { type: "cover", w: 4.8, h: 4.2 },
    shadow: mkShadow(),
  });

  const secs = [
    { icon: "🔒", t: "Zero Cloud Persistence",     d: "Ningún dato financiero se envía a ningún servidor externo. Todo reside en chrome.storage.local e IndexedDB del usuario." },
    { icon: "🛡️", t: "Solo en dominios Itaú",       d: "La extensión solo se activa en dominios oficiales de Itaú Uruguay. Sin acceso a otros sitios web." },
    { icon: "🔑", t: "Sin credenciales",            d: "Monexa NUNCA accede ni solicita user/password. Lee únicamente los datos visibles en pantalla." },
    { icon: "✅", t: "Firma Digital de Auditoría",  d: "Cada exportación incluye un hash SHA-256 que garantiza la inmutabilidad del conjunto de datos." },
  ];

  secs.forEach((sec, i) => {
    const y = 1.25 + i * 1.02;
    s.addText(sec.icon, { x: 0.3, y, w: 0.6, h: 0.85, fontSize: 22, margin: 0, valign: "middle" });
    s.addText(sec.t, { x: 1.0, y: y + 0.04, w: 3.8, h: 0.28, fontSize: 12, fontFace: "Arial Black", bold: true, color: C.green, margin: 0 });
    s.addText(sec.d, { x: 1.0, y: y + 0.34, w: 3.8, h: 0.5, fontSize: 9.5, color: C.slate, margin: 0 });
    if (i < secs.length - 1) {
      s.addShape(pres.shapes.LINE, { x: 0.3, y: y + 0.9, w: 4.55, h: 0, line: { color: "1A3A2A", width: 0.5 } });
    }
  });

  // Badge
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.3, y: 5.1, w: 4.5, h: 0.35,
    fill: { color: C.green, transparency: 85 },
  });
  s.addText("✓  Diseñado bajo el estándar Manifest V3 de Chrome — El más seguro disponible.", {
    x: 0.3, y: 5.1, w: 4.5, h: 0.35,
    fontSize: 9, color: C.green, bold: true, valign: "middle", margin: 5, align: "center",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 9 — PROPUESTA DE INTEGRACIÓN
// ─────────────────────────────────────────────────────────────────────────────
{
  let s = pres.addSlide();
  s.background = { color: C.bg };

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 1.1, fill: { color: C.orange } });
  s.addText("PROPUESTA DE INTEGRACIÓN OFICIAL", {
    x: 0.4, y: 0, w: 9.2, h: 1.1,
    fontSize: 20, fontFace: "Arial Black", bold: true, color: C.white,
    align: "left", valign: "middle", margin: 0,
  });

  const options = [
    {
      n: "A", t: "White Label Itaú",
      d: "Itaú adopta Monexa Flow como\nherramienta oficial para sus clientes\nbusiness y corporativos bajo su marca.",
      highlight: true,
    },
    {
      n: "B", t: "Co-Branding Premium",
      d: "Distribución conjunta como extensión\nItaú-Powered con acceso exclusivo para\ncuentas Itaú empresariales.",
      highlight: false,
    },
    {
      n: "C", t: "API Integration",
      d: "LBM Studios desarrolla una versión\ncon acceso a APIs oficiales de Itaú\npara mayor profundidad de datos.",
      highlight: false,
    },
  ];

  options.forEach((op, i) => {
    const x = 0.3 + i * 3.15;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.3, w: 2.95, h: 3.8,
      fill: { color: op.highlight ? C.orange : C.darkCard },
      shadow: mkShadow(),
    });
    // Letra opción
    s.addText(op.n, {
      x, y: 1.3, w: 2.95, h: 1.0,
      fontSize: 52, fontFace: "Arial Black", bold: true,
      color: op.highlight ? C.white : C.orange,
      align: "center", valign: "middle", margin: 0,
    });
    s.addText(op.t, {
      x: x + 0.12, y: 2.4, w: 2.71, h: 0.5,
      fontSize: 13, fontFace: "Arial Black", bold: true,
      color: C.white, align: "center", margin: 0,
    });
    s.addText(op.d, {
      x: x + 0.15, y: 3.0, w: 2.65, h: 2.0,
      fontSize: 10.5, fontFace: "Calibri",
      color: op.highlight ? "FDEBD0" : C.slate,
      align: "center", margin: 0,
    });
    if (op.highlight) {
      s.addShape(pres.shapes.RECTANGLE, {
        x, y: 4.85, w: 2.95, h: 0.35,
        fill: { color: "FFFFFF", transparency: 80 },
      });
      s.addText("★  RECOMENDADA", {
        x, y: 4.85, w: 2.95, h: 0.35,
        fontSize: 9, color: C.white, bold: true, align: "center", valign: "middle", margin: 0,
      });
    }
  });

  s.addText("Todas las opciones contemplan soporte técnico dedicado, documentación completa y capacitación al equipo Itaú.", {
    x: 0.3, y: 5.3, w: 9.4, h: 0.25,
    fontSize: 9, color: C.slate, italic: true, align: "center", margin: 0,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 10 — PRÓXIMOS PASOS (CTA)
// ─────────────────────────────────────────────────────────────────────────────
{
  let s = pres.addSlide();
  s.background = { color: C.bg };

  // Franja naranja izquierda
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.2, h: 5.625, fill: { color: C.orange } });

  s.addText("PRÓXIMOS PASOS", {
    x: 0.45, y: 0.35, w: 9.2, h: 0.65,
    fontSize: 32, fontFace: "Arial Black", bold: true, color: C.white, margin: 0,
  });
  s.addText("Roadmap de integración propuesto", {
    x: 0.45, y: 1.05, w: 9.2, h: 0.35,
    fontSize: 14, color: C.orange, italic: true, margin: 0,
  });

  const steps = [
    { n: "Semana 1-2",  t: "Demo Técnica",          d: "Presentación en vivo del producto al equipo IT de Itaú. Validación de seguridad y compatibilidad." },
    { n: "Semana 3-4",  t: "POC Itaú Sandbox",      d: "Prueba de concepto en entorno controlado con cuentas de prueba y equipo selecto de usuarios." },
    { n: "Mes 2",       t: "Acuerdo Comercial",      d: "Definición del modelo de integración (A/B/C), SLA, soporte y términos contractuales." },
    { n: "Mes 3-4",     t: "Piloto Controlado",      d: "Lanzamiento para clientes beta Itaú Business. Recopilación de feedback y ajustes." },
    { n: "Mes 5+",      t: "Lanzamiento Oficial",    d: "Disponibilidad general para todos los clientes elegibles de Itaú Uruguay." },
  ];

  steps.forEach((st, i) => {
    const y = 1.55 + i * 0.78;
    // Línea de tiempo
    s.addShape(pres.shapes.OVAL, { x: 0.38, y: y + 0.14, w: 0.22, h: 0.22, fill: { color: C.orange } });
    if (i < steps.length - 1) {
      s.addShape(pres.shapes.LINE, { x: 0.48, y: y + 0.36, w: 0, h: 0.55, line: { color: C.orange, width: 1.5 } });
    }
    // Tag de tiempo
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.72, y: y + 0.08, w: 1.35, h: 0.28,
      fill: { color: C.orange, transparency: 85 },
    });
    s.addText(st.n, {
      x: 0.72, y: y + 0.08, w: 1.35, h: 0.28,
      fontSize: 8, color: C.orange, bold: true, align: "center", valign: "middle", margin: 0,
    });
    s.addText(st.t, {
      x: 2.2, y, w: 2.5, h: 0.35,
      fontSize: 12, fontFace: "Arial Black", bold: true, color: C.white, margin: 0,
    });
    s.addText(st.d, {
      x: 4.85, y: y + 0.04, w: 4.95, h: 0.55,
      fontSize: 9.5, color: C.slate, margin: 0,
    });
    if (i < steps.length - 1) {
      s.addShape(pres.shapes.LINE, { x: 0.72, y: y + 0.75, w: 9.1, h: 0, line: { color: "1E293B", width: 0.5 } });
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 11 — CIERRE
// ─────────────────────────────────────────────────────────────────────────────
{
  let s = pres.addSlide();
  s.background = { color: C.bg };

  // Fondo oscuro + manchas de color (aesthetic)
  s.addShape(pres.shapes.OVAL, {
    x: -1.5, y: -1, w: 5, h: 5,
    fill: { color: C.orange, transparency: 90 },
    line: { color: "none", width: 0 },
  });
  s.addShape(pres.shapes.OVAL, {
    x: 7, y: 2.5, w: 4, h: 4,
    fill: { color: C.orange, transparency: 92 },
    line: { color: "none", width: 0 },
  });

  // Icono central
  s.addImage({ path: IMG.icon, x: 4.35, y: 0.5, w: 1.3, h: 1.3 });

  s.addText("MONEXA FLOW", {
    x: 0.5, y: 1.95, w: 9, h: 0.75,
    fontSize: 44, fontFace: "Arial Black", bold: true, color: C.white,
    align: "center", charSpacing: 4, margin: 0,
  });
  s.addText("Tu flujo bancario, finalmente bajo control.", {
    x: 1, y: 2.8, w: 8, h: 0.45,
    fontSize: 16, color: C.orange, align: "center", italic: true, margin: 0,
  });

  // Separador
  s.addShape(pres.shapes.LINE, { x: 3.5, y: 3.4, w: 3, h: 0, line: { color: C.orange, width: 1.5 } });

  s.addText([
    { text: "Contacto: ", options: { bold: true, color: C.slate } },
    { text: "lbmstudios.io  ·  Marzo 2026", options: { color: C.orange } },
  ], {
    x: 1, y: 3.6, w: 8, h: 0.35,
    fontSize: 12, align: "center", margin: 0, fontFace: "Calibri",
  });

  s.addText("Propuesta Confidencial — Exclusiva para Itaú Uruguay S.A.", {
    x: 1, y: 4.1, w: 8, h: 0.3,
    fontSize: 9, color: C.slate, align: "center", italic: true, margin: 0,
  });

  s.addText("© 2026 LBM Studios. Todos los derechos reservados.", {
    x: 1, y: 5.1, w: 8, h: 0.3,
    fontSize: 8, color: "374151", align: "center", margin: 0,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GUARDAR
// ─────────────────────────────────────────────────────────────────────────────
const outPath = path.join(ROOT, "Monexa_Flow_Itau_Propuesta_2026.pptx");

pres.writeFile({ fileName: outPath }).then(() => {
  console.log("✅ Presentación creada:");
  console.log("   " + outPath);
}).catch(err => {
  console.error("❌ Error:", err);
  process.exit(1);
});
