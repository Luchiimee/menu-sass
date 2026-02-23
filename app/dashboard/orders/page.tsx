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
  LayoutList, Pencil,X, 
} from "lucide-react";
import Link from "next/link";

// --- INTERFAZ PARA MESAS ---
interface Table {
    id: string;
    name: string;
    status: string;
    description?: string;
}

const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

function OrdersContent() {
  // --- INICIALIZACIÓN DE HOOKS ---
  const router = useRouter(); // <--- ESTA ES LA LÍNEA QUE SOLUCIONA EL ERROR
  const searchParams = useSearchParams();
  
  // ESTADOS DE LA TABLA Y EDICIÓN
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const getArgentinaDate = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
};
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
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

  // --- FUNCIONES DE APOYO UI (Se mantienen igual) ---
  const getStatusBadge = (status: string, orderType?: string) => {
    switch (status) {
      case "pendiente":
        return <span className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Clock size={10} /> Pendiente</span>;
      case "en_proceso":
        return <span className="bg-orange-100 text-orange-800 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><ChefHat size={10} /> Cocina</span>;
      case "en_camino":
        return (
          <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            <Bike size={10} /> {orderType === 'mesa' ? 'Sirviendo' : 'En camino'}
          </span>
        );
      case "entregado":
      case "completado":
        return <span className="bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Check size={10} /> Finalizado</span>;
      case "cancelado":
        return <span className="bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><XCircle size={10} /> Cancelado</span>;
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
    if (!newTableName.trim() || !restaurantId) return;
    setIsCreatingTable(true);

    if (editingTableId) {
      const { error } = await supabase
        .from('tables')
        .update({ name: newTableName, description: newTableDesc })
        .eq('id', editingTableId);

      if (!error) {
        setEditingTableId(null); setNewTableName(''); setNewTableDesc(''); fetchTables(restaurantId); setIsModalOpen(false);
      }
    } else {
      const { error } = await supabase.from('tables').insert({
          restaurant_id: restaurantId, name: newTableName, description: newTableDesc, status: 'libre'
      });
      if (!error) {
          setNewTableName(''); setNewTableDesc(''); fetchTables(restaurantId); setIsModalOpen(false); setShowTables(true);
      }
    }
    setIsCreatingTable(false);
  };

  const openEditModal = (mesa: any) => {
    setEditingTableId(mesa.id);
    setNewTableName(mesa.name);
    setNewTableDesc(mesa.description || '');
    setIsModalOpen(true);
  };

  const toggleTableStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'libre' ? 'reservada' : 'libre';
    await supabase.from('tables').update({ status: newStatus }).eq('id', id);
    fetchTables(restaurantId!); 
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

 // --- 1. WHATSAPP ---
  const toggleWhatsapp = async () => {
    if (!receiveWhatsapp && (!restaurantPhone || restaurantPhone.trim() === "")) {
      setShowPhoneAlert(true); return;
    }
    const newValue = !receiveWhatsapp;
    setReceiveWhatsapp(newValue);
    await supabase.from("restaurants").update({ receive_whatsapp: newValue }).eq("id", restaurantId);
  };

  // --- 2. CARGA DE PEDIDOS (UNIFICADA) ---
 const loadOrders = async () => {
    if (!restaurantId || isLocked) return;
    try {
      // Definimos el inicio y el fin del día seleccionado
      const startOfDay = `${selectedDate}T00:00:00.000Z`;
      const endOfDay = `${selectedDate}T23:59:59.999Z`;

      const { data: ords } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        // Filtramos exactamente dentro de ese día
        .gte("created_at", startOfDay)
        .lte("created_at", endOfDay) 
        .order("created_at", { ascending: false });
        
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

    const itemsHtml = order.items.map((item: any) => `
        <div style="margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px;">
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
                <span>${item.quantity}x ${item.name}</span>
                <span>$${(item.price * item.quantity).toLocaleString()}</span>
            </div>
            ${item.extrasList?.map((e: any) => `<div style="font-size: 11px; margin-left: 10px;">+ ${e.name}</div>`).join('') || ''}
        </div>`).join("");

    printWindow.document.write(`
        <html>
            <body style="font-family: monospace; width: 280px; padding: 10px; margin: 0 auto;">
                <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px;">
                    <h2 style="margin:0;">${restaurantName}</h2>
                    <p>TICKET #${order.id.slice(0, 5).toUpperCase()}</p>
                </div>
                <div style="font-size: 13px; margin: 10px 0;">
                    <p>CLIENTE: ${order.customer_name}</p>
                    <p>UBICACIÓN: ${direccionExhibida}</p>
                    ${order.description ? `<div style="border: 1px solid #000; padding: 5px;">NOTA: ${order.description}</div>` : ''}
                </div>
                ${itemsHtml}
                <div style="border-top: 2px dashed #000; padding-top: 10px; font-size: 18px; font-weight: bold; display: flex; justify-content: space-between;">
                    <span>TOTAL:</span><span>$${Number(order.total).toLocaleString()}</span>
                </div>
                <p style="text-align: center; font-size: 10px; margin-top: 20px;">Snappy Tu Menú Digital</p>
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
        setRestaurantName(rest.name); setRestaurantId(rest.id); setRestaurantPhone(rest.phone);
        setReceiveWhatsapp(rest.receive_whatsapp ?? true);
        setIsLocked(rest.subscription_plan === "light" && user.email !== 'luchiimee2@gmail.com');
      }
      setLoading(false);
    };
    initApp();
  }, []);

  useEffect(() => {
    loadOrders();
    if (restaurantId) fetchTables(restaurantId);
  }, [selectedDate, restaurantId, isLocked]);

  useEffect(() => {
    if (!restaurantId || isLocked) return;

    const channel = supabase.channel("orders_channel")
      .on("postgres_changes", 
        { event: "INSERT", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` }, 
        (payload: any) => {
          setOrders((prev) => [payload.new, ...prev]);
          // SONIDO AQUÍ
          try {
            const audio = new Audio('/notification.mp3');
            audio.play().catch(() => console.log("Esperando clic para sonar"));
          } catch (e) {}
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` }, () => loadOrders())
      .subscribe();

    const handleVisibility = () => { if (document.visibilityState === 'visible') loadOrders(); };
    window.addEventListener('visibilitychange', handleVisibility);
    return () => { 
      supabase.removeChannel(channel); 
      window.removeEventListener('visibilitychange', handleVisibility); 
    };
  }, [restaurantId, isLocked]);
  if (loading) {
    
    return (
      <div className="p-10 flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin text-blue-600" />
      </div>
    );
  }
  return (
    <div className="max-w-6xl mx-auto min-h-screen p-2 pt-20 md:pt-28 lg:pt-8 relative font-sans">
      
 
  {/* --- LÓGICA DE BLOQUEO (Se mantiene visible la sección pero tapada) --- */}
{isLocked && (
  <div className="fixed inset-0 z-50 backdrop-blur-sm bg-white/60 flex items-center justify-center p-4">
    <div className="bg-white shadow-2xl p-10 rounded-[2.5rem] max-w-md w-full text-center border border-gray-100 relative">
      
      {/* Botón X para volver al Dashboard */}
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
      <p className="text-gray-500 mb-8 text-sm">Panel de control exclusivo del <b>Plan Plus</b>.</p>
      
      <div className="flex flex-col gap-3">
         <Link href="/dashboard/settings" className="w-full py-4 rounded-2xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition shadow-lg uppercase text-xs tracking-widest">
           Actualizar a Plus <Zap size={18} fill="currentColor" className="inline ml-1" />
         </Link>
         <button onClick={() => router.push('/dashboard')} className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2 hover:text-gray-600">
           Volver al inicio
         </button>
      </div>
    </div>
  </div>
)}

      <div className={`${isLocked ? "blur-sm pointer-events-none opacity-50 select-none overflow-hidden h-full" : ""}`}>
        
        {/* --- REORGANIZACIÓN: REGLÓN SUPERIOR --- */}
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

          {/* Configuración de WhatsApp Compacta - Versión Stark UI */}
<div className="flex items-center gap-4 bg-slate-900/90 backdrop-blur-md p-2.5 px-4 rounded-2xl border border-slate-800 shadow-2xl transition-all duration-300">
    <div className="flex items-center gap-3">
        {/* Icono con aura de estado */}
        <div className={`relative p-2 rounded-xl transition-all duration-500 ${
            receiveWhatsapp 
            ? 'bg-green-500/20 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]' 
            : 'bg-slate-800 text-slate-500'
        }`}>
            <MessageCircle size={18} fill={receiveWhatsapp ? "currentColor" : "none"} className="relative z-10" />
            {receiveWhatsapp && (
                <span className="absolute inset-0 rounded-xl bg-green-500/20 animate-pulse"></span>
            )}
        </div>

        <div className="flex flex-col">
            <p className="text-white font-black text-[10px] leading-none mb-1 tracking-widest uppercase italic opacity-90">
                PEDIDOS
            </p>
            <p className={`text-[9px] font-bold leading-tight uppercase transition-colors duration-300 ${
                receiveWhatsapp ? 'text-green-400' : 'text-slate-500'
            }`}>
                {receiveWhatsapp ? "Panel y WhatsApp" : "Solo Panel"}
            </p>
        </div>
    </div>

    {/* Toggle Switch estilizado */}
    <button 
        onClick={toggleWhatsapp} 
        className={`group relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none ${
            receiveWhatsapp ? 'bg-green-500' : 'bg-slate-700'
        }`}
    >
        <span 
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-300 ease-in-out ${
                receiveWhatsapp ? 'translate-x-6' : 'translate-x-1'
            } group-active:scale-90`} 
        />
    </button>
</div>
        </div>

        {/* --- BARRA DE CONTROL CENTRAL (REDISEÑADA) --- */}
        <div className="flex flex-col lg:flex-row gap-3 mb-4 px-2">
            
            {/* Control de Fecha y Calendario */}
            <div className="flex-1 flex items-center justify-between bg-white p-2 rounded-[1.5rem] border border-gray-100 shadow-sm">
                <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl">
                   <button 
    onClick={() => setSelectedDate(getArgentinaDate())}
    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${selectedDate === getArgentinaDate() ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
>
    Hoy
</button>
                  <button 
    onClick={() => setSelectedDate(getArgentinaDate(-1))}
    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${selectedDate === getArgentinaDate(-1) ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
>
    Ayer
</button>
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

            {/* Contador de Ventas e Iconos de Vista */}
            <div className="flex items-center gap-3">
                <div className="flex-1 lg:flex-none flex items-center gap-4 bg-green-500 text-white p-3 px-6 rounded-[1.5rem] shadow-lg shadow-green-200">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-80">Total del día</span>
                        <span className="text-xl font-black tracking-tighter">
                            ${orders.filter(o => o.status === "completado" || o.status === "entregado").reduce((acc, curr) => acc + Number(curr.total), 0).toLocaleString()}
                        </span>
                    </div>
                    <Zap size={20} fill="currentColor" className="opacity-40" />
                </div>

                <div className="flex bg-white p-1.5 rounded-[1.5rem] border border-gray-100 shadow-sm gap-1">
                    <button onClick={() => changeView("list")} className={`p-2.5 rounded-xl transition-all ${view === "list" ? "bg-gray-900 text-white shadow-md" : "text-gray-400"}`}>
                        <List size={20} />
                    </button>
                    <button onClick={() => changeView("grid")} className={`p-2.5 rounded-xl transition-all ${view === "grid" ? "bg-gray-900 text-white shadow-md" : "text-gray-400"}`}>
                        <LayoutGrid size={20} />
                    </button>
                </div>
            </div>
        </div>

       {/* --- BLOQUE UNIFICADO DE GESTIÓN DE MESAS --- */}
        <div className="px-2 mb-8">
            <div className="bg-white border border-gray-100 rounded-[1.5rem] shadow-sm overflow-hidden transition-all">
                
                {/* CABECERA: Toggle y Botón Crear en un solo nivel */}
             {/* CABECERA: Toggle y Botón Crear en un solo nivel */}
<div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-50 bg-slate-50/30">
    <button 
        onClick={() => setShowTables(!showTables)}
        className="flex items-center gap-3 hover:opacity-80 transition-all group"
    >
        <div className={`p-2 rounded-xl transition-all duration-300 ${showTables ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-gray-100 text-gray-400'}`}>
            <Store size={18} />
        </div>
        <div className="flex flex-col items-start text-left">
            <span className="text-xs font-black uppercase tracking-widest text-gray-700">Gestión de Salón / Mesas</span>
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">
                {availableTables.length} Mesas configuradas
            </span>
        </div>

        {/* FLECHA MEJORADA: Más grande, con fondo y ultra visible */}
        <div className={`ml-2 p-1.5 rounded-full transition-all duration-300 ${
            showTables 
            ? 'bg-blue-100 text-blue-600 rotate-180 shadow-inner' 
            : 'bg-gray-200 text-gray-500 group-hover:bg-gray-300'
        }`}>
            <ChevronDown size={20} strokeWidth={3} /> 
        </div>
    </button>

    {/* BOTÓN + CREAR MESA */}
    <button 
        onClick={(e) => {
            e.stopPropagation(); 
            setIsModalOpen(true);
        }}
        className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-md active:scale-95"
    >
        <Plus size={14} /> Crear Mesa
    </button>
</div>

                {/* CONTENIDO DESPLEGABLE: Solo el listado */}
                {showTables && (
                    <div className="p-6 animate-in slide-in-from-top-2 duration-300">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
    {availableTables.map((mesa) => (
        <div key={mesa.id} className="bg-white p-5 rounded-[1.5rem] border-2 border-gray-100 flex flex-col items-center text-center shadow-sm relative group hover:border-blue-200 transition-all overflow-hidden">
            
            {/* BOTONES FLOTANTES (Esquina superior derecha) */}
            <div className="absolute top-2 right-2 flex flex-col gap-2 z-20">
                <button 
                    onClick={(e) => { e.stopPropagation(); openEditModal(mesa); }} 
                    className="bg-gray-50 p-2 rounded-full text-blue-600 shadow-sm hover:bg-blue-50 transition-all"
                >
                    <Pencil size={14} /> 
                </button>
                <button 
                    onClick={(e) => { 
                        e.stopPropagation();
                        if(confirm(`¿Eliminar ${mesa.name}?`)) {
                            supabase.from('tables').delete().eq('id', mesa.id).then(() => fetchTables(restaurantId!));
                        }
                    }}
                    className="bg-gray-50 p-2 rounded-full text-red-500 shadow-sm hover:bg-red-50 transition-all"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            {/* ICONO CENTRAL (Con más margen arriba para que no lo tapen los botones) */}
            <span className="text-4xl mt-4 mb-2 select-none">
                {mesa.status === 'reservada' ? '🔒' : '🍽️'}
            </span>
            
            <span className="font-black text-sm text-gray-900 uppercase mb-1 tracking-tighter">
                {mesa.name}
            </span>
            
            <p className="text-[10px] text-gray-500 font-bold italic mb-4 line-clamp-1 h-3">
                {mesa.description || "Sin descripción"}
            </p>

            <button 
                onClick={() => toggleTableStatus(mesa.id, mesa.status)}
                className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase transition-all border-2 shadow-sm ${
                    mesa.status === 'reservada' 
                    ? 'bg-red-50 border-red-600 text-red-600' 
                    : 'bg-green-50 border-green-600 text-green-700'
                }`}
            >
                {mesa.status === 'reservada' ? 'Ocupada' : 'Libre'}
            </button>
        </div>
    ))}
</div>
                            </div>
                        )}
                    </div>
                </div>
        
               {/* --- CONTENEDOR DE PEDIDOS (LISTA Y GRILLA) --- */}
        <div className={view === "list" ? "space-y-4 px-2" : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 align-start px-2 pb-20"}>
          
          {/* Estado Vacío */}
          {orders.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-400 bg-white rounded-[2.5rem] border border-dashed border-gray-100">
              <ShoppingBag size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold text-sm uppercase tracking-widest">No hay pedidos para esta fecha</p>
            </div>
          )}

          {/* Mapeo de Pedidos con UI Completa */}
        {orders.map((order) => (
  <div 
  key={order.id} 
  id={`order-${order.id}`} // <--- AGREGUE ESTA LÍNEA (El destino del GPS)
  className={`p-4 rounded-3xl transition-all duration-500 border-2 ${
    highlightedId === order.id 
    ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-100 scale-[1.02]' 
    : 'border-white bg-white shadow-sm'
  }`} // <--- REEMPLACE SU CLASSNAME POR ESTE (Para que se pinte de azul)
>
              <div>
                <div className="flex justify-between items-start mb-4 border-b border-gray-50 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono font-bold text-gray-400 text-xs tracking-tighter">#{order.id.slice(0, 5)}</span>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="space-y-0.5 mb-2">
                      <div className="flex items-center gap-1 text-sm font-black text-gray-900 tracking-tight">
                        <User size={14} className="text-gray-300" /> {order.customer_name}
                      </div>
                      {order.customer_phone && (
                        <div className="flex items-center gap-1 text-[10px] font-black text-blue-600 bg-blue-50 w-fit px-2 py-0.5 rounded-md">
                          <Phone size={10} /> {order.customer_phone}
                        </div>
                      )}
                      
                    </div>
                    {/* DIRECCIÓN: Solo se muestra si es Delivery y existe el dato */}
  {order.order_type === 'delivery' && order.address && (
    <div className="flex items-center gap-1 text-[10px] font-black text-orange-600 bg-orange-50 w-fit px-2 py-0.5 rounded-md mt-1 border border-orange-100 animate-in fade-in slide-in-from-left-2">
      <MapPin size={10} strokeWidth={3} /> {order.address}
    </div>
  )}
                    
                    
                    {/* Badge de Tipo de Pedido (Mesa / Delivery / Retiro) */}
                    <div className="flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-widest">
                      <span className={`flex items-center gap-1 px-2 py-1 rounded-lg ${order.order_type === 'mesa' ? 'bg-purple-600 text-white shadow-lg shadow-purple-100' : 'bg-gray-100 text-gray-500'}`}>
                        {order.order_type === "delivery" ? <Bike size={12} /> : order.order_type === "retiro" ? <Store size={12} /> : <MapPin size={12} />}
                        {order.order_type === 'mesa' ? `MESA ${order.table_number || ''}` : order.order_type}
                      </span>
                      <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg text-gray-500 italic border border-gray-200">
                        {order.payment_method === "transferencia" ? <CreditCard size={12} /> : <Banknote size={12} />}
                        {order.payment_method}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
  {/* INFO DE CUPÓN: Solo aparece si existe el código */}
  {order.coupon_code && (
    <div className="mb-2 animate-in fade-in slide-in-from-right-2">
      <span className="text-[9px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-100 uppercase tracking-tighter italic">
        Cupón: {order.coupon_code} (-${order.discount_amount})
      </span>
    </div>
  )}

  <p className="font-black text-2xl text-gray-900 tracking-tighter">${order.total}</p>
  <p className="text-[9px] text-gray-300 mt-1 font-bold italic">
    {new Date(order.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
  </p>
</div>
                </div>

                {/* Lista de Items del Pedido */}
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
                    <p className="text-[9px] font-black text-amber-700 uppercase mb-1 tracking-widest">Nota:</p>
                    <p className="text-xs text-amber-900 font-medium italic">"{order.description}"</p>
                  </div>
                )}
              </div>

             
           {/* ACCIONES DE ESTADO - PROTOCOLO COMPLETO */}
              <div className="flex flex-col gap-2 pt-4 border-t border-gray-50 mt-auto">
                <button onClick={() => handlePrint(order)} className="w-full bg-gray-50 text-gray-500 hover:bg-gray-100 py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all">
                  <Printer size={14} /> Ticket
                </button>
                
                {/* 1. ESTADO: PENDIENTE */}
                {order.status === "pendiente" && (
                  <div className="flex gap-2">
                    <button onClick={() => updateStatus(order.id, "cancelado")} className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-3 rounded-xl text-xs font-black uppercase transition-all flex-1">Rechazar</button>
                    <button onClick={() => updateStatus(order.id, "en_proceso")} className="bg-gray-900 text-white hover:bg-black px-6 py-3 rounded-xl text-xs font-black uppercase transition-all shadow-lg flex items-center justify-center gap-2 flex-1"><ChefHat size={14} /> Cocinar</button>
                  </div>
                )}

                {/* 2. ESTADO: EN COCINA */}
                {order.status === "en_proceso" && (
                  <button onClick={() => updateStatus(order.id, "en_camino")} className="bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 rounded-xl text-xs font-black uppercase transition-all shadow-lg flex items-center justify-center gap-2 w-full">
                    {order.order_type === 'mesa' ? 'Listo para servir' : 'Enviar Pedido'}
                  </button>
                )}

                {/* 3. ESTADO: EN CAMINO (Acá están los botones que faltaban) */}
                {order.status === "en_camino" && (
                  <div className="flex flex-col gap-2 animate-in fade-in zoom-in-95">
                    {order.customer_phone && order.order_type !== 'mesa' && (
                      <a 
                        href={getWhatsAppLink(order.customer_phone, "notify")} 
                        className="w-full bg-green-500 text-white hover:bg-green-600 py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all shadow-md no-underline"
                      >
                        <MessageCircle size={14} fill="currentColor" /> Notificar "Salió el pedido"
                      </a>
                    )}
                    <button 
                      onClick={() => updateStatus(order.id, "entregado")} 
                      className="w-full bg-orange-500 text-white hover:bg-orange-600 py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all shadow-md"
                    >
                      <CheckCircle size={14} /> Pedido Entregado / Cobrado
                    </button>
                  </div>
                )}

                {/* 4. ESTADO: FINALIZADO */}
                {(order.status === "completado" || order.status === "entregado" || order.status === "cancelado") && (
                  <div className="flex gap-2">
                    {order.customer_phone && (
                      <a href={getWhatsAppLink(order.customer_phone, "chat")} className="flex-1 bg-green-50 text-green-700 border border-green-100 px-3 py-3 rounded-xl hover:bg-green-100 transition-all flex items-center justify-center gap-2 font-black text-[10px] no-underline uppercase">Chat Directo</a>
                    )}
                    <button onClick={() => deleteOrder(order.id)} className="text-gray-400 hover:text-red-500 p-3 transition-all bg-gray-50 rounded-xl border border-gray-100"><Trash2 size={16} /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
                {/* --- MODAL PARA CREAR MESA (EL QUE FALTABA) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-gray-100 relative">
            
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-900"
            >
              <XCircle size={24} />
            </button>

            <h3 className="text-xl font-black text-gray-900 mb-6 tracking-tighter uppercase italic">
    {editingTableId ? 'Editar Mesa' : 'Nueva Mesa'}
</h3>
            
            <div className="space-y-5">
              {/* Campo Nombre */}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre de la Mesa *</label>
                <input 
                  type="text" 
                  placeholder="Ej: Mesa 1, Barra, Vip..." 
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="w-full mt-1 p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-black text-gray-900 focus:border-blue-600 outline-none transition-all"
                />
              </div>

              {/* Campo Descripción */}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descripción (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Ej: Cerca de la ventana, Planta alta..." 
                  value={newTableDesc}
                  onChange={(e) => setNewTableDesc(e.target.value)}
                  className="w-full mt-1 p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-black text-gray-900 focus:border-blue-600 outline-none transition-all"
                />
              </div>
              
<button 
    onClick={saveTable} 
    disabled={isCreatingTable}
    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-4"
>
    {isCreatingTable ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
    {isCreatingTable ? 'Guardando...' : editingTableId ? 'Guardar Cambios' : 'Confirmar y Crear'}
</button>
            </div>
          </div>
        </div>
      )}
              </div>
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