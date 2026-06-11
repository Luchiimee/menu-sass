export type ProductVariation = { label: string; price: string | number; is_featured?: boolean };

export type ProductPriceInfo = {
  amount: number;
  isFrom: boolean;
};

type ProductLike = {
  price?: string | number;
  sale_type?: string;
  variations?: ProductVariation[];
};

/**
 * Determina el precio a mostrar para un producto según su sale_type.
 * - 'peso': usa la variación destacada (is_featured), o si no hay, el menor precio
 *   entre las variaciones (marcando isFrom=true si hay más de una opción).
 * - 'unidad' (o sin sale_type): precio único del producto.
 */
export function getProductDisplayPrice(p: ProductLike | null | undefined): ProductPriceInfo {
  const variations: ProductVariation[] = p?.variations || [];

  if (p?.sale_type === 'peso' && variations.length > 0) {
    const featured = variations.find((v) => v.is_featured);
    if (featured) return { amount: Number(featured.price), isFrom: false };

    const min = Math.min(...variations.map((v) => Number(v.price)));
    return { amount: min, isFrom: variations.length > 1 };
  }

  return { amount: Number(p?.price) || 0, isFrom: false };
}
