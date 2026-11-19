// Páginas por rubro (/menu-digital/<rubro>) para que Google las muestre a quien busca "menú digital para <rubro>".
// Datos puros, sin imports con alias: scripts/check-rubros.mjs.
//
// REGLA: cada texto de acá solo puede decir lo que Snappy ya dice (y hace) en la home. Las "piezas" (FEATURES) son la
// única fuente de afirmaciones sobre el producto; cada rubro elige cuáles mostrar y cambia el enfoque, no inventa funciones.

export type Feature = { title: string; text: string };

// Afirmaciones sobre el producto, tomadas de la home (app/page.tsx) y de las condiciones.
export const FEATURES = {
  menu: {
    title: 'Tu menú, siempre actualizado',
    text: 'Creá y editá tu catálogo desde el panel. Tus clientes lo ven desde el celular, sin apps ni PDFs. Categorizá, agregá fotos y precios en minutos.',
  },
  qr: {
    title: 'QR propio para pedir sin esperar',
    text: 'Cada punto de venta tiene su propio QR. El cliente escanea, elige lo que quiere y el pedido llega directo al panel.',
  },
  pedidos: {
    title: 'Pedidos al panel en tiempo real',
    text: 'Los pedidos llegan a tu panel sin recargar, sin llamadas ni mensajes sueltos. Vos aceptás el pedido desde ahí.',
  },
  seguimiento: {
    title: 'Seguimiento del pedido en vivo',
    text: 'Tu cliente ve en qué estado está su pedido: enviado, confirmado, en preparación y entregado o listo para retirar.',
  },
  modalidades: {
    title: 'Delivery, takeaway y mesa',
    text: 'Tu menú atiende los tres modos de pedido: delivery, retiro en el local y pedido desde la mesa.',
  },
  reservas: {
    title: 'Reservas sin llamadas',
    text: 'Tus clientes reservan su turno o mesa desde el menú. Vos confirmás o rechazás desde el panel y ellos reciben la confirmación.',
  },
  mp: {
    title: 'Pago online con Mercado Pago',
    text: 'Tu cliente paga en el checkout del menú y el pedido llega pagado a tu panel. El envío por zonas ya viene incluido en el total.',
  },
  cupones: {
    title: 'Descuentos y cupones',
    text: 'Creá códigos de descuento por porcentaje o monto fijo, con fecha de vencimiento y límite de usos. Disponible en el plan Go en adelante.',
  },
  peso: {
    title: 'Productos por peso o por unidad',
    text: 'Cargá cada producto como se vende: por peso o por unidad, con categorías, fotos y precio.',
  },
  whatsapp: {
    title: 'Pedidos por WhatsApp o panel propio',
    text: 'Elegí cómo querés recibir los pedidos: por WhatsApp o en tu propio panel, en tiempo real.',
  },
  links: {
    title: 'SnappyLinks: todos tus links en un solo lugar',
    text: 'Además de tu menú, tenés una página de links propia, con tus colores, logo y fondo, ideal para Instagram.',
  },
  disponible: {
    title: 'Catálogo disponible las 24 horas',
    text: 'Tu catálogo está disponible todo el día: tus clientes ven productos y precios y pueden pedir sin que estés pegado al teléfono.',
  },
} satisfies Record<string, Feature>;

export type FeatureKey = keyof typeof FEATURES;

export type Rubro = {
  slug: string;
  nombre: string;          // "restaurantes"
  h1: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  dolor: { title: string; text: string };
  features: FeatureKey[];
  vertical: 'gastronomia' | 'kiosco' | 'dietetica';
};

