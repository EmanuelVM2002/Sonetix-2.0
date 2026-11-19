/* ============================================================
   DATOS DE DEMOSTRACIÓN — todo lo de este archivo es de ejemplo.
   Los negocios, descripciones y ubicaciones NO son reales.
   Las coordenadas son aproximadas, solo para mostrar el mapa.
   Cuando exista la base real (Supabase), este archivo se reemplaza.
   ============================================================ */

// Número de WhatsApp de SONETIX en formato internacional sin "+" (ej: "573001234567").
// Si queda vacío, el formulario guarda la solicitud en el navegador y muestra un aviso.
window.SONETIX_WHATSAPP = "";

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
  { id: "poblado",  name: "El Poblado",        lat: 6.2086, lng: -75.5659, zoom: 14.6, vibe: "Vida nocturna, gastronomía y turismo" },
  { id: "provenza", name: "Provenza",          lat: 6.2110, lng: -75.5695, zoom: 15.2, vibe: "Calles arboladas, bares y cafés de autor" },
  { id: "laureles", name: "Laureles",          lat: 6.2447, lng: -75.5910, zoom: 14.8, vibe: "Barrio de vecinos, parques y restaurantes" },
  { id: "estadio",  name: "Estadio · La 70",   lat: 6.2565, lng: -75.5895, zoom: 14.8, vibe: "Rumba, deporte y planes de fin de semana" },
  { id: "centro",   name: "Centro",            lat: 6.2517, lng: -75.5636, zoom: 15.0, vibe: "Historia, comercio y cultura" },
  { id: "belen",    name: "Belén",             lat: 6.2330, lng: -75.6040, zoom: 14.8, vibe: "Comercio de barrio y emprendimientos" },
  { id: "pajarito", name: "Robledo · Pajarito",lat: 6.2995, lng: -75.6270, zoom: 14.6, vibe: "Terrazas con vista y cocina local" }
];

/* Horarios por defecto según categoría. days: 0=domingo … 6=sábado. close > 24 = pasada la medianoche. */
const H = {
  rest:    { days: [0,1,2,3,4,5,6], open: 11, close: 22 },
  cafe:    { days: [0,1,2,3,4,5,6], open: 7,  close: 19 },
  bar:     { days: [2,3,4,5,6,0],   open: 17, close: 26 },
  moda:    { days: [1,2,3,4,5,6],   open: 10, close: 20 },
  belleza: { days: [1,2,3,4,5,6],   open: 9,  close: 19 },
  libros:  { days: [1,2,3,4,5,6],   open: 10, close: 19 },
  ocio:    { days: [4,5,6,0],       open: 14, close: 25 },
  emprend: { days: [1,2,3,4,5],     open: 9,  close: 18 }
};

const centers = Object.fromEntries(window.BARRIOS.map(b => [b.id, b]));
let _id = 0;
function b(name, cat, barrio, dLat, dLng, o = {}) {
  const c = centers[barrio];
  return Object.assign({
    id: "n" + (++_id), name, cat, barrio,
    lat: +(c.lat + dLat * 0.001).toFixed(5),
    lng: +(c.lng + dLng * 0.001).toFixed(5),
    desc: "", services: [], price: 2,
    hours: H[cat], claimed: true, web: null, webBy: null, ig: null
  }, o);
}

