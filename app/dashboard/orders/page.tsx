"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useSearchParams } from 'next/navigation';
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
  LayoutList
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

export default function OrdersPage() {
  
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
  // ESTADOS NUEVOS PARA GESTIÓN DE MESAS Y UI
  const [showTables, setShowTables] = useState(false);
  const [availableTables, setAvailableTables] = useState<Table[]>([]);
  const fetchTables = async (id: string) => {
    const { data } = await supabase
      .from('tables')
      .select('*')
      .eq('restaurant_id', id)
      .order('name', { ascending: true });
    setAvailableTables(data || []);
  };
  const addTable = async () => {
    if (!newTableName.trim() || !restaurantId) return;
    setIsCreatingTable(true);
    
    const { error } = await supabase.from('tables').insert({
        restaurant_id: restaurantId,
        name: newTableName,
        description: newTableDesc, // <--- Ahora enviamos la descripción
        status: 'libre'
    });

    if (!error) {
        setNewTableName('');
        setNewTableDesc(''); // Limpiamos el input después de crear
        fetchTables(restaurantId); // Refrescamos la lista automáticamente
        setIsModalOpen(false);
        setShowTables(true)
    } else {
        console.error("Error al crear mesa:", error);
        alert("No se pudo crear la mesa. Revisá si la columna 'description' existe en Supabase.");
    }
    setIsCreatingTable(false);
  };

  // Esta función es nueva y es la que hace la magia del On/Off
  const toggleTableStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'libre' ? 'reservada' : 'libre';
    await supabase.from('tables').update({ status: newStatus }).eq('id', id);
    fetchTables(restaurantId!); 
  };

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const dateInputRef = useRef<HTMLInputElement>(null);

  const formatDateDisplay = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

 

  useEffect(() => {
    const savedView = localStorage.getItem("ordersView");
    if (savedView) setView(savedView);
  }, []);

  const changeView = (newView: string) => {
    setView(newView);
    localStorage.setItem("ordersView", newView);
  };

  // --- CARGA DE MESAS (Solo si no está bloqueado) ---
  useEffect(() => {
    if (!restaurantId || isLocked) return;
    const fetchTables = async () => {
        const { data } = await supabase
            .from('tables')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('name', { ascending: true });
        setAvailableTables(data || []);
    };
    fetchTables();
  }, [restaurantId, isLocked]);

  useEffect(() => {
    let mounted = true;
    const loadOrders = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const isSuperAdmin = user.email === "luchiimee2@gmail.com";

        const { data: rest } = await supabase
          .from("restaurants")
          .select("id, subscription_plan, name, receive_whatsapp, phone")
          .eq("user_id", user.id)
          .single();

        if (mounted && rest) {
          setRestaurantName(rest.name || "nuestro local");
          setRestaurantId(rest.id);
          setRestaurantPhone(rest.phone);
          setReceiveWhatsapp(rest.receive_whatsapp ?? true);

          if (
            isSuperAdmin ||
            rest.subscription_plan === "plus" ||
            rest.subscription_plan === "max"
          ) {
            setIsLocked(false);
            const { data: ords } = await supabase
              .from("orders")
              .select("*")
              .eq("restaurant_id", rest.id)
              .gte("created_at", `${selectedDate}T00:00:00`)
              .lte("created_at", `${selectedDate}T23:59:59`)
              .neq("order_type", "apertura")
              .neq("customer_name", "Venta Detectada (Cierre)")
              .neq("origin_plan", "light")
              .order("created_at", { ascending: false });

            setOrders(ords || []);
          } else {
            setIsLocked(true);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadOrders();
    return () => {
      mounted = false;
    };
  }, [selectedDate]);

  useEffect(() => {
    if (!restaurantId || isLocked) return;
    const channel = supabase
      .channel("orders_channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload: any) => {
          if (payload.new && payload.new.created_at) {
            const orderDate = new Date(payload.new.created_at).toISOString().split('T')[0];
            if (orderDate !== selectedDate) return; 
          }

          if (payload.new && payload.new.order_type === "apertura") return;
          if (payload.new && payload.new.customer_name === "Venta Detectada (Cierre)") return;

          if (payload.eventType === "INSERT") {
            setOrders((prev) => [payload.new, ...prev]);
          } 
          else if (payload.eventType === "UPDATE") {
            setOrders((prev) =>
              prev.map((o) => (o.id === payload.new.id ? payload.new : o))
            );
          } 
          else if (payload.eventType === "DELETE") {
            setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, isLocked, selectedDate]);

  const updateStatus = async (id: string, newStatus: string) => {
    setOrders(
      orders.map((o) => (o.id === id ? { ...o, status: newStatus } : o)),
    );
    await supabase.from("orders").update({ status: newStatus }).eq("id", id);
  };

  const deleteOrder = async (id: string) => {
    if (!confirm("¿Eliminar este pedido del historial?")) return;
    setOrders(orders.filter((o) => o.id !== id));
    await supabase.from("orders").delete().eq("id", id);
  };

  const getWhatsAppLink = (phone: string, type: "notify" | "chat") => {
    let message = "";
    if (type === "notify")
      message = `Hola! 🛵 Tu pedido de *${restaurantName}* acaba de salir hacia tu dirección.`;
    return `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendiente":
        return (
          <span className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            <Clock size={10} /> Pendiente
          </span>
        );
      case "en_proceso":
        return (
          <span className="bg-orange-100 text-orange-800 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            <ChefHat size={10} /> Cocina
          </span>
        );
        // ... los demás badges se mantienen igual ...
      default:
        return <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold">{status}</span>;
    }
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
const handlePrint = (order: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const itemsHtml = order.items.map((item: any) => `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-family: monospace;">
            <span>${item.quantity}x ${item.name}</span>
            <span>$${item.price * item.quantity}</span>
        </div>
    `).join("");

    printWindow.document.write(`
        <html>
            <body style="font-family: monospace; width: 300px; padding: 20px;">
                <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
                    <h2 style="margin:0">${restaurantName}</h2>
                    <p>Ticket #${order.id.slice(0, 5)}</p>
                </div>
                <p><strong>Cliente:</strong> ${order.customer_name}</p>
                <div style="margin-top:15px;">${itemsHtml}</div>
                <div style="border-top: 1px dashed #000; margin-top: 10px; padding-top: 10px; text-align: center;">
                    <h3>TOTAL: $${order.total}</h3>
                </div>
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };
  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }
const searchParams = useSearchParams();
const [highlightedId, setHighlightedId] = useState<string | null>(null);

useEffect(() => {
  const targetId = searchParams.get('id');
  if (targetId && orders.length > 0) {
    // Esperamos un momento a que el DOM se renderice completamente
    setTimeout(() => {
      const element = document.getElementById(`order-${targetId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedId(targetId);
        // Quitamos el resaltado después de 3 segundos
        setTimeout(() => setHighlightedId(null), 3000);
      }
    }, 500);
  }
}, [searchParams, orders]);
  return (
    <div className="max-w-6xl mx-auto min-h-screen p-2 pt-20 md:pt-28 lg:pt-8 relative font-sans">
      
      {/* --- LÓGICA DE BLOQUEO --- */}
      {isLocked && (
        <div className="fixed inset-0 z-50 backdrop-blur-sm bg-white/60 flex items-center justify-center p-4">
          <div className="bg-white shadow-2xl p-8 rounded-[2.5rem] max-w-md w-full text-center border border-gray-100 animate-in zoom-in-95 duration-300">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-5 text-blue-600">
              <Zap size={32} fill="currentColor" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-gray-900 tracking-tighter">Gestor de Pedidos</h2>
            <p className="text-gray-500 mb-8 text-base font-medium">Panel de control exclusivo del <b>Plan Plus</b>.</p>
            <Link href="/dashboard/settings" className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg bg-blue-600 text-white hover:bg-blue-700">
              Actualizar a Plus <Zap size={20} fill="currentColor" />
            </Link>
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
                        onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${selectedDate === new Date().toISOString().split("T")[0] ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
                    >
                        Hoy
                    </button>
                    <button 
                        onClick={() => {
                            const d = new Date(); d.setDate(d.getDate() - 1);
                            setSelectedDate(d.toISOString().split("T")[0]);
                        }}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${selectedDate !== new Date().toISOString().split("T")[0] ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
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
                                <div key={mesa.id} className="bg-white p-5 rounded-[1.5rem] border-2 border-gray-100 flex flex-col items-center text-center shadow-sm relative group hover:border-blue-200 transition-all">
                                    
                                    {/* BOTÓN ELIMINAR */}
                                    <button 
                                        onClick={() => {
                                            if(confirm(`¿Eliminar ${mesa.name}?`)) {
                                                supabase.from('tables').delete().eq('id', mesa.id).then(() => fetchTables(restaurantId!));
                                            }
                                        }}
                                        className="absolute top-3 right-3 text-gray-300 hover:text-red-500 transition-colors p-1"
                                    >
                                        <Trash2 size={16} />
                                    </button>

                                    <span className="text-3xl mb-2">{mesa.status === 'reservada' ? '🔒' : '🍽️'}</span>
                                    
                                    <span className="font-black text-sm text-gray-900 uppercase mb-1 tracking-tighter">
                                        {mesa.name}
                                    </span>
                                    
                                    <p className="text-[10px] text-gray-800 font-bold italic mb-4 line-clamp-2 min-h-[1.5rem] leading-tight">
                                        {mesa.description || "Sin descripción"}
                                    </p>

                                    {/* BOTÓN ON/OFF RESERVA */}
                                    <button 
                                        onClick={() => toggleTableStatus(mesa.id, mesa.status)}
                                        className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase transition-all border-2 shadow-sm ${
                                            mesa.status === 'reservada' 
                                            ? 'bg-red-50 border-red-600 text-red-600' 
                                            : 'bg-green-50 border-green-600 text-green-700'
                                        }`}
                                    >
                                        {mesa.status === 'reservada' ? 'Reservada (Off)' : 'Libre (On)'}
                                    </button>
                                </div>
                            ))}

                            {availableTables.length === 0 && (
                                <div className="col-span-full py-14 text-center border-2 border-dashed border-gray-100 rounded-[2rem] bg-gray-50/50">
                                    <LayoutGrid size={32} className="mx-auto mb-3 text-gray-200" />
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No hay mesas configuradas</p>
                                    <p className="text-[10px] text-gray-400 font-bold mt-1">Usa el botón "Crear Mesa" para empezar.</p>
                                </div>
                                    )}
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
    id={`order-${order.id}`} // <--- ESTO ES LA "DIRECCIÓN" PARA EL SCROLL
    className={`bg-white border rounded-3xl p-5 shadow-sm transition-all flex flex-col justify-between hover:shadow-md ${
      highlightedId === order.id 
        ? 'border-blue-500 ring-2 ring-blue-100 scale-[1.02] bg-blue-50/30' 
        : 'border-gray-100'
    }`}
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

            <h3 className="text-xl font-black text-gray-900 mb-6 tracking-tighter uppercase italic">Nueva Mesa</h3>
            
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
                onClick={addTable}
                disabled={isCreatingTable}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isCreatingTable ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                {isCreatingTable ? 'Guardando...' : 'Confirmar y Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
              </div>
            </div>
          );
        }