export const RUBROS: Rubro[] = [
  {
    slug: 'restaurantes', nombre: 'restaurantes', vertical: 'gastronomia',
    h1: 'Menú digital para restaurantes',
    metaTitle: 'Menú digital para restaurantes con pedidos y reservas | Snappy',
    metaDescription: 'Armá el menú digital de tu restaurante: QR por mesa, pedidos en tiempo real, reservas online y pago con Mercado Pago. Sin comisión por ventas. Probá gratis 14 días.',
    intro: 'Un menú que tus clientes abren desde el celular, con QR por mesa, pedidos que llegan al panel y reservas online. Sin comisión por ventas.',
    dolor: { title: 'Menos errores de comanda, más mesas atendidas', text: 'Cuando el cliente pide desde su celular, el pedido llega escrito al panel: no hay que anotar a mano ni repetir en cocina. Vos editás precios y productos cuando quieras, sin reimprimir cartas.' },
    features: ['menu', 'qr', 'pedidos', 'reservas', 'modalidades', 'mp'],
  },
  {
    slug: 'bares-y-cafeterias', nombre: 'bares y cafeterías', vertical: 'gastronomia',
    h1: 'Menú digital para bares y cafeterías',
    metaTitle: 'Menú digital para bares y cafeterías con QR por mesa | Snappy',
    metaDescription: 'Menú digital con QR para tu bar o cafetería: tus clientes piden desde la mesa, vos recibís los pedidos en el panel y podés tomar reservas. Probá gratis 14 días.',
    intro: 'Que tus clientes pidan desde la mesa escaneando un QR, y que tu equipo reciba cada pedido en el panel al instante.',
    dolor: { title: 'Atendé más mesas sin correr de una a otra', text: 'El cliente escanea, elige y pide sin esperar al mozo. Vos mantenés la carta al día desde el panel: cambiá un precio o sacá un producto en minutos.' },
    features: ['menu', 'qr', 'pedidos', 'seguimiento', 'reservas', 'links'],
  },
  {
    slug: 'hamburgueserias', nombre: 'hamburgueserías', vertical: 'gastronomia',
    h1: 'Menú digital para hamburgueserías',
    metaTitle: 'Menú digital para hamburgueserías con delivery y takeaway | Snappy',
    metaDescription: 'Vendé más desde tu menú digital: pedidos de delivery, takeaway y mesa en tu panel, pago online con Mercado Pago y cupones. Sin comisión por ventas. Probá gratis.',
    intro: 'Recibí pedidos de delivery, takeaway y mesa en un solo panel, con pago online y sin pagar comisión por cada venta.',
    dolor: { title: 'Tus pedidos propios, sin intermediarios', text: 'Con tu propio menú el cliente te pide directo a vos: el pedido llega ordenado al panel y no pagás comisión por ventas.' },
    features: ['pedidos', 'modalidades', 'mp', 'cupones', 'seguimiento', 'menu'],
  },
  {
    slug: 'pizzerias', nombre: 'pizzerías', vertical: 'gastronomia',
    h1: 'Menú digital para pizzerías',
    metaTitle: 'Menú digital para pizzerías: pedidos online sin comisión | Snappy',
    metaDescription: 'Menú digital para tu pizzería: tus clientes piden desde el celular, los pedidos llegan al panel en tiempo real y pueden pagar online. Sin comisión. Probá gratis 14 días.',
    intro: 'Tu carta de pizzas, empanadas y bebidas en un link, con pedidos que llegan al panel y el seguimiento en vivo para tu cliente.',
    dolor: { title: 'Dejá de tomar pedidos por mensaje', text: 'En la noche de más pedidos, cada uno llega al panel ya armado, con el modo de entrega elegido. Tu cliente ve el estado sin tener que preguntar.' },
    features: ['menu', 'pedidos', 'modalidades', 'seguimiento', 'mp', 'cupones'],
  },
  {
    slug: 'kioscos', nombre: 'kioscos', vertical: 'kiosco',
    h1: 'Menú digital para kioscos',
    metaTitle: 'Menú digital para kioscos: catálogo y pedidos por WhatsApp | Snappy',
    metaDescription: 'Catálogo digital para tu kiosco con fotos y precios, pedidos por WhatsApp o en tu panel y tu página de links. Vendé sin estar pegado al teléfono. Probá gratis 14 días.',
    intro: 'Un catálogo con fotos y precios que tus clientes abren desde el celular, con pedidos por WhatsApp o en tu propio panel.',
    dolor: { title: 'Vendé sin estar pegado al teléfono', text: 'Tus clientes ven qué tenés y cuánto sale sin preguntarte por mensaje. Actualizás precios y productos desde el panel cuando cambian.' },
    features: ['menu', 'whatsapp', 'disponible', 'pedidos', 'links'],
  },
  {
    slug: 'dieteticas-y-verdulerias', nombre: 'dietéticas y verdulerías', vertical: 'dietetica',
    h1: 'Menú digital para dietéticas y verdulerías',
    metaTitle: 'Menú digital para dietéticas y verdulerías por peso | Snappy',
    metaDescription: 'Catálogo online para tu dietética o verdulería: productos por peso o por unidad, categorías y fotos, y pedidos al panel sin llamadas. Probá gratis 14 días.',
    intro: 'Cargá tus productos por peso o por unidad, mantené los precios del día al día y recibí los pedidos en el panel.',
    dolor: { title: 'Precios y stock del día, en un clic', text: 'Cuando cambian los precios, los actualizás en el panel y tus clientes ven el catálogo al día. Los pedidos llegan sin llamadas ni mensajes.' },
    features: ['peso', 'menu', 'pedidos', 'links', 'mp'],
  },
  {
    slug: 'heladerias', nombre: 'heladerías', vertical: 'dietetica',
    h1: 'Menú digital para heladerías',
    metaTitle: 'Menú digital para heladerías con pedidos online | Snappy',
    metaDescription: 'Mostrá tus sabores, potes y postres en un menú digital con fotos y precios, y recibí pedidos en tu panel. Sin comisión por ventas. Probá gratis 14 días.',
    intro: 'Tus sabores, potes y postres con fotos y precios en un link, y los pedidos directo en tu panel.',
    dolor: { title: 'Mostrá tus productos como se ven en la vitrina', text: 'Con fotos y categorías, tus clientes eligen desde el celular. Cuando cambia un sabor o un precio, lo editás en el panel y listo.' },
    features: ['menu', 'peso', 'pedidos', 'seguimiento', 'links'],
  },
  {
    slug: 'panaderias', nombre: 'panaderías', vertical: 'dietetica',
    h1: 'Menú digital para panaderías',
    metaTitle: 'Catálogo digital para panaderías con pedidos online | Snappy',
    metaDescription: 'Catálogo online para tu panadería: productos por peso o unidad con fotos y precios, y pedidos al panel sin llamadas ni mensajes. Probá gratis 14 días.',
    intro: 'Tu catálogo de pan, facturas y tortas con fotos y precios, y pedidos que llegan al panel sin llamadas.',
    dolor: { title: 'Pedidos anticipados sin pasar el día en el teléfono', text: 'Tus clientes eligen desde el celular y el pedido llega ordenado a tu panel. Los precios los cambiás vos, cuando quieras.' },
    features: ['menu', 'peso', 'pedidos', 'modalidades', 'links'],
  },
];

export const rubroBySlug = (slug: string): Rubro | undefined => RUBROS.find((r) => r.slug === slug);

export const RUBRO_PATH = (slug: string) => `/menu-digital/${slug}`;

// Pasos para empezar (el mismo para todos): lo que se hace de verdad al registrarse.
export const PASOS: { title: string; text: string }[] = [
  { title: 'Creá tu cuenta', text: 'Te registrás y probás Snappy gratis 14 días.' },
  { title: 'Cargá tu catálogo', text: 'Agregás categorías, productos, fotos y precios desde el panel.' },
  { title: 'Compartí tu link', text: 'Tus clientes abren tu menú desde el celular y te hacen pedidos.' },
];
