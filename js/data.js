/* ============================================================
   DATOS DE PARCHEA

   · Negocios REALES (marcados `real: true`): El Coctelazo (6 sedes) y
     Coctelazo & Perritos Gourmet (Provenza). La información sale de sus
     sitios oficiales, creados por SONETIX: direcciones, horarios, WhatsApp
     y carta. Las coordenadas son aproximadas (precisión de barrio): el
     botón «Cómo llegar» abre Google Maps con ese punto.
   · Negocios de EJEMPLO (marcados `example: true`): solo 5, para mostrar
     cómo se ve una ficha sin reclamar, con y sin sitio, y con eventos.
     No existen en la realidad.
   Cuando exista la base real (Supabase), este archivo se reemplaza.
   ============================================================ */

// Número de WhatsApp de SONETIX en formato internacional sin "+" (ej: "573001234567").
// Si queda vacío, el formulario guarda la solicitud en el navegador y muestra un aviso.
window.SONETIX_WHATSAPP = "573017759082";

window.CATEGORIES = [
  { id: "rest",    label: "Restaurantes",    icon: "M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 2-3 5-3 8h3v10" },
  { id: "cafe",    label: "Cafés",           icon: "M5 8h11v6a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8zM16 9h2a2.5 2.5 0 0 1 0 5h-2M8 3v2M12 3v2" },
  { id: "bar",     label: "Bares",           icon: "M5 4h14l-7 9-7-9zM12 13v7M8 20h8" },
  { id: "moda",    label: "Moda",            icon: "M8 4L3 7l2 4 3-1v10h8V10l3 1 2-4-5-3a4 4 0 0 1-8 0z" },
  { id: "belleza", label: "Belleza",         icon: "M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.1 7.9L20 18M8.1 16.1L20 6" },
  { id: "libros",  label: "Librerías",       icon: "M4 4h6a3 3 0 0 1 2 1 3 3 0 0 1 2-1h6v15h-6a3 3 0 0 0-2 1 3 3 0 0 0-2-1H4V4zM12 5v15" },
  { id: "ocio",    label: "Entretenimiento", icon: "M3 9V6h18v3a3 3 0 0 0 0 6v3H3v-3a3 3 0 0 0 0-6zM13 6v12" },
  { id: "emprend", label: "Emprendimientos", icon: "M12 3l2.5 6 6 .5-4.6 4 1.4 6L12 16.5 6.7 19.5l1.4-6L3.5 9.5l6-.5L12 3z" }
];

window.BARRIOS = [
  { id: "sanjavier", name: "San Javier",        lat: 6.2522, lng: -75.6218, zoom: 14.8, vibe: "Occidente de Medellín" },
  { id: "manrique",  name: "Manrique · Campo Valdés", lat: 6.2748, lng: -75.5559, zoom: 14.9, vibe: "Nororiente de Medellín" },
  { id: "castilla",  name: "Castilla",          lat: 6.2960, lng: -75.5690, zoom: 14.9, vibe: "Noroccidente de Medellín" },
  { id: "belen",     name: "Belén",             lat: 6.2160, lng: -75.6041, zoom: 14.4, vibe: "Comercio de barrio y emprendimientos" },
  { id: "provenza",  name: "Provenza",          lat: 6.2093, lng: -75.5679, zoom: 15.2, vibe: "Calles arboladas, bares y cafés de autor" },
  { id: "laureles",  name: "Laureles",          lat: 6.2447, lng: -75.5910, zoom: 14.8, vibe: "Barrio de vecinos, parques y restaurantes" },
  { id: "centro",    name: "Centro",            lat: 6.2517, lng: -75.5636, zoom: 15.0, vibe: "Historia, comercio y cultura" }
];

/* Horarios por defecto de los negocios de ejemplo. days: 0=domingo … 6=sábado. close > 24 = pasada la medianoche. */
const H = {
  cafe:    { days: [0,1,2,3,4,5,6], open: 7,  close: 19 },
  belleza: { days: [1,2,3,4,5,6],   open: 9,  close: 19 },
  libros:  { days: [1,2,3,4,5,6],   open: 10, close: 19 },
  moda:    { days: [1,2,3,4,5,6],   open: 10, close: 20 },
  ocio:    { days: [4,5,6,0],       open: 14, close: 25 }
};

