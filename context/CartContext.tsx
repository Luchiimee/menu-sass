'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface CartContextType {
  cart: any[];
  addToCart: (product: any) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (uniqueId: string, quantity: number) => void;
  updateExtraQuantity: (itemUniqueId: string, extraId: string, quantity: number) => void;
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

  // 1. RECUPERAR ID DEL PEDIDO
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const savedOrderId = localStorage.getItem('snappy_active_order');
        if (savedOrderId) setActiveOrderIdState(savedOrderId);
    }
  }, []);

  // 2. GUARDAR ID EN LOCALSTORAGE
  const setActiveOrderId = (id: string | null) => {
      setActiveOrderIdState(id);
      if (id) localStorage.setItem('snappy_active_order', id);
      else localStorage.removeItem('snappy_active_order');
  };

  const cartRestaurantId = cart.length > 0 ? cart[0].restaurant_id : null;

  // --- FUNCIÓN CLAVE CORREGIDA ---
  const addToCart = (product: any) => {
    setCart((prev) => {
      
      // CASO 1: ES UN EXTRA (Tiene extraId)
      // Buscamos el último producto agregado que coincida con el ID del padre (product.id)
      if (product.extraId) {
        // Hacemos una copia del carrito
        const newCart = [...prev];
        
        // Buscamos de atrás para adelante el padre (para sumarselo al último que agregaste)
        const parentIndex = [...newCart].reverse().findIndex((item) => item.id === product.id);
        
        // Si encontramos al padre
        if (parentIndex !== -1) {
            const actualIndex = newCart.length - 1 - parentIndex;
            const parentItem = { ...newCart[actualIndex] };
            
            // Verificamos si ya tiene este extra
            const existingExtraIndex = parentItem.extrasList.findIndex((ex: any) => ex.id === product.extraId);

            const updatedExtras = [...parentItem.extrasList];

            if (existingExtraIndex >= 0) {
                // Si ya existe, sumamos 1
                updatedExtras[existingExtraIndex].quantity += 1;
            } else {
                // Si no existe, lo creamos
                updatedExtras.push({
                    id: product.extraId,
                    name: product.name,
                    price: product.price,
                    quantity: 1
                });
            }

            parentItem.extrasList = updatedExtras;
            newCart[actualIndex] = parentItem;
            return newCart;
        }
        // Si no encuentra padre (raro), no hace nada o lo agrega aparte (mejor no hacer nada para evitar errores)
        return prev;
      }

      // CASO 2: ES UN PRODUCTO PRINCIPAL (Pizza, Burger, etc.)
      const uniqueId = `${product.id}-${Date.now()}`;
      // IMPORTANTE: Inicializamos extrasList vacío
      const newItem = { ...product, uniqueId, quantity: 1, extrasList: [] };
      return [...prev, newItem];
    });
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

  const updateExtraQuantity = (itemUniqueId: string, extraId: string, quantity: number) => {
    setCart((prev) => 
      prev.map((item) => {
        if (item.uniqueId !== itemUniqueId) return item;
        // Si la cantidad es 0, filtramos el extra (lo borramos), si no, actualizamos
        const extrasList = quantity <= 0 
            ? item.extrasList.filter((ex: any) => ex.id !== extraId)
            : item.extrasList.map((ex: any) => ex.id === extraId ? { ...ex, quantity } : ex);
            
        return { ...item, extrasList };
      })
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const total = cart.reduce((acc, item) => {
    const extrasTotal = (item.extrasList || []).reduce((a: number, b: any) => a + (b.price * b.quantity), 0);
    return acc + (item.price + extrasTotal) * item.quantity;
  }, 0);

  return (
    <CartContext.Provider value={{ 
        cart, addToCart, removeFromCart, updateQuantity, updateExtraQuantity, clearCart, total, cartRestaurantId,
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