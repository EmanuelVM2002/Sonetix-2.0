# Sonetix GO · by SONETIX (prototipo de interfaz)

Nombre **provisional**. Prototipo estático (HTML + CSS + JS) del diseño de la plataforma: inicio, mapa interactivo, fichas, barrios, sección comercial de SONETIX y formulario de cotización.

## Cómo verlo

```
node serve.js 8861
```

y abre http://localhost:8861 (necesita internet: carga MapLibre desde unpkg y el mapa base desde OpenFreeMap).

## Pantallas

- **Portada** (`index.html`): horizonte de barras (el ecualizador de SONETIX convertido en el valle de Medellín; las barras rojas son los barrios y llevan al mapa), cómo funciona, vista previa del mapa, barrios, eventos, sección para negocios, trabajos reales y cotización. Tipografía de marca: Space Grotesk (Google Fonts).
- **Mapa** (`#/mapa`): pantalla aparte a pantalla completa, con su propio menú (Inicio · Mapa). La portada no carga el mapa hasta que se abre esta pantalla. Enlace a un negocio: `#/mapa/ID` (también se entiende el antiguo `#n=ID`).

## Mapa

- **Menos saturado:** al alejarse se ven solo burbujas por barrio (nombre y cantidad); los negocios aparecen al acercarse. Las calles menores, los nombres secundarios y los edificios salen solo con zoom alto, y la leyenda es plegable.
- **Más interactivo:** al pasar el cursor por la lista o por un punto aparece una tarjeta con categoría, estrellas, si está abierto y si tiene evento (y se resalta en ambos lados). Tocar una burbuja lleva al barrio y filtra la lista. El panel lateral es compacto: buscador con botón **Filtros** (con contador; plega barrio, abierto ahora, web oficial, eventos y 4 estrellas) y una fila de categorías solo con ícono. El mapa arranca en **3D** inclinado. Botones del mapa: **3D** (inclina el mapa y muestra edificios), **Eventos** (resalta negocios con eventos), **Esta zona** (la lista muestra solo lo que se ve en el mapa) y **Cerca de mí** (pide permiso de ubicación solo al tocarlo).

## Trabajos reales de SONETIX

La sección «Trabajos reales» muestra capturas de tres sitios (El Coctelazo, Coctelazo & Perritos Gourmet y Vibrans Gourmet) con lo que cada uno hace, solo con hechos que se ven en el propio sitio, sin cifras inventadas. Vibrans todavía no tiene dirección pública: su tarjeta no lleva enlace (cuando se publique, pon su dirección en `url` dentro de `CASES`). Los datos están en el arreglo `CASES` de `js/app.js`; para ocultar uno (por ejemplo si un cliente no autoriza mostrarlo) pon `show: false`. Las capturas están en `img/casos/`. Los nombres, logos e imágenes pertenecen a cada negocio.

## Ficha del negocio

- **Galería:** mosaico de fotos con visor (flechas del teclado, Esc, puntos). Si el negocio trae `photos: [{ src, alt, cap }]` en `js/data.js` se usan; si no, se muestran composiciones de ejemplo marcadas «Foto de ejemplo». Las fotos reales solo con permiso del dueño.
- **Horario semanal** desplegable (resalta el día de hoy) y botón **compartir**: copia un enlace directo (`#/mapa/ID`) que abre el negocio en la pantalla del mapa.
- **Reclamar ficha con fotos:** hasta 6 imágenes (máx. 5 MB), con vista previa y confirmación de que son suyas. En la demostración no se suben a ningún servidor; en producción irán a almacenamiento y se revisarán antes de publicarse.

## Eventos, calificaciones y comentarios

- **Eventos:** sección `#eventos` con filtros (hoy, esta semana, tipo), detalle de cada evento y «Publicar un evento» para negocios. Los eventos enviados llegan al panel como «Evento por revisar» y no se publican solos.
- **Calificaciones:** cada ficha muestra el promedio en estrellas, permite calificar de 1 a 5 y comentar. Rechaza enlaces, correos y números de contacto, y tiene botón «Reportar» (llega al panel como «Reseña reportada»). Las reseñas con la etiqueta «Ejemplo» son de demostración.
- En producción las reseñas necesitan cuentas de usuario y moderación en servidor; aquí se guardan solo en el navegador (`dm_reviews`).

