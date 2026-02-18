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

  const addToCart = (product: any) => {
    setCart((prev) => {
      // CASO 1: ES UN EXTRA (Mantenemos tu lógica para los adicionales)
      if (product.extraId) {
        const newCart = [...prev];
        // Buscamos el último item que coincida con el ID padre
        const parentIndex = [...newCart].reverse().findIndex((item) => item.id === product.id);
        
        if (parentIndex !== -1) {
            const actualIndex = newCart.length - 1 - parentIndex;
            const parentItem = { ...newCart[actualIndex] };
            
            const currentExtras = parentItem.extrasList || [];
            const existingExtraIndex = currentExtras.findIndex((ex: any) => ex.id === product.extraId);
            const updatedExtras = [...currentExtras];

            if (existingExtraIndex >= 0) {
                updatedExtras[existingExtraIndex].quantity += 1;
            } else {
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
        return prev;
      }

      // --- CASO 2: PRODUCTO PRINCIPAL (CORREGIDO PARA UNIFICAR) ---
      // Buscamos si ya existe el producto base en el carrito (sin contar los que ya tienen extras)
      const existingItemIndex = prev.findIndex((item) => 
        item.id === product.id && (!item.extrasList || item.extrasList.length === 0)
      );

      if (existingItemIndex !== -1) {
        // Si existe, mapeamos el carrito y sumamos 1 a la cantidad del producto encontrado
        return prev.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: (item.quantity || 1) + 1 }
            : item
        );
      }

      // Si es un producto nuevo, lo agregamos con cantidad 1
      // Usamos el ID del producto como uniqueId para que sea estable
      const newItem = { 
        ...product, 
        uniqueId: `${product.id}-${Date.now()}`, 
        quantity: 1, 
        extrasList: [] 
      };
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
        const currentExtras = item.extrasList || [];
        
        const extrasList = quantity <= 0 
            ? currentExtras.filter((ex: any) => ex.id !== extraId)
            : currentExtras.map((ex: any) => ex.id === extraId ? { ...ex, quantity } : ex);
            
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