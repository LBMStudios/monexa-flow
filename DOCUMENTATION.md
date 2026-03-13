# 🏦 Monexa Flow: Sistema de Auditoría Bancaria V2
## Documentación Técnica y Operativa (Actualización v1.2.6)

Monexa Flow es una herramienta de auditoría bancaria in-situ diseñada para profesionales que operan con **Itaú Link (Uruguay)**. El programa transforma la interfaz bancaria estándar en una terminal de contabilidad avanzada, permitiendo extraer, validar y auditar datos sin que la información sensible salga del computador del usuario.

---

## 🏗️ Arquitectura del Sistema

El ecosistema Monexa Flow se divide en dos componentes principales:

### 1. Extensión de Chrome (El Motor)
Desarrollada bajo el estándar **Manifest V3**, la extensión es el corazón del programa. Utiliza una arquitectura modular de scripts de contenido (Content Scripts) que se inyectan en el sitio del banco.

- **Scanner (`06_scanner.js`)**: Realiza el "scraping" en tiempo real del DOM bancario. Extrae montos, fechas, descripciones y tipos de transacción (débito/crédito).
- **Base de Datos Local (`01_db.js`)**: Utiliza `chrome.storage.local` e `IndexedDB` para persistir los datos extraídos de forma encriptada y local.
- **Sistema de Auditoría (`04_data.js`)**: Implementa la lógica de **Gap Detection** (detección de baches), comparando los saldos reportados por el banco contra la suma de transacciones escaneadas.
- **Interfaz (UI) (`08_ui.js`)**: Inyecta una barra lateral (Sidebar) nativa dentro del Home Banking utilizando Glassmorphism para una integración visual premium.

### 2. Landing Page (Despliegue y Captación)
Ubicada en `landing/`, es una aplicación estática optimizada para Vercel.
- **Diseño**: Inspirado en estéticas "Orbify" y Dark Premium.
- **Seguridad**: No utiliza bases de datos externas para usuarios bancarios comunes, reforzando la promesa de privacidad.

---

## 🔒 Modelo de Seguridad y Privacidad

Monexa Flow se rige por el principio de **"Cero Conocimiento" (Zero Knowledge)**:

1.  **Ejecución Local**: Todo el procesamiento de datos se realiza en el navegador del usuario.
2.  **Sin Servidores de Datos**: Las transacciones financieras NUNCA se suben a una nube.
3.  **Acceso Seguro**: La extensión solo se activa en dominios específicos de Itaú, evitando el acceso accidental a otros sitios.
4.  **Auditoría Digital**: Cada extracción cuenta con una "Firma Digital de Auditoría" interna que garantiza la inmutabilidad de los datos exportados a Excel/CSV.

---

## 📊 Funcionamiento del Programa

### 1. Captura de Datos
Al abrir Itaú Link, Monexa reconoce automáticamente la tabla de movimientos. El usuario activa el **Scanner** y el programa comienza a leer cada línea, inclusive capturando el texto completo de los recibos PDF si se habilitan las opciones avanzadas.

### 2. Gap Detection (Detección de Vacíos)
Es la función estrella. El programa calcula:
`[Saldo Inicial] - [Suma de Transacciones] == [Saldo Final]`
Si hay una diferencia de un solo centavo, Monexa dispara una alerta roja indicando que "Faltan datos por escanear", garantizando una integridad del 100%.

### 3. Exportación Profesional
Permite descargar los datos limpios y normalizados para importar directamente en software contable:
- **Normalización de Signos**: Convierte el formato visual del banco a valores numéricos reales (débitos negativos, créditos positivos).
- **Detección de Moneda**: Diferencia automáticamente cuentas en pesos y dólares.

---

## 🚀 Despliegue y Mantenimiento

- **Nube**: Los cambios aprobados se despliegan automáticamente en `https://monexa-flow.vercel.app/`.
- **Repositorio**: Todos los cambios de código, estilos y documentación se encuentran sincronizados en el servidor central vía Git.

---
*Documentación generada por Antigravity para Monexa Flow — 2026*
