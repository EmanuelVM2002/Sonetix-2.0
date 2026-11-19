# Descubre Medellín · by SONETIX (prototipo de interfaz)

Nombre **provisional**. Prototipo estático (HTML + CSS + JS) del diseño de la plataforma: inicio, mapa interactivo, fichas, barrios, sección comercial de SONETIX y formulario de cotización.

## Cómo verlo

```
node serve.js 8861
```

y abre http://localhost:8861 (necesita internet: carga MapLibre desde unpkg y el mapa base desde OpenFreeMap).

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
- `js/data.js`: **datos de ejemplo** (negocios, barrios, categorías) y el número de WhatsApp de SONETIX (`SONETIX_WHATSAPP`, vacío).
- `js/app.js`: mapa, filtros, buscador, fichas, modales, formularios y tema.

## Lo que es de demostración

- Los 36 negocios, sus descripciones y ubicaciones son inventados. Las coordenadas son aproximadas.
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
