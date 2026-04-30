"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef, Suspense } from "react"; // Agregamos Suspense aquí
import { createBrowserClient } from "@supabase/ssr";
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import {
  Loader2, ShoppingBag, Clock, CheckCircle, XCircle, Bike, Store, MapPin,
  CreditCard, Banknote, Trash2, ChefHat, Check, User, MessageCircle,
  LayoutGrid, List, Zap, Send, Phone, Printer, FileText,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  LayoutList, Pencil, X, Search,Lock,Wallet
} from "lucide-react";
import Link from "next/link";
const CUSTOM_STYLES = `
  @keyframes blink-alert {
    0%, 100% { background-color: #ef4444 !important; border-color: #b91c1c !important; color: white !important; }
    50% { background-color: #ffffff !important; border-color: #ef4444 !important; color: #ef4444 !important; }
  }
  .animate-table-call {
    animation: blink-alert 0.6s infinite ease-in-out !important;
    border-width: 6px !important; /* Más grueso para que se note */
    z-index: 50 !important;
  }
`;
// --- INTERFAZ PARA MESAS ---
interface Table {
    id: string;
    name: string;
    status: string;
    description?: string;
    needs_attention?: boolean;
}

const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

function OrdersContent() {
    const [showConfirmPaymentModal, setShowConfirmPaymentModal] = useState<any>(null);
  // --- INICIALIZACIÓN DE HOOKS ---
  const router = useRouter(); // <--- ESTA ES LA LÍNEA QUE SOLUCIONA EL ERROR
  const searchParams = useSearchParams();
  const [selectedTableForDetail, setSelectedTableForDetail] = useState<any>(null); // Mesa seleccionada para ver detalle
const [allProducts, setAllProducts] = useState<any[]>([]); // Lista de productos para agregar
const [isAddingItem, setIsAddingItem] = useState(false); // Estado de carga al agregar
const [showAddTools, setShowAddTools] = useState(false);
  // ESTADOS DE LA TABLA Y EDICIÓN
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const getArgentinaDate = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
};
// Estados para Reservas
  const [isResModalOpen, setIsResModalOpen] = useState(false);
  const [resTable, setResTable] = useState<any>(null);
  const [resData, setResData] = useState({ name: '', guests: '', date: '', time: '', description: '' });
const [productSearch, setProductSearch] = useState("");
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("grid");
  const [restaurantName, setRestaurantName] = useState("");
  const [isLocked, setIsLocked] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [receiveWhatsapp, setReceiveWhatsapp] = useState(true);
  const [restaurantPhone, setRestaurantPhone] = useState<string | null>(null);
  const [showPhoneAlert, setShowPhoneAlert] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableDesc, setNewTableDesc] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreatingTable, setIsCreatingTable] = useState(false);
  const [showTables, setShowTables] = useState(false);
  const [availableTables, setAvailableTables] = useState<Table[]>([]);
 const [selectedDate, setSelectedDate] = useState(getArgentinaDate());
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalInfo, setUpgradeModalInfo] = useState({ title: '', desc: '', plan: '' });

  // --- FUNCIONES DE APOYO UI (Se mantienen igual) ---
