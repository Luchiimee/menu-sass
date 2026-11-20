import React, { useState } from 'react';
import { Search, Plus, Minus, X, Info, MapPin, Tag, Utensils, Clock, Flame } from 'lucide-react';
import { getProductDisplayPrice } from '@/lib/productPricing';
import { getOptimizedImageUrl } from '@/lib/imageUtils';
import { useCart } from '@/context/CartContext';

// Selector − / cantidad / + (se usa para unidades, cantidades por peso y extras).
function Stepper({ value, onChange, min = 0, label, fg, bg, plusBg, plusFg }: { value: number; onChange: (n: number) => void; min?: number; label: string; fg: string; bg: string; plusBg: string; plusFg: string }) {
  return (
    <div className="flex items-center gap-1 rounded-full p-1 shrink-0" style={{ background: bg, border: '1px solid rgba(128,128,128,0.2)' }}>
      <button type="button" aria-label={`Quitar ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30" style={{ color: fg }}><Minus size={16} /></button>
      <span className="font-black text-sm w-6 text-center" style={{ color: fg }} aria-live="polite">{value}</span>
      <button type="button" aria-label={`Sumar ${label}`} onClick={() => onChange(value + 1)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: plusBg, color: plusFg }}><Plus size={16} /></button>
    </div>
  );
}

// Diseño "Portada": foto de portada grande, logo superpuesto, categorías en píldoras
// y tarjetas de producto en grilla de 2 columnas. Toda la lógica (carrito, variaciones,
// extras, info del local, mesa, local cerrado) es la misma que usan las demás plantillas.
export default function Portada({ restaurant, products, categories, fetchedExtras, onAddToCart, isOpen, isMockup = false, setShowInfo, mesaLabel = null }: any) {
  const { cart } = useCart();
  const getTotalQtyForProduct = (productId: any) =>
    cart.filter((item: any) => item.id === productId || String(item.id).startsWith(`${productId}-`)).reduce((sum: number, item: any) => sum + item.quantity, 0);

  const [showClosedModal, setShowClosedModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<any>('todos');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [extraQty, setExtraQty] = useState<Record<string, number>>({});
  const [variationsQuantities, setVariationsQuantities] = useState<{ [key: number]: number }>({});

  const displayCategories = categories?.filter((c: any) => c.name.toLowerCase() !== 'general') || [];
  const formatPrice = (price: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(price);

  // Colores: todos salen de Personalizar, con valores por defecto de la marca.
  const bg = restaurant.bg_color || '#F5F5EF';
  const text = restaurant.text_color || '#15160E';
  const accent = restaurant.theme_color || '#1BB179';
  const cardBg = restaurant.card_color || '#FFFFFF';
  const nameColor = restaurant.card_name_color || text;
  const descColor = restaurant.card_desc_color || '#86877B';
  const localDescColor = restaurant.description_color || descColor;
  const priceColor = restaurant.card_price_color || text;
  const btnBg = restaurant.card_btn_bg || accent;
  const btnText = restaurant.card_btn_text || '#FFFFFF';
  const catBg = restaurant.cat_bg_color || '#ECEBE3';
  const catText = restaurant.cat_text_color || text;
  const catActiveBg = restaurant.cat_active_bg_color || accent;
  const catActiveText = restaurant.cat_active_text_color || '#FFFFFF';
  const searchBg = restaurant.search_bg_color || '#ECEBE3';
  const searchIcon = restaurant.search_icon_color || '#86877B';
  const promoBg = restaurant.promo_bg_color || '#E4F6EE';
  const promoText = restaurant.promo_text_color || '#0F7A53';
  const showPromo = restaurant.show_promo !== false && !!restaurant.promo_message;
  const showBanner = restaurant.show_banner !== false && !!restaurant.banner_url;
  // La dirección es la misma que se carga en "Información y redes" y que muestra el ícono ⓘ.
  const location = (restaurant.address || '').trim();

  const styles = `
    .pt-root { background: ${bg}; color: ${text}; min-height: 100vh; padding-bottom: 120px; font-family: 'Inter', sans-serif; text-align: left; }
    .pt-root > * { flex-shrink: 0; }
    .pt-cover { position: relative; height: ${isMockup ? '120px' : '200px'}; background: ${accent}; overflow: hidden; }
    .pt-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .pt-cover::after { content: ''; position: absolute; inset: 0; background: linear-gradient(to top, ${bg} 0%, transparent 45%); }
    .pt-ident { padding: 0 20px; margin-top: ${showBanner ? '-34px' : '0'}; padding-top: ${showBanner ? '0' : '24px'}; position: relative; z-index: 2; }
    .pt-brand { display: flex; align-items: flex-end; justify-content: space-between; }
    .pt-logo { width: 68px; height: 68px; border-radius: 18px; background-color: ${cardBg}; background-size: cover; background-position: center; border: 3px solid ${bg}; box-shadow: 0 6px 18px rgba(0,0,0,.15); display: flex; align-items: center; justify-content: center; color: ${accent}; font-weight: 900; font-size: 22px; flex-shrink: 0; }
    .pt-pill { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; font-size: 11px; font-weight: 800; background: ${cardBg}; color: ${isOpen ? '#15803d' : '#b91c1c'}; border: 1px solid rgba(0,0,0,.06); margin-bottom: 4px; }
    .pt-dot { width: 7px; height: 7px; border-radius: 50%; background: ${isOpen ? '#22c55e' : '#ef4444'}; }
    .pt-title-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 14px; }
    .pt-title { font-size: ${isMockup ? '22px' : '28px'}; font-weight: 900; letter-spacing: -.02em; line-height: 1.05; margin: 0; color: ${text}; }
    .pt-info { width: 42px; height: 42px; border-radius: 50%; border: 1px solid rgba(0,0,0,.12); background: ${cardBg}; color: ${text}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .pt-desc { font-size: 13px; color: ${localDescColor}; margin: 8px 0 0; line-height: 1.4; }
    .pt-loc { display: flex; align-items: center; gap: 6px; font-size: 12px; color: ${localDescColor}; margin-top: 10px; }
    .pt-promo { display: flex; align-items: center; gap: 12px; margin: 16px 20px 0; padding: 14px; border-radius: 16px; background: ${promoBg}; color: ${promoText}; font-weight: 800; font-size: 13px; line-height: 1.3; }
    .pt-promo-ico { width: 34px; height: 34px; border-radius: 10px; border: 1px solid currentColor; opacity: .85; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .pt-mesa { display: flex; align-items: center; gap: 8px; margin-top: 16px; padding: 12px 20px; background: ${accent}; color: ${btnText}; font-size: 13px; font-weight: 800; }
    .pt-nav { position: sticky; top: 0; z-index: 30; background: ${bg}; padding: 14px 20px 10px; }
    .pt-search { display: flex; align-items: center; gap: 10px; background: ${searchBg}; border-radius: 14px; padding: 0 14px; height: 46px; }
    .pt-search input { flex: 1; background: transparent; border: 0; outline: 0; font-size: 14px; color: ${text}; min-width: 0; }
    .pt-chips { display: flex; gap: 8px; overflow-x: auto; padding: 12px 0 2px; scrollbar-width: none; }
    .pt-chips::-webkit-scrollbar { display: none; }
    .pt-chip { flex-shrink: 0; padding: 10px 18px; border-radius: 999px; font-size: 13px; font-weight: 600; border: 0; background: ${catBg}; color: ${catText}; white-space: nowrap; }
    .pt-chip[data-active="true"] { background: ${catActiveBg}; color: ${catActiveText}; }
    .pt-section { padding: 22px 20px 0; }
    .pt-section-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 12px; }
    .pt-section-title { font-size: 20px; font-weight: 900; letter-spacing: -.01em; margin: 0; color: ${text}; }
    .pt-count { font-size: 11px; color: ${descColor}; }
    .pt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .pt-card { background: ${cardBg}; border-radius: 18px; overflow: hidden; display: flex; flex-direction: column; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,.05); }
    .pt-photo { position: relative; aspect-ratio: 4 / 3; background: ${catBg}; display: flex; align-items: center; justify-content: center; overflow: hidden; color: ${descColor}; }
    .pt-photo img, .pt-photo video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    .pt-badge { position: absolute; top: 8px; left: 8px; z-index: 2; display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 8px; background: ${accent}; color: ${btnText}; font-size: 9px; font-weight: 900; letter-spacing: .06em; }
    .pt-qty { position: absolute; top: 8px; right: 8px; z-index: 2; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 999px; background: #FF4D3D; color: #fff; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; border: 2px solid ${cardBg}; }
    .pt-body { padding: 12px; display: flex; flex-direction: column; flex: 1; }
    .pt-name { font-size: 14px; font-weight: 800; color: ${nameColor}; line-height: 1.2; }
    .pt-pdesc { font-size: 11px; color: ${descColor}; margin-top: 4px; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .pt-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 10px; gap: 6px; }
    .pt-price { font-size: 14px; font-weight: 900; color: ${priceColor}; }
    .pt-from { display: block; font-size: 9px; font-weight: 700; color: ${descColor}; text-transform: uppercase; letter-spacing: .04em; }
    .pt-add { width: 34px; height: 34px; border-radius: 50%; background: ${btnBg}; color: ${btnText}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .pt-empty { padding: 40px 20px; text-align: center; color: ${descColor}; font-size: 14px; }
  `;

  const openProduct = (p: any) => {
    if (!isOpen && !isMockup) return setShowClosedModal(true);
    setSelectedProduct(p);
    setQuantity(1);
    setExtraQty({});
    setVariationsQuantities({});
  };

  const matchesSearch = (p: any) => (p.name || '').toLowerCase().includes(searchTerm.toLowerCase());

  // Grupos a mostrar: una sección por categoría + (en "Todos") una al final para productos sin categoría visible.
  const visibleCats = selectedCategory === 'todos' ? displayCategories : displayCategories.filter((c: any) => String(c.id) === String(selectedCategory));
  const sections: { id: string; name: string; items: any[] }[] = visibleCats
    .map((c: any) => ({ id: String(c.id), name: c.name, items: (products || []).filter((p: any) => String(p.category_id) === String(c.id) && matchesSearch(p)) }))
    .filter((s: any) => s.items.length > 0);
  if (selectedCategory === 'todos') {
    const known = new Set(displayCategories.map((c: any) => String(c.id)));
    const loose = (products || []).filter((p: any) => !known.has(String(p.category_id)) && matchesSearch(p));
    if (loose.length > 0) sections.push({ id: '__otros', name: displayCategories.length > 0 ? 'Más para elegir' : 'Menú', items: loose });
  }
  const finalSections = isMockup ? sections.slice(0, 1).map(s => ({ ...s, items: s.items.slice(0, 4) })) : sections;

  const extrasDelProducto = selectedProduct
    ? (fetchedExtras || []).filter((ex: any) => ex.product_extras?.some((re: any) => String(re.product_id) === String(selectedProduct.id)))
    : [];
  const isPeso = selectedProduct?.sale_type === 'peso' && selectedProduct?.variations?.length > 0;
  // Extras con cantidad: cada extra se suma "por unidad" del producto (el carrito ya lo maneja así).
  const extrasElegidos = extrasDelProducto
    .map((ex: any) => ({ ...ex, qty: extraQty[String(ex.id)] || 0 }))
    .filter((ex: any) => ex.qty > 0);
  const extrasPorUnidad = extrasElegidos.reduce((sum: number, ex: any) => sum + Number(ex.price) * ex.qty, 0);
  const totalModal = !selectedProduct
    ? 0
    : isPeso
      ? Object.entries(variationsQuantities).reduce((sum, [idx, q]) => sum + (Number(selectedProduct.variations[Number(idx)]?.price) + extrasPorUnidad) * q, 0)
      : (Number(selectedProduct.price) + extrasPorUnidad) * quantity;

  const confirmar = () => {
    if (!isOpen && !isMockup) return setShowClosedModal(true);
    const extrasPayload = extrasElegidos.map((ex: any) => ({ id: ex.id, name: ex.name, price: Number(ex.price), quantity: ex.qty }));
    if (isPeso) {
      Object.entries(variationsQuantities).forEach(([idx, qty]) => {
        if (qty > 0) {
          const variation = selectedProduct.variations[Number(idx)];
          onAddToCart(
            { ...selectedProduct, id: `${selectedProduct.id}-${idx}`, name: `${selectedProduct.name} (${variation.label})`, price: Number(variation.price) },
            qty,
            extrasPayload,
          );
        }
      });
    } else {
      onAddToCart(selectedProduct, quantity, extrasPayload);
    }
    setSelectedProduct(null);
  };
  const cerrarModal = () => { setSelectedProduct(null); setQuantity(1); setVariationsQuantities({}); setExtraQty({}); };
  const hayCantidadElegida = !isPeso || Object.values(variationsQuantities).some((q) => q > 0);

  return (
    <div className="pt-root">
      <style>{styles}</style>

      {showBanner && (
        <div className="pt-cover">
          <img src={getOptimizedImageUrl(restaurant.banner_url, 900, 75)} alt={restaurant.name || ''} />
        </div>
      )}

      <header className="pt-ident">
        <div className="pt-brand">
          <div className="pt-logo" style={restaurant.logo_url ? { backgroundImage: `url("${getOptimizedImageUrl(restaurant.logo_url, 200, 80, 200, 'cover')}")` } : {}}>
            {!restaurant.logo_url && (restaurant.name || 'S').trim().charAt(0).toUpperCase()}
          </div>
          <span className="pt-pill"><span className="pt-dot" />{isOpen ? 'Abierto ahora' : 'Cerrado'}</span>
        </div>
        <div className="pt-title-row">
          <h1 className="pt-title">{restaurant.name || 'Tu Negocio'}</h1>
          <button type="button" className="pt-info" aria-label="Información del local" onClick={() => setShowInfo(true)}><Info size={20} /></button>
        </div>
        {restaurant.description && <p className="pt-desc">{restaurant.description}</p>}
        {location && <div className="pt-loc"><MapPin size={14} /><span>{location}</span></div>}
      </header>

      {showPromo && (
        <aside className="pt-promo">
          <div className="pt-promo-ico"><Tag size={16} /></div>
          <div>{restaurant.promo_message}</div>
        </aside>
      )}

      {mesaLabel && <div className="pt-mesa"><Utensils size={16} /><span>Estás pidiendo desde {mesaLabel}</span></div>}

      <nav className="pt-nav" aria-label="Buscar y filtrar productos">
        <div className="pt-search">
          <Search size={17} style={{ color: searchIcon }} />
          <input type="text" placeholder="¿Qué te tentó hoy?" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} aria-label="Buscar productos" />
          {searchTerm && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setSearchTerm('')} style={{ color: searchIcon }}><X size={16} /></button>}
        </div>
        <div className="pt-chips">
          <button type="button" className="pt-chip" data-active={selectedCategory === 'todos'} onClick={() => setSelectedCategory('todos')}>Todos</button>
          {displayCategories.map((cat: any) => (
            <button key={cat.id} type="button" className="pt-chip" data-active={String(selectedCategory) === String(cat.id)} onClick={() => setSelectedCategory(cat.id)}>{cat.name}</button>
          ))}
        </div>
      </nav>

      {finalSections.length === 0 && <div className="pt-empty">{searchTerm ? 'No encontramos ese antojo. Probá con otro nombre.' : 'Todavía no hay productos cargados.'}</div>}

      {finalSections.map((section) => (
        <section className="pt-section" key={section.id}>
          <div className="pt-section-head">
            <h2 className="pt-section-title">{section.name}</h2>
            <span className="pt-count">{section.items.length} {section.items.length === 1 ? 'opción' : 'opciones'}</span>
          </div>
          <div className="pt-grid">
            {section.items.map((p: any) => {
              const count = getTotalQtyForProduct(p.id);
              const { amount, isFrom } = getProductDisplayPrice(p);
              return (
                <article className="pt-card" key={p.id} onClick={() => openProduct(p)}>
                  <div className="pt-photo">
                    {p.video_url ? (
                      <video autoPlay={!isMockup} loop={!isMockup} muted playsInline preload="metadata"><source src={p.video_url} /></video>
                    ) : p.image_url ? (
                      <img src={getOptimizedImageUrl(p.image_url, 400, 70)} alt={p.name} loading="lazy" />
                    ) : (
                      <Utensils size={30} strokeWidth={1.3} />
                    )}
                    {p.es_destacado && <span className="pt-badge"><Flame size={10} />DESTACADO</span>}
                    {count > 0 && <span className="pt-qty">{count}</span>}
                  </div>
                  <div className="pt-body">
                    <div className="pt-name">{p.name}</div>
                    {p.description && <div className="pt-pdesc">{p.description}</div>}
                    <div className="pt-bottom">
                      <span className="pt-price">{isFrom && <span className="pt-from">Desde</span>}{formatPrice(amount)}</span>
                      <span className="pt-add"><Plus size={18} strokeWidth={2.6} /></span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      {/* MODAL DE PRODUCTO */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={cerrarModal}>
          <div role="dialog" aria-modal="true" aria-label={selectedProduct.name} className="relative w-full max-w-md rounded-t-[1.75rem] sm:rounded-[1.75rem] overflow-hidden shadow-2xl flex flex-col" style={{ background: bg, color: text, maxHeight: '92vh' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <h2 className="text-lg font-black">Elegí a tu gusto</h2>
              <button type="button" onClick={cerrarModal} aria-label="Cerrar" className="p-2 rounded-full" style={{ background: cardBg, color: text }}><X size={18} /></button>
            </div>
            <div className="overflow-y-auto flex-1">
              <div className="relative w-full overflow-hidden flex items-center justify-center" style={{ background: catBg, aspectRatio: '16 / 10' }}>
                {selectedProduct.video_url ? (
                  <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover"><source src={selectedProduct.video_url} /></video>
                ) : selectedProduct.image_url ? (
                  <img src={getOptimizedImageUrl(selectedProduct.image_url, 800, 75)} className="w-full h-full object-cover" alt={selectedProduct.name} />
                ) : (
                  <Utensils size={64} strokeWidth={1} style={{ color: descColor, opacity: 0.5 }} />
                )}
              </div>
              <div className="px-5 pt-5 pb-3">
                <h3 className="text-2xl font-black leading-tight" style={{ color: nameColor }}>{selectedProduct.name}</h3>
                {selectedProduct.description && <p className="text-sm leading-relaxed mt-2" style={{ color: descColor }}>{selectedProduct.description}</p>}
                {!isPeso && <div className="text-xl font-black mt-4" style={{ color: priceColor }}>{formatPrice(selectedProduct.price)}</div>}

                {isPeso && (
                  <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(128,128,128,0.2)' }}>
                    <div className="flex items-baseline justify-between mb-3">
                      <h4 className="text-sm font-black">Elegí las cantidades</h4>
                      <span className="text-[11px]" style={{ color: descColor }}>Obligatorio</span>
                    </div>
                    <div className="space-y-3">
                      {selectedProduct.variations.map((v: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold" style={{ color: nameColor }}>{v.label}</p>
                            <p className="text-xs" style={{ color: descColor }}>{formatPrice(v.price)}</p>
                          </div>
                          <Stepper value={variationsQuantities[idx] || 0} label={v.label} fg={text} bg={cardBg} plusBg={btnBg} plusFg={btnText} onChange={(n) => setVariationsQuantities({ ...variationsQuantities, [idx]: n })} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {extrasDelProducto.length > 0 && (
                  <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(128,128,128,0.2)' }}>
                    <div className="flex items-baseline justify-between mb-3">
                      <h4 className="text-sm font-black">Hacelo más tuyo</h4>
                      <span className="text-[11px]" style={{ color: descColor }}>Opcional</span>
                    </div>
                    <div className="space-y-3">
                      {extrasDelProducto.map((ex: any) => (
                        <div key={ex.id} className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold" style={{ color: nameColor }}>{ex.name}</p>
                            <p className="text-xs" style={{ color: descColor }}>+{formatPrice(ex.price)} por unidad</p>
                          </div>
                          <Stepper value={extraQty[String(ex.id)] || 0} label={ex.name} fg={text} bg={cardBg} plusBg={btnBg} plusFg={btnText} onChange={(n) => setExtraQty({ ...extraQty, [String(ex.id)]: n })} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderTop: '1px solid rgba(128,128,128,0.2)', background: bg }}>
              {!isPeso && <Stepper value={quantity} min={1} label="unidades" fg={text} bg={cardBg} plusBg={btnBg} plusFg={btnText} onChange={setQuantity} />}
              <button type="button" disabled={!hayCantidadElegida} onClick={confirmar} className="flex-1 flex items-center justify-between px-5 py-4 rounded-2xl font-black text-sm active:scale-95 transition-all disabled:opacity-40" style={{ background: btnBg, color: btnText }}>
                <span>Agregar</span>
                <span>{formatPrice(totalModal)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LOCAL CERRADO */}
      {showClosedModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowClosedModal(false)} />
          <div className="w-full max-w-xs p-8 rounded-[2rem] shadow-2xl text-center relative" style={{ background: bg, color: text }}>
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4" style={{ background: cardBg, color: '#ef4444' }}>
              <Clock size={32} strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-black leading-none">Local cerrado</h3>
            <p className="text-xs mt-3 leading-relaxed" style={{ color: descColor }}>
              Ahora estamos fuera de nuestro horario de atención.<br />Podés ver el menú, pero no hacer pedidos.
            </p>
            <button type="button" onClick={() => setShowClosedModal(false)} className="mt-6 w-full py-4 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all" style={{ background: btnBg, color: btnText }}>
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