/* Horario por día: { día: [abre, cierra] }. Los días que no aparecen, cerrado. */
const ADULT = "Venta de licor solo a mayores de 18 años. Disfruta con responsabilidad.";

/* ---------------- NEGOCIOS REALES ---------------- */
const CZ_IMG = "img/negocios/coctelazo/";
const CZ_HOURS = { byDay: { 0: [14.5, 24], 1: [14.5, 24], 2: [14.5, 24], 3: [14.5, 24], 4: [14.5, 24], 5: [14.5, 26], 6: [14.5, 26] } };
const CZ_MENU = {
  note: "Precios de referencia tomados del sitio oficial; confirma en la sede.",
  url: "https://elcoctelazo.com",
  items: [
    { name: "Granizado 16 oz",        price: 12500, from: true, detail: "Sin licor desde $12.500 · envenenado $17.500", img: CZ_IMG + "fam16.webp" },
    { name: "Granizado 1 litro",      price: 27500,             detail: "Para compartir",                              img: CZ_IMG + "gran1l.webp" },
    { name: "Cremoso tradicional 16 oz", price: 19000,          detail: "Granizado cremoso",                           img: CZ_IMG + "cr16.webp" },
    { name: "Litrón cremoso",         price: 42000,             detail: "Litro de granizado cremoso",                  img: CZ_IMG + "crlt.webp" },
    { name: "Granizado de Oreo 22 oz", price: 18000,            detail: "Sabor Oreo",                                  img: CZ_IMG + "g22oreo.webp" },
    { name: "Granizado chamoy y tajín", price: 19800,           detail: "Picante y ácido",                             img: CZ_IMG + "chamoy.webp" }
  ]
};
const CZ_PHOTOS = [
  { src: CZ_IMG + "fam16.webp",           alt: "Granizado de 16 oz de El Coctelazo",   cap: "Granizado 16 oz" },
  { src: CZ_IMG + "gran1l.webp",          alt: "Granizado de 1 litro",                 cap: "Granizado 1 litro" },
  { src: CZ_IMG + "cr16.webp",            alt: "Cremoso tradicional",                  cap: "Cremoso tradicional" },
  { src: CZ_IMG + "crlt.webp",            alt: "Litrón cremoso",                       cap: "Litrón cremoso" },
  { src: CZ_IMG + "g22oreo.webp",         alt: "Granizado de Oreo",                    cap: "Granizado de Oreo" },
  { src: CZ_IMG + "chamoy.webp",          alt: "Granizado de chamoy y tajín",          cap: "Chamoy y tajín" },
  { src: CZ_IMG + "bestia-blanca.webp",   alt: "Bestia blanca de El Coctelazo",        cap: "Bestia blanca" },
  { src: CZ_IMG + "bomba-smirnoff.webp",  alt: "Bomba Smirnoff de El Coctelazo",       cap: "Bomba Smirnoff" }
];
const CZ_COMMON = {
  real: true, brand: "El Coctelazo", logo: CZ_IMG + "logo-el-coctelazo.webp", cat: "bar", price: 1,
  claimed: true, web: "https://elcoctelazo.com", webBy: "sonetix", ig: null,
  wa: "573046609548", waText: "Hola, vi El Coctelazo en Parchea y quiero hacer un pedido.",
  desc: "Granizados, micheladas, bombas, litrones, nevecones, adiciones, cervezas y licores. En Medellín desde 2017.",
  hours: CZ_HOURS, hoursNote: "Horario general del sitio oficial; viernes y sábado cierran a las 2:00 a. m.",
  notice: ADULT, menu: CZ_MENU, photos: CZ_PHOTOS
};
const cz = (id, sede, barrio, address, lat, lng, extra = {}) => Object.assign({}, CZ_COMMON, {
  id, name: "El Coctelazo · " + sede, sede, barrio, address, lat, lng,
  services: ["Granizados", "Micheladas", "Litrones", "Licores y cervezas"].concat(extra.services || [])
}, extra, { services: ["Granizados", "Micheladas", "Litrones", "Licores y cervezas"].concat(extra.services || []) });

