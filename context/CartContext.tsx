'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type CartItem = {
  id: string;
  uniqueId: string;
  name: string;
  price: number;
  quantity: number;
  description?: string;
  image_url?: string;
  selectedExtrasName?: string;
};

type CartContextType = {
  cart: CartItem[];
  addItem: (product: any) => void;
  removeItem: (uniqueId: string) => void;
  updateQuantity: (uniqueId: string, quantity: number) => void; // <--- AGREGADO
  clearCart: () => void;
  total: number;
  cartRestaurantId: string | null;
  activeOrderId: string | null;
  setActiveOrderId: (id: string | null) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartRestaurantId, setCartRestaurantId] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderIdState] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedCart = localStorage.getItem('snappy_cart');
    const savedRestId = localStorage.getItem('snappy_rest_id');
    const savedOrderId = localStorage.getItem('snappy_active_order_id');
    
    if (savedCart) {
        try {
            setCart(JSON.parse(savedCart));
        } catch (e) {
            console.error("Error cargando carrito", e);
        }
    }
    if (savedRestId) setCartRestaurantId(savedRestId);
    if (savedOrderId) setActiveOrderIdState(savedOrderId);
    
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('snappy_cart', JSON.stringify(cart));
      if (cartRestaurantId) localStorage.setItem('snappy_rest_id', cartRestaurantId);
      if (activeOrderId) localStorage.setItem('snappy_active_order_id', activeOrderId);
    }
  }, [cart, cartRestaurantId, activeOrderId, mounted]);

  const setActiveOrderId = (id: string | null) => {
      setActiveOrderIdState(id);
  };

  const addItem = (product: any) => {
    setCart((prev) => {
      const productUniqueId = product.uniqueId || product.id;
      const existing = prev.find((item) => item.uniqueId === productUniqueId);

      if (existing) {
        return prev.map((item) =>
          item.uniqueId === productUniqueId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, uniqueId: productUniqueId, quantity: 1 }];
    });
  };

  // --- NUEVA FUNCIÓN updateQuantity ---
  const updateQuantity = (uniqueId: string, newQuantity: number) => {
    setCart((prev) => {
      if (newQuantity <= 0) {
        return prev.filter((item) => item.uniqueId !== uniqueId);
      }
      return prev.map((item) =>
        item.uniqueId === uniqueId ? { ...item, quantity: newQuantity } : item
      );
    });
  };

  const removeItem = (uniqueId: string) => {
    setCart((prev) => prev.filter((item) => item.uniqueId !== uniqueId));
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('snappy_cart');
  };

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ 
        cart, 
        addItem, 
        removeItem, 
        updateQuantity, // <--- AGREGADO
        clearCart, 
        total, 
        cartRestaurantId, 
        activeOrderId, 
        setActiveOrderId 
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart debe usarse dentro de CartProvider');
  return context;
};