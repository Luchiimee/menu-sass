'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Product = {
  id: string;
  name: string;
  price: number;
  description?: string;
  image_url?: string;
};

type CartItem = Product & { quantity: number };

type CartContextType = {
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  total: number;
  cartRestaurantId: string | null;
  activeOrderId: string | null; // <--- NUEVO: ID del pedido actual para seguimiento
  setActiveOrderId: (id: string | null) => void; // <--- Para guardarlo
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartRestaurantId, setCartRestaurantId] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderIdState] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // 1. Cargar datos al inicio
  useEffect(() => {
    const savedCart = localStorage.getItem('snappy_cart');
    const savedRestId = localStorage.getItem('snappy_rest_id');
    const savedOrderId = localStorage.getItem('snappy_active_order_id'); // <--- RECUPERAR PEDIDO
    
    if (savedCart) setCart(JSON.parse(savedCart));
    if (savedRestId) setCartRestaurantId(savedRestId);
    if (savedOrderId) setActiveOrderIdState(savedOrderId);
    
    setMounted(true);
  }, []);

  // 2. Guardar datos al cambiar
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('snappy_cart', JSON.stringify(cart));
      
      if (cartRestaurantId) localStorage.setItem('snappy_rest_id', cartRestaurantId);
      else localStorage.removeItem('snappy_rest_id');

      if (activeOrderId) localStorage.setItem('snappy_active_order_id', activeOrderId);
      else localStorage.removeItem('snappy_active_order_id');
    }
  }, [cart, cartRestaurantId, activeOrderId, mounted]);

  const setActiveOrderId = (id: string | null) => {
      setActiveOrderIdState(id);
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
        const existing = prev.find((item) => item.id === productId);
        if (existing && existing.quantity > 1) {
            return prev.map((item) => item.id === productId ? { ...item, quantity: item.quantity - 1 } : item);
        }
        return prev.filter((item) => item.id !== productId);
    });
  };

  const clearCart = () => {
    setCart([]);
    // NO borramos activeOrderId aquí, porque el usuario puede querer ver el estado aunque el carrito esté vacío
    // Tampoco borramos el RestaurantID para no perder el contexto
    localStorage.removeItem('snappy_cart');
  };

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, total, cartRestaurantId, activeOrderId, setActiveOrderId }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart debe usarse dentro de CartProvider');
  return context;
};