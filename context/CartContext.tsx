'use client';

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  type CartExtra,
  cartTotal,
  mergeUnits,
  setLineExtra,
  addExtraToOneUnit as addExtraToOneUnitIn,
  productUnits as unitsOf,
  stepProduct as stepProductIn,
  productExtraCount as extraCountOf,
  stepProductExtra as stepProductExtraIn,
} from '@/lib/cartLines';

// Modelo por renglones: ver lib/cartLines.ts. extrasList[].quantity es "por
// unidad de producto"; cada combinación producto + extras es un renglón.

interface CartContextType {
  cart: any[];
  addToCart: (product: any) => void;
  addItem: (product: any, quantity: number, extras?: CartExtra[]) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (uniqueId: string, quantity: number) => void;
  updateExtraQuantity: (itemUniqueId: string, extraId: string, quantity: number, extraData?: Omit<CartExtra, 'quantity'>) => void;
  addExtraToOneUnit: (itemUniqueId: string, extra: Omit<CartExtra, 'quantity'>) => void;
  productUnits: (productId: any) => number;
  stepProduct: (product: any, delta: number) => void;
  productExtraCount: (productId: any, extraId: string) => number;
  stepProductExtra: (productId: any, extra: Omit<CartExtra, 'quantity'>, delta: number) => void;
  clearCart: () => void;
  total: number;
  cartRestaurantId: string | null;
  activeOrderId: string | null;
  setActiveOrderId: (id: string | null) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<any[]>([]);
  const [activeOrderId, setActiveOrderIdState] = useState<string | null>(null);
  // Contador incremental — nunca repite aunque se llame en el mismo milisegundo
  const counterRef = useRef(0);

  const generateUniqueId = (productId: string) => {
    counterRef.current += 1;
    return `${productId}-${counterRef.current}`;
  };

  // 1. RECUPERAR ID DEL PEDIDO (Solo en el cliente)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedOrderId = localStorage.getItem('snappy_active_order');
      if (savedOrderId) setActiveOrderIdState(savedOrderId);
    }
  }, []);

  // 2. GUARDAR ID EN LOCALSTORAGE
  const setActiveOrderId = (id: string | null) => {
    setActiveOrderIdState(id);
    if (typeof window !== 'undefined') {
      if (id) localStorage.setItem('snappy_active_order', id);
      else localStorage.removeItem('snappy_active_order');
    }
  };

  const cartRestaurantId = cart.length > 0 ? cart[0].restaurant_id : null;

  // Una unidad del producto sin extras. Compatibilidad: si viene con extraId
  // (llamadas de las plantillas), suma ese extra a UNA unidad del producto.
  const addToCart = (product: any) => {
    if (product.extraId) {
      const extra = { id: product.extraId, name: product.name, price: Number(product.price) };
      setCart((prev) => stepProductExtraIn(prev, product.id, extra, 1, generateUniqueId));
      return;
    }
    setCart((prev) => mergeUnits(prev, product, [], 1, generateUniqueId));
  };

  // `quantity` unidades del producto, cada una con estos extras (cantidades por unidad).
  const addItem = (product: any, quantity: number, extras: CartExtra[] = []) => {
    setCart((prev) => mergeUnits(prev, product, extras, quantity, generateUniqueId));
  };

  const removeFromCart = (uniqueId: string) => {
    setCart((prev) => prev.filter((item) => item.uniqueId !== uniqueId));
  };

  const updateQuantity = (uniqueId: string, quantity: number) => {
    setCart((prev) => {
      if (quantity < 1) return prev.filter((item) => item.uniqueId !== uniqueId);
      return prev.map((item) => item.uniqueId === uniqueId ? { ...item, quantity } : item);
    });
  };

  // Extra de UN renglón: con quantity > 1 separa una unidad (o la une a un
  // renglón idéntico); con quantity = 1 cambia el extra de esa unidad.
  const updateExtraQuantity = (
    itemUniqueId: string,
    extraId: string,
    quantity: number,
    extraData?: Omit<CartExtra, 'quantity'>
  ) => {
    setCart((prev) => setLineExtra(prev, itemUniqueId, extraId, quantity, generateUniqueId, extraData));
  };

  // "+ Agregar extra" del carrito: el extra va a UNA unidad del renglón
  const addExtraToOneUnit = (itemUniqueId: string, extra: Omit<CartExtra, 'quantity'>) => {
    setCart((prev) => addExtraToOneUnitIn(prev, itemUniqueId, extra, generateUniqueId));
  };

  // Helpers para plantillas con controles por producto (tarjeta)
  const productUnits = (productId: any) => unitsOf(cart, productId);
  const stepProduct = (product: any, delta: number) =>
    setCart((prev) => stepProductIn(prev, product, delta, generateUniqueId));
  const productExtraCount = (productId: any, extraId: string) => extraCountOf(cart, productId, extraId);
  const stepProductExtra = (productId: any, extra: Omit<CartExtra, 'quantity'>, delta: number) =>
    setCart((prev) => stepProductExtraIn(prev, productId, extra, delta, generateUniqueId));

  const clearCart = () => {
    setCart([]);
  };

  const total = cartTotal(cart);

  return (
    <CartContext.Provider value={{
      cart, addToCart, addItem, removeFromCart, updateQuantity, updateExtraQuantity, addExtraToOneUnit,
      productUnits, stepProduct, productExtraCount, stepProductExtra,
      clearCart, total, cartRestaurantId,
      activeOrderId, setActiveOrderId
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart debe usarse dentro de CartProvider');
  return context;
};