const getStatusBadge = (status: string, orderType?: string) => {
    const isRetail = businessType === 'fraccionado' || businessType === 'unidad';

    switch (status) {
        case "pendiente":
            return <span className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Clock size={10} /> {isRetail ? 'Pedido Recibido' : 'Pendiente'}</span>;
        case "en_proceso":
            return <span className="bg-orange-100 text-orange-800 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">{isRetail ? <ShoppingBag size={10} /> : <ChefHat size={10} />} {isRetail ? 'Preparando' : 'Cocina'}</span>;
        case "en_camino":
            return <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Bike size={10} /> {orderType === 'mesa' ? 'Sirviendo' : isRetail ? 'Pedido Enviado' : 'En camino'}</span>;
        case "entregado":
        case "completado":
            return <span className="bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Check size={10} /> {isRetail ? 'Entregado' : 'Finalizado'}</span>;
        default:
            return <span className="bg-gray-100 text-gray-800 text-[10px] px-2 py-0.5 rounded-full font-bold">{status}</span>;
    }
};

  const getWhatsAppLink = (phone: string, type: "notify" | "chat") => {
    let message = type === "notify" ? `Hola! 🛵 Tu pedido de *${restaurantName}* está en camino.` : "";
    return `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
  };

  const formatDateDisplay = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  const fetchTables = async (id: string) => {
    const { data } = await supabase.from('tables').select('*').eq('restaurant_id', id).order('name', { ascending: true });
    setAvailableTables(data || []);
  };

 const saveTable = async () => {
    // 1. Validaciones básicas
    if (!newTableName.trim()) return alert("Poné un nombre a la mesa");
    if (!restaurantId) return alert("No se encontró el ID del restaurante");

    setIsCreatingTable(true); // Empezamos a cargar

    try {
        if (editingTableId) {
            // EDITAR MESA
            const { error } = await supabase
                .from('tables')
                .update({ name: newTableName, description: newTableDesc })
                .eq('id', editingTableId);
            
            if (error) throw error; // Si hay error, vamos al catch
            setEditingTableId(null);
        } else {
            // CREAR MESA NUEVA
            const { error } = await supabase.from('tables').insert({
                restaurant_id: restaurantId, 
                name: newTableName, 
                description: newTableDesc, 
                status: 'libre'
            });

            if (error) throw error; // Si hay error, vamos al catch
            setShowTables(true);
        }

        // Si llegó acá es porque salió todo bien
        setNewTableName(''); 
        setNewTableDesc(''); 
        await fetchTables(restaurantId); // AHORA SÍ: esperamos a que refresque
        setIsModalOpen(false);

    } catch (err: any) {
        // 🚨 ESTO ES LO QUE TE VA A DECIR POR QUÉ FALLA
        console.error("Error completo:", err);
        alert("Error al guardar: " + (err.message || "Error desconocido"));
    } finally {
        // Esto se ejecuta SIEMPRE, así el botón vuelve a la normalidad
        setIsCreatingTable(false);
    }
};

  const openEditModal = (mesa: any) => {
    setEditingTableId(mesa.id);
    setNewTableName(mesa.name);
    setNewTableDesc(mesa.description || '');
    setIsModalOpen(true);
  };

 // --- FUNCIONES DE GESTIÓN DE MESAS ---

  const resetAttention = async (id: string) => {
    await supabase.from('tables').update({ needs_attention: false }).eq('id', id);
    if (restaurantId) fetchTables(restaurantId); 
  };

  const toggleTableStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'libre' ? 'reservada' : 'libre';
    await supabase.from('tables').update({ status: newStatus }).eq('id', id);
    if (restaurantId) fetchTables(restaurantId); 
  };

const addItemToOrder = async (order: any, customItem?: { name: string, price: number }) => {
    if (isAddingItem) return;
    setIsAddingItem(true);
    const newItem = {
        id: customItem ? `manual-${Date.now()}` : Math.random().toString(36).substr(2, 9),
        name: customItem ? customItem.name : '',
        price: customItem ? customItem.price : 0,
        quantity: 1,
        uniqueId: Math.random().toString(36).substr(2, 9),
        extrasList: []
    };
    const updatedItems = [...(order.items || []), newItem];
    const newTotal = Number(order.total) + Number(newItem.price);

    try {
        const { error } = await supabase.from('orders').update({ items: updatedItems, total: newTotal }).eq('id', order.id);
        if (!error) {
            setOrders(prev => prev.map(o => o.id === order.id ? { ...o, items: updatedItems, total: newTotal } : o));
            setSelectedTableForDetail((prev: any) => ({ ...prev, activeOrder: { ...prev.activeOrder, items: updatedItems, total: newTotal } }));
            setManualName(""); setManualPrice(""); setManualDesc(""); setIsManualMode(false);
        }
    } catch (err) { console.error(err); } finally { setIsAddingItem(false); }
  };

  const occupyTableManual = async (mesa: any) => {
    if (!restaurantId) return;
    const { error } = await supabase.from("orders").insert({
        restaurant_id: restaurantId,
        table_number: mesa.name,
        customer_name: "Cliente Local",
        order_type: "mesa",
        status: "recibido",
        total: 0,
        items: [],
        payment_method: "efectivo"
    });
    if (!error) loadOrders();
  };

  const saveReservation = async () => {
    if (!resTable || !resData.name || !resData.guests) {
        alert("Nombre y cantidad de personas son obligatorios.");
        return;
    }
    const reservationDetails = {
        name: resData.name,
        guests: resData.guests,
        description: resData.description || "", 
        datetime: `${resData.date}T${resData.time}`
    };
    const { error } = await supabase
        .from('tables')
        .update({ status: 'reservada', reservation_info: reservationDetails })
        .eq('id', resTable.id);
    if (!error) {
        fetchTables(restaurantId!);
        setIsResModalOpen(false);
        setResData({ name: '', guests: '', date: '', time: '', description: '' });
    }
  };

  const deleteReservation = async (tableId: string) => {
    if (!confirm("¿Eliminar la reserva de esta mesa?")) return;
    const { error } = await supabase
        .from('tables')
        .update({ status: 'libre', reservation_info: null })
        .eq('id', tableId);
    if (!error) {
        fetchTables(restaurantId!);
        setIsResModalOpen(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    setOrders(prev => prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o)));
    await supabase.from("orders").update({ status: newStatus }).eq("id", id);
  };

  const deleteOrder = async (id: string) => {
    if (!confirm("¿Eliminar este pedido?")) return;
    setOrders(prev => prev.filter((o) => o.id !== id));
    await supabase.from("orders").delete().eq("id", id);
  };

  const toggleWhatsapp = async () => {
    if (!receiveWhatsapp && (!restaurantPhone || restaurantPhone.trim() === "")) {
      setShowPhoneAlert(true); 
      return;
    }
    const newValue = !receiveWhatsapp;
    setReceiveWhatsapp(newValue);
    await supabase.from("restaurants").update({ receive_whatsapp: newValue }).eq("id", restaurantId);
  };
  // --- 2. CARGA DE PEDIDOS (UNIFICADA) ---
// --- 2. CARGA DE PEDIDOS (CON FIX DE ZONA HORARIA ARG) ---
const loadOrders = async () => {
  if (!restaurantId || isLocked) return;
  try {
    const isToday = selectedDate === getArgentinaDate();
    
    // Agregamos el offset -03:00 para que Supabase entienda que es hora de Argentina
    const startOfDay = `${selectedDate}T00:00:00-03:00`; 

    let query = supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .neq("order_type", "apertura");

    if (isToday) {
      // Filtro estricto: Desde las 00:00 de hoy hasta el final del día
      const endOfToday = `${selectedDate}T23:59:59-03:00`;
      query = query.gte("created_at", startOfDay).lte("created_at", endOfToday);
    } else {
      // Para días anteriores (Ayer, etc)
      const endOfDay = `${selectedDate}T23:59:59-03:00`;
      query = query.gte("created_at", startOfDay).lte("created_at", endOfDay);
    }
      
    const { data: ords } = await query.order("created_at", { ascending: false });
    setOrders(ords || []);
  } catch (e) {
    console.error("Error loadOrders:", e);
  }
};

  // --- 3. IMPRESIÓN (CIERRA PESTAÑA SOLA) ---
  const handlePrint = (order: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const direccionExhibida = order.order_type === 'delivery' 
      ? (order.address || 'Sin dirección') 
      : order.order_type === 'mesa' ? `Mesa: ${order.table_number || 'S/N'}` : 'Retiro';

    // --- CÁLCULOS PARA EL DESGLOSE ---
    // Sumamos solo los productos
    const subtotalProductos = order.items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
    // Usamos el nombre real de la columna: delivery_cost
    const costoEnvio = Number(order.delivery_cost || 0);
    const montoDescuento = Number(order.discount_amount || 0);
    const totalFinal = Number(order.total);

    const itemsHtml = order.items.map((item: any) => `
        <div style="margin-bottom: 5px; font-size: 13px;">
            <div style="display: flex; justify-content: space-between;">
                <span>${item.quantity}x ${item.name.toUpperCase()}</span>
                <span>$${(item.price * item.quantity).toLocaleString()}</span>
            </div>
            ${item.extrasList?.map((e: any) => `<div style="font-size: 10px; margin-left: 10px;">+ ${e.name.toUpperCase()}</div>`).join('') || ''}
        </div>`).join("");

  printWindow.document.write(`
        <html>
            <body style="font-family: monospace; width: 280px; padding: 10px; margin: 0 auto; color: #000;">
              <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
    <h2 style="margin:0; font-size: 18px;">${restaurantName.toUpperCase()}</h2>
  
    ${order.order_type === 'mesa' ? `<h1 style="margin: 5px 0; font-size: 24px;">MESA ${order.table_number}</h1>` : ''}
    <p style="margin: 5px 0; font-size: 12px;">TICKET #${order.id.slice(0, 5).toUpperCase()}</p>
    <p style="margin: 0; font-size: 10px;">${new Date(order.created_at).toLocaleString("es-AR", { hour12: false })}</p>
</div>


<div style="font-size: 12px; margin-bottom: 10px; border: 1px solid #000; padding: 8px; border-radius: 5px;">
    <p style="margin: 2px 0; font-size: 14px;"><strong>CLIENTE:</strong> ${order.customer_name.toUpperCase()}</p>
    <p style="margin: 2px 0; font-size: 14px;"><strong>WHATSAPP:</strong> ${order.customer_phone || 'NO INFORMADO'}</p>
    <p style="margin: 2px 0;"><strong>ENTREGA:</strong> ${order.order_type.toUpperCase()}</p>
    
    ${order.order_type !== 'mesa' ? `
        ${order.scheduled_delivery_time && order.scheduled_delivery_time !== 'Inmediato' ? `
            <div style="margin: 8px 0; padding: 5px; border: 2px solid #000; text-align: center; font-size: 14px; background: #eee;">
                <strong>ENTREGA PROGRAMADA: ${order.scheduled_delivery_time.toUpperCase()}</strong>
            </div>
        ` : `
            <p style="margin: 4px 0;"><strong>HORARIO:</strong> LO ANTES POSIBLE</p>
        `}
    ` : ''}
</div>
                
                <div style="border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 5px 0; margin-bottom: 10px;">
                    ${itemsHtml}
                </div>

                <div style="font-size: 13px; line-height: 1.6;">
                    <div style="display: flex; justify-content: space-between;">
                        <span>SUBTOTAL PRODUCTOS:</span>
                        <span>$${subtotalProductos.toLocaleString()}</span>
                    </div>

                    ${montoDescuento > 0 ? `
                    <div style="display: flex; justify-content: space-between; color: #000;">
                        <span>CUPÓN (${order.coupon_code?.toUpperCase() || 'DESC'}):</span>
                        <span>-$${montoDescuento.toLocaleString()}</span>
                    </div>` : ''}

                    ${costoEnvio > 0 ? `
                    <div style="display: flex; justify-content: space-between;">
                        <span>ENVÍO / DELIVERY:</span>
                        <span>+$${costoEnvio.toLocaleString()}</span>
                    </div>` : ''}

                    <div style="border-top: 2px dashed #000; padding-top: 8px; margin-top: 5px; font-size: 22px; font-weight: bold; display: flex; justify-content: space-between;">
                        <span>TOTAL:</span>
                        <span>$${totalFinal.toLocaleString()}</span>
                    </div>
                </div>
                
                <p style="text-align: center; font-size: 10px; margin-top: 25px; border-top: 1px solid #eee; padding-top: 10px;">
                    GRACIAS POR TU COMPRA<br>
                    Snappy Tu Menú Digital
                </p>
            </body>
        </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 350);
  };

  const changeView = (newView: string) => {
    setView(newView);
    localStorage.setItem("ordersView", newView);
  };

  // --- 4. EFECTOS (AUTH, CARGA Y TIEMPO REAL) ---
  useEffect(() => {
    const initApp = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: rest } = await supabase.from("restaurants").select("*").eq("user_id", user.id).single();
      
   if (rest) {
    setRestaurantName(rest.name); 
    setRestaurantId(rest.id); 
    setRestaurantPhone(rest.phone);
    setReceiveWhatsapp(rest.receive_whatsapp ?? true);
    setBusinessType(rest.business_type);
    setCurrentPlan(rest.subscription_plan); // <--- AGREGÁ ESTA LÍNEA
    if (rest.subscription_plan === 'plus' || rest.subscription_plan === 'max') {
        setShowTables(true);
    }
    setIsLocked(rest.subscription_plan === "light" && user.email !== 'luchiimee2@gmail.com');
}

      // --- AGREGADO: Cargar la vista guardada (Grilla o Lista) ---
      const savedView = localStorage.getItem("ordersView");
      if (savedView) setView(savedView);

      setLoading(false);
    };
    initApp();
  }, []);

