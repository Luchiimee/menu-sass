'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ExtraItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type CartItem = {
  id: string;
  uniqueId: string;
  name: string;
  price: number;
  quantity: number;
  description?: string;
  image_url?: string;
  extrasList: ExtraItem[]; // Lista de extras vinculados
};

type CartContextType = {
  cart: CartItem[];
  addItem: (product: any, isExtra?: boolean) => void;
  removeItem: (uniqueId: string) => void;
  updateQuantity: (uniqueId: string, quantity: number) => void;
  updateExtraQuantity: (productUniqueId: string, extraId: string, newQty: number) => void;
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
    if (savedCart) {
        try { setCart(JSON.parse(savedCart)); } catch (e) { console.error(e); }
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) localStorage.setItem('snappy_cart', JSON.stringify(cart));
  }, [cart, mounted]);

  const addItem = (product: any, isExtra: boolean = false) => {
    setCart((prev) => {
      if (isExtra) {
        // Buscamos el último producto base agregado
        const lastIndex = [...prev].reverse().findIndex(item => item.id === product.id);
        if (lastIndex === -1) return prev;

        const actualIndex = prev.length - 1 - lastIndex;
        return prev.map((item, idx) => {
          if (idx === actualIndex) {
            const currentExtras = item.extrasList || [];
            const existingExtra = currentExtras.find(e => e.id === product.extraId);

            let newExtras;
            if (existingExtra) {
              newExtras = currentExtras.map(e =>
                e.id === product.extraId ? { ...e, quantity: e.quantity + 1 } : e
              );
            } else {
              newExtras = [...currentExtras, { id: product.extraId, name: product.name, price: product.price, quantity: 1 }];
            }
            return { ...item, extrasList: newExtras };
          }
          return item;
        });
      } else {
        // Producto base: Siempre crea una línea nueva con ID único temporal
        const newUniqueId = `${product.id}-${Date.now()}`;
        return [...prev, { ...product, uniqueId: newUniqueId, quantity: 1, extrasList: [] }];
      }
    });
  };

  const updateQuantity = (uniqueId: string, newQuantity: number) => {
    setCart((prev) => {
      if (newQuantity <= 0) return prev.filter((item) => item.uniqueId !== uniqueId);
      return prev.map((item) => item.uniqueId === uniqueId ? { ...item, quantity: newQuantity } : item);
    });
  };

  const updateExtraQuantity = (productUniqueId: string, extraId: string, newQty: number) => {
    setCart((prev) => prev.map(item => {
      if (item.uniqueId === productUniqueId) {
        const newExtras = item.extrasList.map(e => 
          e.id === extraId ? { ...e, quantity: newQty } : e
        ).filter(e => e.quantity > 0);
        return { ...item, extrasList: newExtras };
      }
      return item;
    }));
  };

  const removeItem = (uniqueId: string) => {
    setCart((prev) => prev.filter((item) => item.uniqueId !== uniqueId));
  };

  const clearCart = () => setCart([]);

const calculateTotal = () => {
    return cart.reduce((acc, item) => {
      // Agregamos el "?" y el "|| []" por seguridad
      const extrasTotal = (item.extrasList || []).reduce((a, b) => a + (b.price * b.quantity), 0);
      return acc + (item.price + extrasTotal) * item.quantity;
    }, 0);
  };

  return (
    <CartContext.Provider value={{ 
        cart, addItem, removeItem, updateQuantity, updateExtraQuantity, 
        clearCart, total: calculateTotal(), cartRestaurantId, activeOrderId, 
        setActiveOrderId: setActiveOrderIdState 
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