const PZ_IMG = "img/negocios/provenza/";
const PZ_MENU = {
  note: "Precios de referencia tomados del sitio oficial; confirma en el local.",
  url: "https://elcoctelazoprovenza.emanuelvillada10.workers.dev",
  items: [
    { name: "Margarita spicy tamarindo", price: 29000,                 detail: "Cóctel",                              img: PZ_IMG + "margarita-spicy-tamarindo.webp" },
    { name: "Blue Island",               price: 35000,                 detail: "Cóctel",                              img: PZ_IMG + "blue-island.webp" },
    { name: "Las Gemelas del Perreo",    price: 35900,                 detail: "Para compartir",                      img: PZ_IMG + "gemelas-del-perreo.webp" },
    { name: "Cantarito",                 price: 149000,                detail: "Incluye media botella de tequila",    img: PZ_IMG + "cantarito.webp" },
    { name: "Perritos",                  price: 11000, from: true,     detail: "Elige 1 proteína",                    img: PZ_IMG + "perritos.webp" },
    { name: "Baos x2",                   price: 27000,                 detail: "Chicharrón crocante",                 img: PZ_IMG + "baos.webp" },
    { name: "Hamburguesas",              price: 13000,                 detail: "Comida gourmet",                      img: PZ_IMG + "hamburguesas.webp" },
    { name: "Combo Ceviche",             price: 79000,                 detail: "Ceviche Fukuoka",                     img: PZ_IMG + "ceviche-fukuoka.webp" }
  ]
};
const PZ_PHOTOS = [
  { src: PZ_IMG + "margarita-spicy-tamarindo.webp", alt: "Margarita spicy tamarindo",     cap: "Margarita spicy tamarindo" },
  { src: PZ_IMG + "perritos.webp",                  alt: "Perritos gourmet",              cap: "Perritos gourmet" },
  { src: PZ_IMG + "blue-island.webp",               alt: "Cóctel Blue Island",            cap: "Blue Island" },
  { src: PZ_IMG + "baos.webp",                      alt: "Baos de chicharrón",            cap: "Baos" },
  { src: PZ_IMG + "hamburguesas.webp",              alt: "Hamburguesas",                  cap: "Hamburguesas" },
  { src: PZ_IMG + "ceviche-fukuoka.webp",           alt: "Ceviche Fukuoka",               cap: "Ceviche Fukuoka" },
  { src: PZ_IMG + "cantarito.webp",                 alt: "Cantarito",                     cap: "Cantarito" },
  { src: PZ_IMG + "malteada-oreo.webp",             alt: "Malteada de Oreo",              cap: "Malteada de Oreo" }
];