useEffect(() => {
    const fetchProducts = async () => {
      if (!restaurantId) return;
      console.log("🔍 Cargando productos para ID:", restaurantId);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('name', { ascending: true }); 
      
      if (error) console.error("❌ Error Supabase:", error);
      setAllProducts(data || []);
    };
    fetchProducts();
  }, [restaurantId]);

  useEffect(() => {
    loadOrders();
    if (restaurantId) fetchTables(restaurantId);
  }, [selectedDate, restaurantId, isLocked]);





const getActiveOrderForTable = (tableName: string) => {
    return orders.find(o => 
        o.order_type === 'mesa' && 
        o.table_number === tableName && 
        // 🚀 AHORA: Solo se libera si está 'completado' o 'cancelado'
        // 'entregado' significa que sigue en la mesa comiendo
        !['completado', 'cancelado'].includes(o.status)
    );
};


// 🚀 MOTOR ÚNICO: TIEMPO REAL TOTAL (FIX PARA TABLETS)
useEffect(() => {
    if (!restaurantId || isLocked) return;

    const channel = supabase
        .channel('main-app-sync')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'orders' 
            // ❌ QUITAMOS EL FILTER DE AQUÍ: Supabase no envía restaurant_id en cada update
        }, (payload) => {
            // ✅ FILTRAMOS MANUALMENTE EN JS
            console.log("📡 Payload recibido de Supabase:", payload); // 👈 SEÑOR, MIRE ESTO EN LA CONSOLA DE LA PC
    
   
            const data = (payload.new as any) || (payload.old as any);
            if (data.restaurant_id !== restaurantId) return;

            if (payload.eventType === 'INSERT') {
                setOrders(prev => [payload.new, ...prev]);
            } 
            else if (payload.eventType === 'UPDATE') {
                setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o));
                
                setSelectedTableForDetail((prev: any) => {
                    if (prev?.activeOrder?.id === payload.new.id) {
                        return { ...prev, activeOrder: { ...prev.activeOrder, ...payload.new } };
                    }
                    return prev;
                });
            }
        })
        .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'tables',
            filter: `restaurant_id=eq.${restaurantId}` // En tables sí funciona porque el mozo envía restaurant_id
        }, () => {
            fetchTables(restaurantId);
        })
        .subscribe();

    return () => { supabase.removeChannel(channel); };
}, [restaurantId, isLocked]);

  if (loading) {
    
    return (
      <div className="p-10 flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin text-blue-600" />
      </div>
    );
  }
 return (
<div className="max-w-6xl mx-auto min-h-screen p-2 pt-2 md:pt-2 lg:pt-8 relative font-sans">
      <style dangerouslySetInnerHTML={{ __html: CUSTOM_STYLES }} />
      {/* --- LÓGICA DE BLOQUEO --- */}
      {isLocked && (
        <div className="fixed inset-0 z-50 backdrop-blur-sm bg-white/60 flex items-center justify-center p-4">
          <div className="bg-white shadow-2xl p-10 rounded-[2.5rem] max-w-md w-full text-center border border-gray-100 relative">
            <button 
              onClick={() => router.push('/dashboard')} 
              className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-5 text-blue-600">
              <Zap size={32} fill="currentColor" />
            </div>
            <h2 className="text-2xl font-bold mb-2 tracking-tighter uppercase italic">Gestor de Pedidos</h2>
           <p className="text-gray-500 mb-8 text-sm">Panel de control exclusivo del <b>Plan GO</b>.</p>
<div className="flex flex-col gap-3">
   <Link href="/dashboard/settings" className="w-full py-4 rounded-2xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition shadow-lg uppercase text-xs tracking-widest text-center no-underline">
      Actualizar a GO <Zap size={18} fill="currentColor" className="inline ml-1" />
   </Link>
               <button onClick={() => router.push('/dashboard')} className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2 hover:text-gray-600">
                 Volver al inicio
               </button>
            </div>
          </div>
        </div>
      )}

      <div className={`${isLocked ? "blur-sm pointer-events-none opacity-50 select-none overflow-hidden h-full" : ""}`}>
        
        {/* --- REGLÓN SUPERIOR --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 px-2">
            <div>
                <h1 className="text-3xl lg:text-5xl font-black flex items-center gap-3 text-gray-900 tracking-tighter uppercase italic">
                    Pedidos 
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                </h1>
                <p className="text-[10px] lg:text-xs text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">
                    Monitor en tiempo real
                </p>
            </div>

            <div className="flex items-center gap-4 bg-slate-900/90 backdrop-blur-md p-2.5 px-4 rounded-2xl border border-slate-800 shadow-2xl transition-all duration-300">
                <div className="flex items-center gap-3">
                    <div className={`relative p-2 rounded-xl transition-all duration-500 ${receiveWhatsapp ? 'bg-green-500/20 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-slate-800 text-slate-500'}`}>
                        <MessageCircle size={18} fill={receiveWhatsapp ? "currentColor" : "none"} className="relative z-10" />
                        {receiveWhatsapp && <span className="absolute inset-0 rounded-xl bg-green-500/20 animate-pulse"></span>}
                    </div>
                    <div className="flex flex-col">
                        <p className="text-white font-black text-[10px] leading-none mb-1 tracking-widest uppercase italic opacity-90">PEDIDOS</p>
                        <p className={`text-[9px] font-bold leading-tight uppercase transition-colors duration-300 ${receiveWhatsapp ? 'text-green-400' : 'text-slate-500'}`}>
                            {receiveWhatsapp ? "Panel y WhatsApp" : "Solo Panel"}
                        </p>
                    </div>
                </div>
                <button 
                    onClick={toggleWhatsapp} 
                    className={`group relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${receiveWhatsapp ? 'bg-green-500' : 'bg-slate-700'}`}
                >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${receiveWhatsapp ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>
        </div>

        {/* --- BARRA DE CONTROL CENTRAL: BUSCADOR + FECHA --- */}
        <div className="flex flex-col gap-3 mb-4 px-2">
            {/* 1. BUSCADOR */}
          {/* BUSCADOR CON AYUDA VISUAL */}
<div className="flex flex-col gap-2 mb-1">
    {/* MENSAJE DE AYUDA (ARRIBA) */}
    <div className="flex items-center gap-1.5 ml-4">
        <div className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">
            Buscá por nombre o ID <span className="text-gray-300">(sin usar el #)</span>
        </p>
    </div>

    {/* CONTENEDOR RELATIVO (Solo para el input y los iconos) */}
    <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={20} />
        <input 
            type="text"
            placeholder="Buscar pedido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-[1.5rem] text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm placeholder:text-gray-400 text-gray-900"
        />
        {searchTerm && (
            <button 
                onClick={() => setSearchTerm("")} 
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-gray-100 p-1 rounded-full text-gray-500 hover:text-red-500 transition-colors"
            >
                <X size={14} />
            </button>
        )}
    </div>
</div>



            {/* 2. FILTROS DE FECHA Y VISTA */}
            <div className="flex flex-col lg:flex-row gap-3">
                <div className="flex-1 flex items-center justify-between bg-white p-2 rounded-[1.5rem] border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl">
                        <button onClick={() => setSelectedDate(getArgentinaDate())} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${selectedDate === getArgentinaDate() ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>Hoy</button>
                        <button onClick={() => setSelectedDate(getArgentinaDate(-1))} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${selectedDate === getArgentinaDate(-1) ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>Ayer</button>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => dateInputRef.current?.showPicker()} className="p-2.5 bg-gray-50 text-gray-400 rounded-xl border border-gray-100 hover:text-blue-600 transition-colors">
                            <CalendarIcon size={18} />
                        </button>
                        <div className="flex flex-col items-end pr-2">
                            <span className="text-[10px] font-black text-gray-800 leading-none">{formatDateDisplay(selectedDate)}</span>
                            <input ref={dateInputRef} type="date" className="absolute opacity-0 pointer-events-none" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex-1 lg:flex-none flex items-center gap-4 bg-green-500 text-white p-3 px-6 rounded-[1.5rem] shadow-lg shadow-green-200">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase tracking-widest opacity-80">Total del día</span>
                            <span className="text-xl font-black tracking-tighter">
                                ${orders.filter(o => (o.status === "completado" || o.status === "entregado") && o.order_type !== "apertura").reduce((acc, curr) => acc + Number(curr.total), 0).toLocaleString()}
                            </span>
                        </div>
                        <Zap size={20} fill="currentColor" className="opacity-40" />
                    </div>
                    <div className="flex bg-white p-1.5 rounded-[1.5rem] border border-gray-100 shadow-sm gap-1">
                        <button onClick={() => changeView("list")} className={`p-2.5 rounded-xl transition-all ${view === "list" ? "bg-gray-900 text-white shadow-md" : "text-gray-400"}`}><List size={20} /></button>
                        <button onClick={() => changeView("grid")} className={`p-2.5 rounded-xl transition-all ${view === "grid" ? "bg-gray-900 text-white shadow-md" : "text-gray-400"}`}><LayoutGrid size={20} /></button>
                    </div>
                </div>
            </div>
        </div>

        {/* --- GESTIÓN DE MESAS --- */}
      {/* --- GESTIÓN DE MESAS (BLOQUE CORREGIDO) --- */}
        <div className="px-2 mb-8">
            <div className="bg-white border border-gray-100 rounded-[1.5rem] shadow-sm overflow-hidden">
              <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-50 bg-slate-50/30">
                    {/* --- 1. ÚNICO BOTÓN DE TOGGLE (CON LÓGICA DE PLAN) --- */}
                    <button 
                        onClick={() => {
                            if (currentPlan !== 'plus' && currentPlan !== 'max') {
                                setUpgradeModalInfo({
                                    title: "Gestión de Salón",
                                    desc: "Habilitá el control de mesas y comandas para organizar tu salón de forma profesional.",
                                    plan: "Plus"
                                });
                                setShowUpgradeModal(true);
                            } else {
                                setShowTables(!showTables);
                            }
                        }} 
                        className="flex items-center gap-3 hover:opacity-80 transition-all group cursor-pointer"
                    >
                        <div className={`p-2 rounded-xl transition-all ${showTables ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>
                            {(currentPlan !== 'plus' && currentPlan !== 'max') ? <Lock size={18} /> : <Store size={18} />}
                        </div>
                        
                        <div className="flex flex-col items-start text-left">
                            <span className="text-xs font-black uppercase tracking-widest text-gray-700">Gestión de Salón / Mesas</span>
                            <span className="text-[9px] text-gray-400 font-bold uppercase">{availableTables.length} Mesas configuradas</span>
                        </div>

                        <div className={`ml-2 p-1.5 rounded-full transition-all ${showTables ? 'bg-blue-100 text-blue-600 rotate-180' : 'bg-gray-200 text-gray-500'}`}>
                            <ChevronDown size={20} strokeWidth={3} />
                        </div>
                    </button>

                    {/* --- 2. BOTÓN CREAR MESA (BLOQUEADO SI NO ES PLUS) --- */}
                    <button 
                        onClick={() => {
                            if (currentPlan !== 'plus' && currentPlan !== 'max') {
                                setUpgradeModalInfo({
                                    title: "Gestión de Salón",
                                    desc: "Habilitá el control de mesas para organizar tu salón.",
                                    plan: "Plus"
                                });
                                setShowUpgradeModal(true);
                            } else {
                                setIsModalOpen(true);
                            }
                        }} 
                        className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-md flex items-center justify-center gap-2 transition-all ${
                            (currentPlan !== 'plus' && currentPlan !== 'max') 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                    >
                        {(currentPlan !== 'plus' && currentPlan !== 'max') ? <Lock size={14} /> : <Plus size={14} />} 
                        Crear Mesa
                    </button>
                </div>

                {showTables && (
                    <div className="p-6 bg-white border-t border-gray-100 animate-in fade-in slide-in-from-top-2">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
{availableTables.map((mesa: any) => {
    const activeOrder = getActiveOrderForTable(mesa.name);
    const isOccupied = !!activeOrder;
    const isCalling = Boolean(mesa.needs_attention); 
    
    // 💸 NUEVA LÓGICA DE PAGO
    const isWaitingPayment = activeOrder?.payment_status === 'esperando_confirmacion';
    const paymentMethod = activeOrder?.payment_method;

    return (
        <div 
            key={mesa.id} 
            onClick={() => isOccupied && setSelectedTableForDetail({ ...mesa, activeOrder })}
            className={`relative p-5 rounded-3xl border-2 transition-all flex flex-col min-h-[310px] shadow-sm group active:scale-[0.98] ${
                isCalling 
                ? 'animate-table-call ring-4 ring-red-500/50' 
                : isWaitingPayment
                    ? 'border-purple-600 bg-purple-50 ring-4 ring-purple-100' // Alerta violeta de pago
                    : isOccupied 
                        ? 'border-orange-500 bg-orange-50/20' 
                        : 'border-gray-100 bg-white'
            }`}
        >
            {/* ✏️ BOTONES DE EDICIÓN / BORRAR (Tus originales) */}
            <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button onClick={(e) => { e.stopPropagation(); openEditModal(mesa); }} className="p-1.5 bg-white shadow-md rounded-full text-blue-600 hover:bg-blue-50"><Pencil size={12} /></button>
                <button onClick={(e) => { e.stopPropagation(); if(confirm(`¿Eliminar ${mesa.name}?`)) supabase.from('tables').delete().eq('id', mesa.id).then(() => fetchTables(restaurantId!)); }} className="p-1.5 bg-white shadow-md rounded-full text-red-500 hover:bg-red-50"><Trash2 size={12} /></button>
            </div>

            {/* 🔔 BOTÓN PARA APAGAR LLAMADO (Tu original) */}
            {isCalling && (
                <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        resetAttention(mesa.id); 
                    }} 
                    className="absolute -top-4 -left-2 bg-black text-white p-3 rounded-full z-[120] border-2 border-white shadow-2xl animate-bounce"
                >
                    <Check size={20} strokeWidth={4} className="text-green-500" />
                </button>
            )}

            {/* 💰 ETIQUETA DE PAGO (Nueva) */}
            {isWaitingPayment && !isCalling && (
                <div className="absolute -top-3 -left-2 bg-purple-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase shadow-lg animate-pulse z-20">
                    {paymentMethod === 'transferencia' ? 'Revisar Transf.' : 'Cobrar en Mesa'}
                </div>
            )}

            {/* CABECERA: Nombre Mesa e Icono */}
            <div className="flex justify-between items-start mb-2">
                <span className={`font-black text-xs uppercase px-3 py-1 rounded-lg ${isCalling ? 'bg-white text-red-600' : isWaitingPayment ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-gray-100 text-gray-600'}`}>
                    {mesa.name}
                </span>
                <span className="text-2xl">{isCalling ? '🚨' : isWaitingPayment ? '💳' : isOccupied ? '🔥' : '🍽️'}</span>
            </div>

            {isOccupied ? (
                <div className="flex-1 flex flex-col justify-between text-left">
                    <div className="space-y-1">
                        <p className={`text-[10px] font-black uppercase tracking-widest leading-none ${isCalling ? 'text-white' : isWaitingPayment ? 'text-purple-600' : 'text-orange-600'}`}>
                            {isCalling ? '¡EL CLIENTE LLAMA!' : isWaitingPayment ? 'Pago Solicitado' : 'Mesa Ocupada'}
                        </p>
                        <p className={`text-sm font-black truncate uppercase tracking-tighter ${isCalling ? 'text-white' : 'text-gray-900'}`}>
                            {activeOrder.customer_name}
                        </p>

                        {/* Muestra quién paga (Nueva ayuda visual) */}
                        {isWaitingPayment && (
                            <p className="text-[9px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md truncate border border-purple-200">
                                {paymentMethod === 'transferencia' ? `Paga: ${activeOrder.payer_name || 'Alguien'}` : `Paga con: ${paymentMethod?.toUpperCase()}`}
                            </p>
                        )}

                        <div className={`flex justify-between items-center p-2 rounded-xl border ${isCalling ? 'bg-black/10 border-white/20' : isWaitingPayment ? 'bg-white border-purple-200 shadow-inner' : 'bg-white/50 border-orange-100'}`}>
                             <span className={`text-[8px] font-black uppercase ${isCalling ? 'text-white/70' : 'text-gray-400'}`}>Total</span>
                             <span className={`text-sm font-black ${isCalling ? 'text-white' : 'text-gray-900'}`}>${activeOrder.total}</span>
                        </div>
                    </div>

                    {/* 🔘 BOTONES DE SEGUIMIENTO (Sin borrar nada) */}
                    <div className="mt-4 space-y-2">
                        {/* Si está esperando pago, el botón principal cambia para llamar la atención */}
                        {isWaitingPayment ? (
                            <button 
                                onClick={(e) => { e.stopPropagation(); setSelectedTableForDetail({ ...mesa, activeOrder }); }} 
                                className="w-full py-3 bg-purple-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg animate-pulse flex items-center justify-center gap-2"
                            >
                                <Wallet size={14} /> Revisar y Cobrar
                            </button>
                        ) : (
                            <div className="grid grid-cols-1 gap-1.5">
                                {activeOrder.status === 'pendiente' && (
                                    <button onClick={(e) => { e.stopPropagation(); updateStatus(activeOrder.id, 'recibido'); }} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase shadow-sm active:scale-95 transition-all">Tomar Pedido</button>
                                )}
                                {activeOrder.status === 'recibido' && (
                                    <button onClick={(e) => { e.stopPropagation(); updateStatus(activeOrder.id, 'en_proceso'); }} className="w-full py-2.5 bg-orange-500 text-white rounded-xl text-[9px] font-black uppercase shadow-sm active:scale-95 transition-all">Enviar a Cocina</button>
                                )}
                                {activeOrder.status === 'en_proceso' && (
                                    <button onClick={(e) => { e.stopPropagation(); updateStatus(activeOrder.id, 'listo'); }} className="w-full py-2.5 bg-blue-500 text-white rounded-xl text-[9px] font-black uppercase shadow-sm active:scale-95 transition-all">Plato Listo</button>
                                )}
                                {activeOrder.status === 'listo' && (
                                    <button onClick={(e) => { e.stopPropagation(); updateStatus(activeOrder.id, 'entregado'); }} className="w-full py-2.5 bg-green-600 text-white rounded-xl text-[9px] font-black uppercase shadow-sm active:scale-95 transition-all">Entregado</button>
                                )}
                                {activeOrder.status === 'entregado' && (
                                    <button 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            if(confirm("¿Confirmar pago y liberar mesa?")) updateStatus(activeOrder.id, 'completado'); 
                                        }} 
                                        className="w-full py-2.5 bg-green-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg flex items-center justify-center gap-1 active:scale-95 transition-all"
                                    >
                                        <Banknote size={12} /> Confirmar Pago
                                    </button>
                                )}
                            </div>
                        )}
                        <div className="text-center">
                            <span className={`text-[8px] font-black uppercase tracking-widest border-b pb-0.5 ${isCalling ? 'text-white border-white' : 'text-gray-400 border-gray-200 group-hover:text-blue-500 group-hover:border-blue-500'}`}>
                                + Ver Detalle / Sumar
                            </span>
                        </div>
                    </div>
                </div>
            ) : (
                /* 🍽️ ESTADO DISPONIBLE (Tu original) */
                <div className="flex-1 flex flex-col justify-center items-center gap-3">
                    <p className="text-[10px] text-gray-300 font-black uppercase tracking-[0.2em]">Disponible</p>
                    <div className="grid grid-cols-1 w-full gap-2 px-2">
                        <button onClick={(e) => { e.stopPropagation(); occupyTableManual(mesa); }} className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all">
                            <User size={12} /> Ocupar Mesa
                        </button>
                        {mesa.status === 'reservada' ? (
                            <button onClick={(e) => { e.stopPropagation(); setResTable(mesa); setResData({ name: mesa.reservation_info?.name || '', guests: mesa.reservation_info?.guests || '', date: mesa.reservation_info?.datetime?.split('T')[0] || '', time: mesa.reservation_info?.datetime?.split('T')[1] || '', description: mesa.reservation_info?.description || '' }); setIsResModalOpen(true); }} className="w-full py-2.5 bg-blue-50 text-blue-600 border-2 border-blue-200 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 transition-all"><List size={12} /> Ver Reserva</button>
                        ) : (
                            <button onClick={(e) => { e.stopPropagation(); setResTable(mesa); setIsResModalOpen(true); }} className="w-full py-2.5 bg-white border-2 border-blue-600 text-blue-600 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 transition-all"><CalendarIcon size={12} /> Reservar</button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
})}
              </div>
                    </div>
                )}
            </div>
        </div>

        {/* --- LISTADO DE PEDIDOS --- */}
        <div className={view === "list" ? "space-y-4 px-2" : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 px-2 pb-20"}>
            {orders.length === 0 && (
                <div className="col-span-full py-20 text-center text-gray-400 bg-white rounded-[2.5rem] border border-dashed border-gray-100">
                    <ShoppingBag size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="font-bold text-sm uppercase tracking-widest">No hay pedidos para esta fecha</p>
                </div>
            )}

          {orders
  .filter(order => {
    // 1. Limpiamos la búsqueda: pasamos a minúsculas y sacamos espacios de más (.trim())
    const term = searchTerm.toLowerCase().trim();
    
    // 2. Si no hay nada escrito, mostramos todo
    if (!term) return true;

    // 3. Comparamos contra nombre e ID (sin el # por si el usuario lo pone)
    const name = (order.customer_name || "").toLowerCase();
    const id = (order.id || "").toLowerCase();
    const cleanId = id.replace('#', ''); 

    return name.includes(term) || id.includes(term) || cleanId.includes(term);
  })
  .map((order) => (
                    <div key={order.id} id={`order-${order.id}`} className={`p-4 rounded-3xl transition-all duration-500 border-2 ${highlightedId === order.id ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-100 scale-[1.02]' : 'border-white bg-white shadow-sm'}`}>
                        <div className="flex justify-between items-start mb-4 border-b border-gray-50 pb-4">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-mono font-bold text-gray-400 text-xs tracking-tighter">#{order.id.slice(0, 5)}</span>
                                    {getStatusBadge(order.status)}
                                </div>
                             <div className="space-y-1 mb-3">
    {/* Nombre y Apellido achicados (text-xs) */}
    <div className="text-xs font-black text-gray-900 tracking-tighter flex items-center gap-1.5 uppercase italic">
        <User size={13} className="text-gray-400" /> 
        {order.customer_name}
    </div>

    {/* WhatsApp más visible con estilo de botón suave */}
   {order.customer_phone && (
        <div className="flex items-center gap-1 text-[10px] font-black text-blue-600 bg-blue-50 w-fit px-2 py-1 rounded-lg border border-blue-100 shadow-sm mt-1">
            <Phone size={10} strokeWidth={3} /> 
            <span>{order.customer_phone}</span>
        </div>
    )}
</div>
                              
                                {order.order_type === 'delivery' && order.address && (
                                    <div className="flex items-center gap-1 text-[10px] font-black text-orange-600 bg-orange-50 w-fit px-2 py-0.5 rounded-md mt-1 border border-orange-100"><MapPin size={10} strokeWidth={3} /> {order.address}</div>
                                )}
                                <div className="flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-widest mt-2">
                                    <span className={`flex items-center gap-1 px-2 py-1 rounded-lg ${order.order_type === 'mesa' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                        {order.order_type === "delivery" ? <Bike size={12} /> : order.order_type === "retiro" ? <Store size={12} /> : <MapPin size={12} />}
                                        {order.order_type === 'mesa' ? `MESA ${order.table_number || ''}` : order.order_type}
                                    </span>
                                    <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg text-gray-500 italic border border-gray-200">
                                        {order.payment_method === "transferencia" ? <CreditCard size={12} /> : <Banknote size={12} />} {order.payment_method}
                                    </span>
                                    {/* 🚀 NUEVO: INDICADOR DE HORARIO (LO ANTES POSIBLE vs PROGRAMADO) */}
{order.order_type !== 'mesa' && (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border mt-2 w-fit transition-all ${
        order.scheduled_delivery_time && order.scheduled_delivery_time !== 'Inmediato'
        ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-100 animate-in zoom-in' // Resaltado si es para más tarde
        : 'bg-slate-100 border-slate-200 text-slate-500' // Estilo neutro si es inmediato
    }`}>
        {order.scheduled_delivery_time && order.scheduled_delivery_time !== 'Inmediato' 
            ? <CalendarIcon size={12} strokeWidth={3} /> 
            : <Zap size={12} fill="currentColor" />
        }
     <span className="text-[10px] font-black uppercase tracking-tight">
    {order.scheduled_delivery_time === 'Inmediato' || !order.scheduled_delivery_time
        ? (order.order_type === 'delivery' ? 'Enviar lo antes posible' : 'Retiro') 
        : `PROGRAMADO: ${order.scheduled_delivery_time}`}
</span>
    </div>
)}
                                </div>
                            </div>
                            <div className="text-right">
                                {order.coupon_code && (
                                    <div className="mb-2"><span className="text-[9px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-100 uppercase italic">Cupón: {order.coupon_code}</span></div>
                                )}
                                <p className="font-black text-2xl text-gray-900 tracking-tighter">${order.total}</p>
                                <p className="text-[11px] text-gray-500 mt-1 font-black bg-gray-100 px-2 py-0.5 rounded-lg w-fit ml-auto tracking-tighter italic">
                                    {new Date(order.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}
                                </p>
                            </div>
                        </div>

                        <div className={`space-y-3 mb-4 ${view === "grid" ? "max-h-48 overflow-y-auto" : ""}`}>
                            {order.items?.map((item: any, i: number) => (
                                <div key={i} className="border-b border-gray-50 pb-2 last:border-0">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-gray-800"><span className="text-blue-600">x{item.quantity}</span> {item.name}</span>
                                        <span className="font-black text-gray-900">${item.price * item.quantity}</span>
                                    </div>
                                    {item.extrasList?.map((extra: any, j: number) => (
                                        <div key={j} className="pl-3 mt-0.5 flex justify-between text-[10px] text-gray-400 font-bold italic">
                                            <span>+ {extra.quantity} {extra.name}</span>
                                            <span>${extra.price * extra.quantity}</span>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>

                        {order.description && (
                            <div className="mt-3 p-3 bg-amber-50 border-l-4 border-amber-400 rounded-r-2xl">
                                <p className="text-xs text-amber-900 font-medium italic">"{order.description}"</p>
                            </div>
                        )}

  <div className="flex flex-col gap-2 pt-4 border-t border-gray-50 mt-auto">
    {/* Botón de Ticket (Siempre visible para todos) */}
    <button 
        onClick={() => {
            if (currentPlan === 'light') {
                setUpgradeModalInfo({
                    title: "Impresión de Tickets",
                    desc: "Actualizá al Plan GO para poder imprimir comandas y tickets de venta.",
                    plan: "GO"
                });
                setShowUpgradeModal(true);
            } else {
                handlePrint(order);
            }
        }} 
        className={`w-full py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all border ${
            currentPlan === 'light'
            ? 'bg-gray-50 text-gray-300 border-gray-100'
            : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-transparent'
        }`}
    >
        {currentPlan === 'light' ? <Lock size={14} /> : <Printer size={14} />} 
        Imprimir Comanda
    </button>
    
    {/* 🚀 LÓGICA DE SEPARACIÓN: MESA vs DELIVERY */}
    {order.order_type === 'mesa' ? (
        /* 🍽️ SI ES MESA: No mostramos botones de flujo, solo info */
        <div className="py-3 px-4 bg-indigo-50 rounded-xl border border-indigo-100 text-center animate-in fade-in">
            <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest leading-none">
                Gestionado desde panel de salón
            </p>
        </div>
    ) : (
        /* 🛵 SI ES DELIVERY/RETIRO: Flujo normal con "Tomar Pedido" inicial */
        <>
            {order.status === "pendiente" && (
                <div className="flex gap-2">
                    <button onClick={() => updateStatus(order.id, "cancelado")} className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-3 rounded-xl text-xs font-black uppercase flex-1">Rechazar</button>
                    <button onClick={() => updateStatus(order.id, "recibido")} className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase flex-1 flex items-center justify-center gap-2">
                        <Check size={14} /> Tomar Pedido
                    </button>
                </div>
            )}

            {order.status === "recibido" && (
                <button onClick={() => updateStatus(order.id, "en_proceso")} className="w-full bg-orange-500 text-white py-3 rounded-xl text-xs font-black uppercase">
                    {businessType === 'fraccionado' ? 'Preparar Paquete' : 'Enviar a Cocina'}
                </button>
            )}
{order.status === "en_proceso" && (
    <button 
        onClick={() => updateStatus(order.id, "en_camino")} 
        className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase animate-in zoom-in text-center"
    >
        {/* 🚀 CAMBIO DE TEXTO SEGÚN TIPO */}
        {order.order_type === 'retiro' ? 'Notificar: Pedido Listo' : 'Enviar Pedido'}
    </button>
)}

{order.status === "en_camino" && (
    <button 
        onClick={() => updateStatus(order.id, "entregado")} 
        className="w-full bg-green-600 text-white py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-md animate-in zoom-in text-center"
    >
        <CheckCircle size={14} /> 
        {order.order_type === 'retiro' ? 'Entregar al Cliente' : 'Finalizar Pedido'}
    </button>
)}
        </>
    )}

    {/* BOTONES COMUNES PARA TODOS AL FINALIZAR (Chat / Borrar) */}
    {(order.status === "completado" || order.status === "entregado" || order.status === "cancelado") && (
        <div className="flex gap-2 animate-in zoom-in">
            {order.customer_phone && (
                <a href={getWhatsAppLink(order.customer_phone, "chat")} className="flex-1 bg-green-50 text-green-700 border border-green-100 px-3 py-3 rounded-xl hover:bg-green-100 transition-all flex items-center justify-center gap-2 font-black text-[10px] no-underline uppercase">Chat Directo</a>
            )}
            <button onClick={() => deleteOrder(order.id)} className="text-gray-400 hover:text-red-500 p-3 bg-gray-50 rounded-xl border border-gray-100"><Trash2 size={16} /></button>
        </div>
    )}
</div>
                    </div>
                ))}
        </div>

        {/* --- MODAL PARA CREAR MESA --- */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl relative">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900"><XCircle size={24} /></button>
              <h3 className="text-xl font-black text-gray-900 mb-6 tracking-tighter uppercase italic">{editingTableId ? 'Editar Mesa' : 'Nueva Mesa'}</h3>
              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre de la Mesa *</label>
                  <input type="text" placeholder="Ej: Mesa 1" value={newTableName} onChange={(e) => setNewTableName(e.target.value)} className="w-full mt-1 p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-black text-gray-900 focus:border-blue-600 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descripción (Opcional)</label>
                  <input type="text" placeholder="Ej: Planta alta" value={newTableDesc} onChange={(e) => setNewTableDesc(e.target.value)} className="w-full mt-1 p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-black text-gray-900 focus:border-blue-600 outline-none" />
                </div>
                <button onClick={saveTable} disabled={isCreatingTable} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {isCreatingTable ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                  {isCreatingTable ? 'Guardando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* --- MODAL DE UPGRADE PRO REUTILIZABLE --- */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] p-8 max-w-sm w-full shadow-2xl text-center relative overflow-hidden animate-in zoom-in-95 duration-300">
            
            {/* Decoración de fondo */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-50 rounded-full opacity-50 blur-3xl"></div>
            
            <div className="relative z-10">
              <div className="w-16 h-16 bg-gray-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <Lock size={30} />
              </div>
              
              <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase italic tracking-tighter">
                {upgradeModalInfo.title}
              </h3>
              
              <p className="text-gray-500 text-xs mb-8 font-medium leading-relaxed px-2 text-center">
                {upgradeModalInfo.desc} <br/><br/>
                Subí al <span className="text-blue-600 font-black">Plan {upgradeModalInfo.plan}</span> para desbloquear esta y muchas funciones más.
              </p>

              <div className="flex flex-col gap-3">
                <Link 
                  href="/dashboard/settings?focus=phone" 
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 no-underline"
                >
                  Ver Planes <Zap size={14} fill="currentColor" />
                </Link>
                
                <button 
                  onClick={() => setShowUpgradeModal(false)}
                  className="w-full py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors bg-transparent border-none cursor-pointer"
                >
                  Tal vez más tarde
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 🛒 MODAL POS: DETALLE DE MESA Y AGREGAR PRODUCTOS */}
{selectedTableForDetail && (
    <div className="fixed inset-0 z-[1000] flex items-center justify-end bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
        <div className="bg-white w-full max-w-md h-full rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-500">
            {/* Header del Modal */}
            <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
               <div>
    <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
        {selectedTableForDetail.name}
    </span>
    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-gray-900 mt-2">
        {selectedTableForDetail.activeOrder.customer_name}
    </h3>
    {/* AGREGAMOS EL WHATSAPP ACÁ TAMBIÉN */}
    <p className="text-blue-600 font-bold text-xs flex items-center gap-1 mt-1">
        <Phone size={12} strokeWidth={3}/> {selectedTableForDetail.activeOrder.customer_phone}
    </p>
</div>
                <button onClick={() => setSelectedTableForDetail(null)} className="p-3 bg-white rounded-full shadow-lg text-gray-400 hover:text-gray-900 transition-all active:scale-90"><X size={24} strokeWidth={3}/></button>
            </div>

            {/* Cuerpo con scroll */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
                {selectedTableForDetail.activeOrder.payment_status === 'esperando_confirmacion' && (
                    <div className="bg-purple-600 text-white p-5 rounded-3xl shadow-xl animate-in zoom-in mb-6">
                        <div className="flex items-center gap-3 mb-2">
                            <Wallet size={24} />
                            <h4 className="font-black uppercase italic tracking-tighter">Confirmación de Pago</h4>
                        </div>
                        <p className="text-[11px] font-bold opacity-90 leading-tight">
                            El cliente indica que desea pagar por: <span className="bg-white text-purple-600 px-2 py-0.5 rounded ml-1">{selectedTableForDetail.activeOrder.payment_method?.toUpperCase()}</span>
                        </p>
                        
                        {selectedTableForDetail.activeOrder.payment_method === 'transferencia' && (
                            <div className="mt-3 p-3 bg-white/10 rounded-2xl border border-white/20">
                                <p className="text-[9px] font-black text-purple-100 uppercase mb-1">Nombre informado en transferencia:</p>
                                <p className="text-sm font-black">{selectedTableForDetail.activeOrder.payer_name || 'No informado'}</p>
                            </div>
                        )}
                    </div>
                )}
                <div className="space-y-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Consumo de la mesa</p>
                    {selectedTableForDetail.activeOrder.items?.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between items-center bg-gray-50 p-4 rounded-3xl border border-gray-100 shadow-sm">
                            <div className="flex flex-col">
                                <span className="text-sm font-black text-gray-800 leading-none mb-1">{item.name}</span>
                                <span className="text-[10px] font-bold text-blue-600 uppercase">Cantidad: {item.quantity}</span>
                            </div>
                            <span className="text-sm font-black text-gray-900">${item.price * item.quantity}</span>
                        </div>
                    ))}
                </div>

                {/* 🔍 SECCIÓN DE ADICIÓN DE PRODUCTOS */}
              {/* 🛒 SECCIÓN DE ADICIÓN DE PRODUCTOS (POS) */}
                <div className="pt-6 border-t border-dashed border-gray-200">
                    {!showAddTools ? (
                        /* 1. BOTÓN PRINCIPAL (Lo primero que se ve) */
                        <button 
                            onClick={() => setShowAddTools(true)}
                            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
                        >
                            <Plus size={18} strokeWidth={3} /> Agregar al pedido
                        </button>
                    ) : (
                        /* 2. PANEL DESPLEGADO */
                        <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Añadir nuevos items</p>
                                <button onClick={() => { setShowAddTools(false); setIsManualMode(false); }} className="p-1 text-gray-400 hover:text-red-500"><X size={16} /></button>
                            </div>

                            {/* SELECTOR: LISTA O MANUAL */}
                            <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
                                <button onClick={() => setIsManualMode(false)} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${!isManualMode ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>Mis Productos</button>
                                <button onClick={() => setIsManualMode(true)} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${isManualMode ? 'bg-white shadow-sm text-orange-600' : 'text-gray-400'}`}>Carga Manual</button>
                            </div>

                            {isManualMode ? (
                                /* 📝 CARGA MANUAL CON NOMBRE, DESC Y PRECIO */
                                <div className="bg-orange-50 p-4 rounded-3xl border border-orange-100 space-y-3 animate-in fade-in">
                                    <input type="text" placeholder="Nombre (Ej: Descorche)" value={manualName} onChange={(e) => setManualName(e.target.value)} className="w-full p-3 bg-white rounded-xl border-none text-xs font-bold shadow-sm outline-none" />
                                    <input type="text" placeholder="Descripción (Ej: Vino tinto)" value={manualDesc} onChange={(e) => setManualDesc(e.target.value)} className="w-full p-3 bg-white rounded-xl border-none text-xs font-bold shadow-sm outline-none" />
                                    <input type="number" placeholder="Precio ($)" value={manualPrice} onChange={(e) => setManualPrice(e.target.value)} className="w-full p-3 bg-white rounded-xl border-none text-xs font-bold shadow-sm outline-none" />
                                    <button 
                                        onClick={() => {
                                            addItemToOrder(selectedTableForDetail.activeOrder, { name: manualName, price: Number(manualPrice) });
                                            setManualName(""); setManualDesc(""); setManualPrice("");
                                        }}
                                        disabled={!manualName || !manualPrice || isAddingItem}
                                        className="w-full py-3 bg-orange-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest active:scale-95 disabled:opacity-50"
                                    >
                                        {isAddingItem ? 'Agregando...' : 'Confirmar Item Manual'}
                                    </button>
                                </div>
                            ) : (
                                /* 🔎 BUSCADOR Y LISTA DE PRODUCTOS CARGADOS */
                                <div className="space-y-3 animate-in fade-in">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                        <input 
                                            type="text" placeholder="Buscar mi producto..." 
                                            value={productSearch} onChange={(e) => setProductSearch(e.target.value)}
                                            className="w-full pl-9 pr-4 py-3 bg-gray-50 rounded-xl border-none text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                                        {allProducts
                                            .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                                            .map((prod) => (
                                                <button 
                                                    key={prod.id}
                                                    onClick={() => addItemToOrder(selectedTableForDetail.activeOrder, { name: prod.name, price: Number(prod.price) })}
                                                    disabled={isAddingItem}
                                                    className="flex justify-between items-center p-4 bg-white hover:bg-blue-600 hover:text-white group rounded-2xl border border-gray-100 transition-all text-left shadow-sm active:scale-95"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black uppercase tracking-tight">{prod.name}</span>
                                                        <span className="text-[8px] font-bold text-gray-400 group-hover:text-blue-100 uppercase italic line-clamp-1">{prod.description}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[11px] font-black text-blue-600 group-hover:text-white">${prod.price}</span>
                                                        <div className="bg-blue-50 text-blue-600 p-1.5 rounded-lg group-hover:bg-white/20 group-hover:text-white"><Plus size={14} strokeWidth={4}/></div>
                                                    </div>
                                                </button>
                                            ))
                                        }
                                        {allProducts.length > 0 && allProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                                            <div className="text-center py-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                                                <p className="text-[10px] font-black text-gray-400 uppercase">No encontramos "{productSearch}"</p>
                                                <button onClick={() => setIsManualMode(true)} className="mt-2 text-[9px] font-black text-blue-600 uppercase underline">Crear item manual</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            
            {/* 💰 FOOTER COMPACTO (Se esconde al agregar productos) */}
            {!showAddTools && (
                <div className="p-6 bg-gray-900 text-white rounded-t-[2.5rem] animate-in slide-in-from-bottom-5 duration-300">
                    <div className="flex justify-between items-end mb-4 px-2">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Total acumulado</span>
                            <span className="text-2xl font-black italic tracking-tighter text-white">
                                ${selectedTableForDetail.activeOrder.total}
                            </span>
                        </div>
                        <Zap size={22} className="text-yellow-400 fill-yellow-400 opacity-50" />
                    </div>

                    <div className="flex flex-col gap-2">
                        {/* Botón Imprimir más chico */}
                  <button 
        onClick={() => {
            if (currentPlan === 'light') {
                setShowUpgradeModal(true);
            } else {
                handlePrint(selectedTableForDetail.activeOrder);
            }
        }}
        className={`w-full py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all border ${
            currentPlan === 'light'
            ? 'bg-white/5 text-gray-500 border-white/10'
            : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
        }`}
    >
        {currentPlan === 'light' ? <Lock size={16} /> : <Printer size={16} />} Imprimir Comanda
    </button>

                        
<button  
    onClick={() => setShowConfirmPaymentModal(selectedTableForDetail.activeOrder)}
    className="w-full py-3 bg-green-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-xl hover:bg-green-600 active:scale-95 transition-all"
>
    <CheckCircle size={16} /> Confirmar Pago y Cerrar
</button>
                    </div>
                </div>
            )}
            
        </div>
    </div>
)}
{isResModalOpen && (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95">
            <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">
                    {resTable?.status === 'reservada' ? 'Detalle Reserva' : 'Nueva Reserva'}: {resTable?.name}
                </h3>
                {resTable?.status === 'reservada' && (
                    <button onClick={() => deleteReservation(resTable.id)} className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors">
                        <Trash2 size={18} />
                    </button>
                )}
            </div>
            
            <div className="space-y-4">
                <div>
                    <label className="text-[9px] font-black text-blue-600 uppercase ml-2">Nombre del Cliente *</label>
                    <input type="text" placeholder="Ej: Juan Pérez" value={resData.name} onChange={e => setResData({...resData, name: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-blue-600" />
                </div>

                <div className="flex gap-2">
                    <div className="flex-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Fecha</label>
                        <input type="date" value={resData.date} onChange={e => setResData({...resData, date: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm outline-none" />
                    </div>
                    <div className="w-32">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Hora</label>
                        <input type="time" value={resData.time} onChange={e => setResData({...resData, time: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm outline-none" />
                    </div>
                </div>

                <div>
                    <label className="text-[9px] font-black text-blue-600 uppercase ml-2">Cantidad de Personas *</label>
                    <input type="number" placeholder="Ej: 4" value={resData.guests} onChange={e => setResData({...resData, guests: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm outline-none" />
                </div>

                <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Notas / Descripción</label>
                    <textarea placeholder="Ej: Traen torta..." value={resData.description} onChange={e => setResData({...resData, description: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm outline-none h-20 resize-none" />
                </div>
                
                <div className="flex gap-2 pt-4">
                    <button onClick={() => { setIsResModalOpen(false); setResData({ name: '', guests: '', date: '', time: '', description: '' }); }} className="flex-1 py-4 text-[10px] font-black uppercase text-gray-400">Cerrar</button>
                    <button 
                        onClick={saveReservation} 
                        disabled={!resData.name || !resData.guests}
                        className={`flex-[2] py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all ${(!resData.name || !resData.guests) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white active:scale-95'}`}
                    >
                        {resTable?.status === 'reservada' ? 'Actualizar' : 'Confirmar Reserva'}
                    </button>
                </div>
            </div>
        </div>
        
    </div>
)}
{showConfirmPaymentModal && (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl text-center animate-in zoom-in-95 duration-300 border border-white">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <Banknote size={40} strokeWidth={2.5} />
                    </div>
                    
                    <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">
                        ¿Confirmar Cobro?
                    </h3>
                    
                    <p className="text-sm text-slate-500 mb-8 font-medium leading-tight px-4 text-center">
                        Vas a marcar la cuenta de <b>{showConfirmPaymentModal.customer_name}</b> como pagada y la mesa quedará libre.
                    </p>

                    <div className="flex flex-col gap-3">
                        <button  
                            onClick={async () => {
                                await updateStatus(showConfirmPaymentModal.id, 'completado');
                                setShowConfirmPaymentModal(null);
                                setSelectedTableForDetail(null);
                            }}
                            className="w-full bg-green-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-green-200 hover:bg-green-700 transition-all active:scale-95"
                        >
                            ¡Sí, Pago Recibido!
                        </button>
                        
                        <button  
                            onClick={() => setShowConfirmPaymentModal(null)}
                            className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>}>
      <OrdersContent />
    </Suspense>
  );
}