window.BUSINESSES = [
  /* El Poblado */
  b("Casa Ceiba", "rest", "poblado", 1.2, -1.4, { price: 3, web: "https://example.com", desc: "Cocina colombiana de autor con ingredientes de la región. Terraza interior y carta de vinos.", services: ["Reservas", "Terraza", "Domicilios"], ig: "casaceiba" }),
  b("Tostadora Norte", "cafe", "poblado", -1.1, 1.3, { price: 2, desc: "Café de origen tostado en el local. Barra de filtrados y repostería diaria.", services: ["Café de especialidad", "Para llevar", "Wi-Fi"], ig: "tostadoranorte" }),
  b("Bar Mirador 12", "bar", "poblado", 0.4, 1.8, { price: 3, web: "https://example.com", webBy: "sonetix", desc: "Coctelería de autor con vista a la ciudad. Música en vivo los jueves.", services: ["Coctelería", "Música en vivo", "Reservas por WhatsApp"], ig: "barmirador12" }),
  b("Atelier Lomas", "moda", "poblado", -0.5, -2.0, { price: 3, claimed: false, desc: "Boutique de diseño colombiano." }),
  b("Studio Pelo & Co", "belleza", "poblado", 2.0, 0.6, { price: 2, claimed: false, desc: "Peluquería y barbería." }),

  /* Provenza */
  b("Fogón de Provenza", "rest", "provenza", 0.6, 0.8, { price: 2, web: "https://example.com", webBy: "sonetix", desc: "Carta con QR por mesa y pedido directo al mesero. Platos para compartir.", services: ["Carta con QR", "Llamar al mesero", "Terraza"], ig: "fogonprovenza" }),
  b("Verde Menta", "cafe", "provenza", -0.8, -0.7, { price: 2, desc: "Cafetería con opciones vegetarianas y brunch todo el día.", services: ["Brunch", "Vegetariano", "Pet friendly"], ig: "verdementa" }),
  b("La Esquina Roja", "bar", "provenza", 1.0, -1.6, { price: 2, desc: "Cervezas artesanales y tapas. Plan de after office entre semana.", services: ["Cerveza artesanal", "Tapas", "Eventos"], ig: "laesquinaroja" }),
  b("Libros del Sur", "libros", "provenza", -1.4, 1.1, { price: 2, web: "https://example.com", desc: "Librería independiente con café y club de lectura mensual.", services: ["Club de lectura", "Pedidos especiales", "Café"], ig: "librosdelsur" }),
  b("Taller Cuero", "emprend", "provenza", 0.2, 2.1, { price: 3, claimed: false, desc: "Marroquinería artesanal." }),

  /* Laureles */
  b("Parrilla Dos Ríos", "rest", "laureles", 0.9, -0.9, { price: 2, desc: "Cortes a la parrilla y platos tradicionales. Almuerzo ejecutivo de lunes a viernes.", services: ["Almuerzo ejecutivo", "Domicilios", "Eventos"], ig: "parrilladosrios" }),
  b("Café Primer Parque", "cafe", "laureles", -0.4, 0.6, { price: 1, desc: "Café de barrio con mesas en la acera y postres caseros.", services: ["Para llevar", "Mesas al aire libre", "Postres"] }),
  b("Heladería Aurora", "cafe", "laureles", 1.6, 1.5, { price: 1, web: "https://example.com", webBy: "sonetix", desc: "Helados artesanales con sabores colombianos. Pedido por WhatsApp.", services: ["Helados artesanales", "Pedido por WhatsApp", "Pet friendly"], ig: "heladeriaaurora" }),
  b("Ropa Vieja Vintage", "moda", "laureles", -1.3, -1.5, { price: 2, desc: "Ropa de segunda mano seleccionada y accesorios vintage.", services: ["Vintage", "Accesorios", "Ajustes"], ig: "ropaviejavintage" }),
  b("Salón Calma", "belleza", "laureles", 0.2, 2.2, { price: 2, claimed: false, desc: "Manicure, pedicure y cuidado facial." }),
  b("Pulso Libre", "ocio", "laureles", -2.0, 0.2, { price: 2, desc: "Escape room y juegos de mesa para grupos.", services: ["Escape room", "Juegos de mesa", "Cumpleaños"], ig: "pulsolibre" }),

  /* Estadio · La 70 */
  b("Tapas de la 70", "bar", "estadio", 0.7, 0.4, { price: 2, desc: "Bar de barrio con tapas y fútbol en pantalla gigante.", services: ["Partidos en vivo", "Tapas", "Reservas por WhatsApp"], ig: "tapasdela70" }),
  b("Ají & Leña", "rest", "estadio", -0.9, -1.0, { price: 2, web: "https://example.com", desc: "Comida criolla a la leña. Menú del día y platos para grupos.", services: ["Menú del día", "Domicilios", "Grupos"], ig: "ajiylena" }),
  b("Escena Cero", "ocio", "estadio", 1.5, -1.7, { price: 2, desc: "Teatro independiente y noches de comedia.", services: ["Teatro", "Comedia", "Boletería en línea"], ig: "escenacero" }),
  b("Moda Rápida 70", "moda", "estadio", -0.2, 1.9, { price: 1, claimed: false, desc: "Tienda de ropa casual." }),
  b("Café Tribuna", "cafe", "estadio", -1.6, 0.5, { price: 1, claimed: false, desc: "Cafetería y panadería." }),

  /* Centro */
  b("Fonda Plaza Mayor", "rest", "centro", 0.4, -0.6, { price: 1, desc: "Bandeja paisa y sancocho en un edificio con historia. Muy visitado a la hora del almuerzo.", services: ["Almuerzo", "Comida típica", "Grupos"] }),
  b("Libros de Mano", "libros", "centro", -0.7, 0.9, { price: 1, desc: "Librería de usados y ediciones agotadas.", services: ["Libros usados", "Compra y cambio"], ig: "librosdemano" }),
  b("Taller Textil Centro", "emprend", "centro", 1.2, 1.6, { price: 2, claimed: false, desc: "Confección y arreglos por encargo." }),
  b("Café Esquina Antigua", "cafe", "centro", -1.5, -1.2, { price: 1, desc: "Tinto, empanadas y pandebono desde temprano.", services: ["Para llevar", "Desayunos"] }),
  b("Galería Paso a Paso", "ocio", "centro", 0.0, 2.2, { price: 1, web: "https://example.com", desc: "Arte contemporáneo y talleres abiertos al público.", services: ["Exposiciones", "Talleres", "Entrada libre"], ig: "galeriapasoapaso" }),

  /* Belén */
  b("Panadería La Veintinueve", "cafe", "belen", 0.6, 0.9, { price: 1, desc: "Pan recién horneado y desayunos completos.", services: ["Panadería", "Desayunos", "Domicilios"] }),
  b("Sabor de Mi Tierra", "rest", "belen", -0.8, -1.1, { price: 1, claimed: false, desc: "Comida casera." }),
  b("Boutique Valentina", "moda", "belen", 1.5, -0.4, { price: 2, desc: "Ropa femenina para toda ocasión y tallas amplias.", services: ["Tallas amplias", "Ajustes", "Pedido por WhatsApp"], ig: "boutiquevalentina" }),
  b("Dulces Raíces", "emprend", "belen", -1.3, 1.5, { price: 1, desc: "Dulces artesanales y detalles personalizados para eventos.", services: ["Detalles corporativos", "Pedidos por encargo", "Domicilios"], ig: "dulcesraices" }),
  b("Barbería El Filo", "belleza", "belen", 0.1, -2.1, { price: 1, claimed: false, desc: "Cortes y barba." }),

  /* Robledo · Pajarito */
  b("Mirador del Cerro", "rest", "pajarito", 0.8, 1.0, { price: 2, desc: "Parrilla y celebraciones con vista panorámica. Cotiza tu evento por WhatsApp.", services: ["Celebraciones", "Terraza con vista", "Parrilla"], ig: "miradordelcerro" }),
  b("Helados del Alto", "cafe", "pajarito", -0.9, -0.8, { price: 1, claimed: false, desc: "Heladería y waffles." }),
  b("Burgers de la Loma", "rest", "pajarito", 1.7, -1.2, { price: 1, desc: "Hamburguesas artesanales con domicilio los fines de semana.", services: ["Domicilios", "Hamburguesas", "Combos"], ig: "burgersdelaloma" }),
  b("Café Conuco", "cafe", "pajarito", -0.2, 2.0, { price: 1, desc: "Dos sedes en la ciudad. Brunch, waffles y talleres de repostería.", services: ["Brunch", "Talleres", "Pet friendly"], ig: "cafeconuco" }),
  b("Vive Verde Vivero", "emprend", "pajarito", -1.8, 0.6, { price: 1, claimed: false, desc: "Plantas y accesorios de jardinería." })
];
