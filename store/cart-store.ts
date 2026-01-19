// store/cart-store.ts
import { create } from 'zustand';
import { createClient } from '@supabase/supabase-js';

// Inicializamos el cliente de Supabase aquí también para guardar el pedido
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Product {
  id: string;
  name: string;
  price: number;
}

interface CartItem extends Product {
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  restaurantPhone: string;
  restaurantId: string;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  checkout: () => Promise<void>;
}

export const useCart = create<CartStore>((set, get) => ({
  items: [],
  restaurantPhone: '', // Se llenará automáticamente al cargar la página
  restaurantId: '',

  // Acción: Agregar producto
  addItem: (product) => set((state) => {
    const existing = state.items.find(i => i.id === product.id);
    if (existing) {
      return {
        items: state.items.map(i => 
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      };
    }
    return { items: [...state.items, { ...product, quantity: 1 }] };
  }),

  // Acción: Quitar producto
  removeItem: (id) => set((state) => ({
    items: state.items.filter(i => i.id !== id)
  })),

  // Acción: Limpiar todo
  clearCart: () => set({ items: [] }),

  // LA MAGIA: Guardar en DB y abrir WhatsApp
  checkout: async () => {
    const { items, restaurantPhone, restaurantId } = get();
    if (items.length === 0) return;

    // 1. Calcular el Total
    const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    // 2. Crear el mensaje de texto para WhatsApp
    let message = `Hola! Quiero pedir:\n`;
    items.forEach(item => {
      message += `- ${item.quantity}x ${item.name} ($${item.price * item.quantity})\n`;
    });
    message += `\n*Total: $${total}*`;

    // 3. Guardar el pedido en Supabase (Para el panel de control)
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        total_amount: total,
        status: 'enviado_whatsapp', // Asumimos que lo envió
        message_copy: message
      })
      .select()
      .single();

    if (error) console.error("Error guardando pedido:", error);

    // 4. Si se guardó la cabecera, guardamos los items individuales (detalle)
    if (order) {
        const orderItems = items.map(item => ({
            order_id: order.id,
            product_name: item.name,
            quantity: item.quantity,
            unit_price: item.price
        }));
        
        await supabase.from('order_items').insert(orderItems);
    }

    // 5. Redirigir a WhatsApp (Abre nueva pestaña)
    const waUrl = `https://wa.me/${restaurantPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
    
    // 6. Limpiar carrito local
    set({ items: [] });
  }
}));