## Ver en la web (GitHub Pages)

En el repositorio: Settings → Pages → Build and deployment → Source: «Deploy from a branch», rama `main`, carpeta `/ (root)`. El sitio queda en `https://<usuario>.github.io/Sonetix-2.0/` y el panel en `/admin.html`. Todas las rutas son relativas, así que funcionan bajo ese subdirectorio. El panel no tiene inicio de sesión: es solo una demostración con datos de ejemplo.

## Panel administrativo

`admin.html` (http://localhost:8861/admin.html): resumen con indicadores, tabla de prospectos con puntaje de 100 puntos y evidencia web con fecha y herramienta, embudo tipo tablero, mapa interno de oportunidad, bandeja de solicitudes del sitio público y registro «No contactar». Datos de ejemplo en el navegador (`dm_admin`); sin inicio de sesión, así que **no publicar tal cual**: en producción va detrás de Supabase Auth.

## Archivos

- `admin.html`, `css/admin.css`, `js/admin.js`: panel administrativo.
- `index.html`: estructura de todas las secciones.
- `css/style.css`: paleta SONETIX (tokens al inicio), modo oscuro por defecto y modo claro.
- `js/data.js`: negocios reales (El Coctelazo, 6 sedes, y Coctelazo & Perritos Gourmet, con `real: true`: horarios por día `hours.byDay`, WhatsApp `wa`, carta `menu`, fotos en `img/negocios/`) más 5 negocios de ejemplo (`example: true`), barrios, categorías y el número de WhatsApp de SONETIX (`SONETIX_WHATSAPP`, vacío).
- `js/app.js`: mapa, filtros, buscador, fichas, modales, formularios y tema.

## Lo que es de demostración

- Solo 5 negocios son inventados (`example: true`). Los reales salen de sus sitios oficiales; sus coordenadas son aproximadas (precisión de barrio).
- Los precios de los planes son de referencia, por confirmar.
- Las solicitudes (cotización, reclamar ficha, retirar negocio) se guardan solo en el navegador (`localStorage`, clave `dm_leads`). No hay servidor.
- La política de datos es un borrador pendiente de revisión legal.
- Los términos de uso de OpenFreeMap y de las teselas deben confirmarse antes de lanzar.

## Pendiente para pasar a producción

1. Base de datos real (Supabase + PostGIS) y datos de fuentes de licencia limpia (no copiar de Google Maps ni Instagram).
2. Flujo real de «Reclamar ficha» con verificación por WhatsApp y consentimiento para fotos.
3. Panel administrativo de prospectos (ver documento estratégico).
4. Migrar a Next.js + TypeScript para SEO por barrio y categoría.
5. Configurar `SONETIX_WHATSAPP`, nombre definitivo y logo.

## Confianza y publicación
- `SONETIX_WHATSAPP` (js/data.js) ya apunta al WhatsApp de SONETIX: los botones de cotizar abren el chat con el mensaje armado.
- Sección «Cómo trabajamos» y preguntas frecuentes en la portada (`#proceso`, `#faq`); el JSON-LD del `<head>` repite esas preguntas.
- Vista previa al compartir: etiquetas Open Graph/Twitter, `img/og-sonetix.png`, `favicon.svg`, `img/apple-touch-icon.png`, `robots.txt` y `sitemap.xml`. Las URLs absolutas usan `https://emanuelvm2002.github.io/Sonetix-2.0/`: cambiarlas cuando exista dominio propio.
- `privacidad.html`: política de tratamiento de datos (Ley 1581 de 2012) y reglas de reseñas. Falta completar razón social, NIT y correo del responsable y revisarla con un abogado antes del lanzamiento.