window.BUSINESSES = [
  /* ---- El Coctelazo: una ficha por sede (las coordenadas son aproximadas) ---- */
  cz("c1", "San Javier",    "sanjavier", "Calle 39B #108-76",           6.25224, -75.62180),
  cz("c2", "Manrique",      "manrique",  "Carrera 47 #69-5, Aranjuez",  6.27190, -75.55610),
  cz("c3", "Belén La Nubia","belen",     "Carrera 83 #15A-21",          6.22180, -75.60480, {
    services: ["Domicilios"], delivery: "Domicilios de 4:30 p. m. a 12:30 a. m. desde esta sede. Pedido mínimo $20.000."
  }),
  cz("c4", "Castilla",      "castilla",  "Carrera 68 #93-83",           6.29600, -75.56900),
  cz("c5", "Belén Rincón",  "belen",     "Carrera 79 #1A-44",           6.21020, -75.60350, { services: ["Punto de venta"] }),
  cz("c6", "Campo Valdés",  "manrique",  "Carrera 48A #76-59",          6.27760, -75.55570),

  /* ---- Coctelazo & Perritos Gourmet · Provenza ---- */
  {
    id: "p1", real: true, brand: "Coctelazo & Perritos Gourmet", name: "Coctelazo & Perritos Gourmet", sede: "Provenza",
    logo: PZ_IMG + "logo-by-perritos.webp", cat: "bar", barrio: "provenza", price: 2,
    address: "Carrera 35 #8A-11, El Poblado", lat: 6.20757, lng: -75.56626,
    claimed: true, web: "https://elcoctelazoprovenza.emanuelvillada10.workers.dev", webBy: "sonetix", ig: null,
    wa: "573020370950", waText: "Hola, vi Coctelazo & Perritos Gourmet en Parchea y quiero hacer un pedido.",
    desc: "Granizados, cócteles, chupitos, malteadas, licores, cervezas, micheladas y comida gourmet. Pide desde tu mesa o a domicilio.",
    services: ["Pedido desde la mesa", "Domicilios desde las 5:00 p. m.", "Cócteles", "Comida gourmet"],
    hours: { byDay: { 0: [18, 25], 2: [17, 24], 3: [17, 24], 4: [17, 25], 5: [18, 26], 6: [18, 26] } },
    hoursNote: "Lunes cerrado. Viernes y sábado cierran a las 2:00 a. m.",
    notice: ADULT, menu: PZ_MENU, photos: PZ_PHOTOS
  },

  /* ---- Solo 5 negocios de ejemplo (ficticios) ---- */
  { id: "n9",  example: true, name: "Libros del Sur", cat: "libros", barrio: "provenza", lat: 6.21050, lng: -75.57110, price: 2, hours: H.libros, claimed: true, web: "https://example.com", webBy: null, ig: "librosdelsur",
    desc: "Librería independiente con café y club de lectura mensual.", services: ["Club de lectura", "Pedidos especiales", "Café"] },
  { id: "n12", example: true, name: "Café Primer Parque", cat: "cafe", barrio: "laureles", lat: 6.24430, lng: -75.59040, price: 1, hours: H.cafe, claimed: true, web: null, webBy: null, ig: null,
    desc: "Café de barrio con mesas en la acera y postres caseros.", services: ["Para llevar", "Mesas al aire libre", "Postres"] },
  { id: "n15", example: true, name: "Salón Calma", cat: "belleza", barrio: "laureles", lat: 6.24490, lng: -75.58880, price: 2, hours: H.belleza, claimed: false, web: null, webBy: null, ig: null,
    desc: "Manicure, pedicure y cuidado facial.", services: [] },
  { id: "n29", example: true, name: "Boutique Valentina", cat: "moda", barrio: "belen", lat: 6.21520, lng: -75.60250, price: 2, hours: H.moda, claimed: true, web: null, webBy: null, ig: "boutiquevalentina",
    desc: "Ropa femenina para toda ocasión y tallas amplias.", services: ["Tallas amplias", "Ajustes", "Pedido por WhatsApp"] },
  { id: "n26", example: true, name: "Galería Paso a Paso", cat: "ocio", barrio: "centro", lat: 6.25170, lng: -75.56140, price: 1, hours: H.ocio, claimed: true, web: "https://example.com", webBy: null, ig: "galeriapasoapaso",
    desc: "Arte contemporáneo y talleres abiertos al público.", services: ["Exposiciones", "Talleres", "Entrada libre"] }
];


/* ============================================================
   EVENTOS DE EJEMPLO — d = días a partir de hoy (siempre próximos).
   Solo para los negocios de ejemplo. Los negocios reales no tienen
   eventos hasta que ellos mismos los publiquen.
   ============================================================ */
window.EVENT_TYPES = [
  { id: "musica",  label: "Música" },
  { id: "gastro",  label: "Gastronomía" },
  { id: "promo",   label: "Promociones" },
  { id: "taller",  label: "Talleres" },
  { id: "cultura", label: "Cultura" },
  { id: "deporte", label: "Deportes" }
];

window.EVENTS = [
  { id: "e4",  biz: "n9",  d: 2, time: "18:30", type: "cultura", price: "Entrada libre",         title: "Club de lectura: cuentos de autores locales", desc: "Esta sesión leemos y conversamos sobre cuentos de escritores de la ciudad. Trae tu café y tu opinión." },
  { id: "e10", biz: "n26", d: 7, time: "17:00", type: "cultura", price: "Entrada libre",         title: "Inauguración de exposición", desc: "Abrimos una nueva exposición de arte contemporáneo con la presencia de los artistas." },
  { id: "e11", biz: "n29", d: 9, time: "15:00", type: "promo",   price: "Hasta 30 % de descuento", title: "Tarde de descuentos en nueva colección", desc: "Descuentos escalonados en la nueva colección y ajustes gratis el mismo día." }
];
window.EVENT_TYPES.push({ id: "ocio", label: "Planes" });

/* ============================================================
   RESEÑAS DE EJEMPLO — solo para un negocio de ejemplo, para mostrar
   cómo se ve la sección. Se marcan siempre como «Ejemplo». Las reseñas
   reales llegarán de usuarios con cuenta y pasarán por moderación.
   ============================================================ */
window.REVIEWS_SEED = [
  { biz: "n9", stars: 5, name: "Visitante de ejemplo", daysAgo: 9, text: "Librería con mucho encanto. El club de lectura es muy acogedor." }
];
