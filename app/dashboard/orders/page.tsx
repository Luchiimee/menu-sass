"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  Loader2,
  ShoppingBag,
  Clock,
  CheckCircle,
  XCircle,
  Bike,
  Store,
  MapPin,
  CreditCard,
  Banknote,
  Trash2,
  ChefHat,
  Check,
  User,
  MessageCircle,
  LayoutGrid,
  List,
  Zap,
  Send,
  Phone,
  Printer,
  FileText,
} from "lucide-react";
import Link from "next/link";

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

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  useEffect(() => {
    const savedView = localStorage.getItem("ordersView");
    if (savedView) setView(savedView);
  }, []);

  const changeView = (newView: string) => {
    setView(newView);
    localStorage.setItem("ordersView", newView);
  };

useEffect(() => {
    let mounted = true;
    const loadOrders = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // --- VALIDACIÓN SUPER ADMIN ---
        const isSuperAdmin = user.email === 'luchiimee2@gmail.com';

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

          // Si sos Super Admin o tenés el plan correcto, se desbloquea
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
  }, []);

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
        (payload) => {
          if (payload.new && "order_type" in payload.new) {
            if (payload.new.order_type === "apertura") return;
            if (payload.new.customer_name === "Venta Detectada (Cierre)")
              return;
          }
          if (payload.eventType === "INSERT")
            setOrders((prev) => [payload.new, ...prev]);
          else if (payload.eventType === "UPDATE")
            setOrders((prev) =>
              prev.map((o) => (o.id === payload.new.id ? payload.new : o)),
            );
          else if (payload.eventType === "DELETE")
            setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, isLocked]);

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
          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1">
            <Clock size={12} /> Pendiente
          </span>
        );
      case "en_proceso":
        return (
          <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1">
            <ChefHat size={12} /> En Cocina
          </span>
        );
      case "en_camino":
        return (
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1">
            <Bike size={12} /> En Camino
          </span>
        );
      case "entregado":
      case "completado":
        return (
          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1">
            <CheckCircle size={12} /> Completado
          </span>
        );
      case "cancelado":
        return (
          <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1">
            <XCircle size={12} /> Cancelado
          </span>
        );
      default:
        return null;
    }
  };
  const handlePrint = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = order.items.map((item: any) => `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>${item.quantity}x ${item.name}</span>
            <span>$${item.price * item.quantity}</span>
        </div>
        ${item.extrasList?.map((ex: any) => `
            <div style="font-size: 12px; margin-left: 10px; color: #666;">+ ${ex.name} ($${ex.price})</div>
        `).join('') || ''}
    `).join('');

    printWindow.document.write(`
        <html>
            <head>
                <title>Ticket #${order.id.slice(0,5)}</title>
                <style>
                    body { font-family: monospace; padding: 20px; width: 300px; }
                    .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                    .footer { border-top: 1px dashed #000; margin-top: 10px; padding-top: 10px; text-align: center; }
                    .notes { background: #eee; padding: 5px; margin-top: 10px; font-size: 13px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2 style="margin:0">${restaurantName}</h2>
                    <p>Pedido #${order.id.slice(0,5)}</p>
                    <p>${new Date(order.created_at).toLocaleString()}</p>
                </div>
                <div>
                    <strong>Cliente:</strong> ${order.customer_name}<br>
                    <strong>Tel:</strong> ${order.customer_phone}<br>
                    <strong>Tipo:</strong> ${order.order_type?.toUpperCase()}
                </div>
                <div style="margin-top:15px;">${itemsHtml}</div>
                ${order.description ? `<div class="notes"><strong>Nota:</strong> ${order.description}</div>` : ''}
                <div class="footer">
                    <h3>TOTAL: $${order.total}</h3>
                    <p>¡Gracias por su compra!</p>
                </div>
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
};
// --- FUNCIÓN PARA GUARDAR EL ESTADO DEL INTERRUPTOR ---
  const toggleWhatsapp = async () => {
    // Si intenta activar y no hay teléfono, disparamos el Pop-up lindo
    if (!receiveWhatsapp && (!restaurantPhone || restaurantPhone.trim() === "")) {
      setShowPhoneAlert(true); // <--- CAMBIADO: Ahora abre el modal
      return;
    }

    const newValue = !receiveWhatsapp;
    setReceiveWhatsapp(newValue);
    // Guardamos en la columna de Supabase
    await supabase.from("restaurants").update({ receive_whatsapp: newValue }).eq("id", restaurantId);
  };

  // --- ESTADO DE CARGA ---
  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }
  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar p-2 relative">
      {isLocked && (
        <div className="absolute inset-0 z-50 backdrop-blur-sm bg-white/60 flex items-center justify-center rounded-3xl overflow-hidden p-4 h-full">
          <div className="bg-white shadow-2xl p-8 rounded-3xl max-w-md w-full text-center border border-gray-100 animate-in zoom-in-95 duration-300">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-5 text-blue-600">
              <Zap size={32} fill="currentColor" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-gray-900">
              Gestor de Pedidos
            </h2>
            <p className="text-gray-500 mb-8 text-base">
              El panel de control en tiempo real es exclusivo del{" "}
              <b>Plan Plus</b>.
            </p>
            <Link
              href="/dashboard/settings"
              className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:-translate-y-1 bg-blue-600 text-white hover:bg-blue-700"
            >
              Actualizar a Plus <Zap size={20} fill="currentColor" />
            </Link>
          </div>
        </div>
      )}

      <div
        className={`${isLocked ? "blur-sm pointer-events-none opacity-50 select-none overflow-hidden h-full" : ""}`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Pedidos{" "}
            <span className="bg-black text-white text-sm px-2 py-0.5 rounded-full">
              {orders.length}
            </span>
          </h1>
          <div className="flex items-center gap-3">
    {/* INTERRUPTOR INTELIGENTE DE WHATSAPP - DISEÑO DESTACADO */}
<div className="flex items-center gap-4 bg-blue-600 p-3 px-4 rounded-2xl shadow-lg border border-blue-700 transition-all hover:bg-blue-700">
  <div className="flex flex-col">
    <span className="text-[10px] font-black text-blue-100 uppercase leading-none mb-1">
      Entrada de Pedidos
    </span>
    <p className="text-[11px] font-bold text-white leading-none">
      {receiveWhatsapp ? "Panel + WhatsApp" : "Solo Panel"}
    </p>
  </div>
  
  <button 
    onClick={toggleWhatsapp}
    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ring-2 ring-blue-400/30 ${
      receiveWhatsapp ? 'bg-green-400' : 'bg-blue-400'
    }`}
  >
    <span className="sr-only">Toggle WhatsApp</span>
    <span
      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
        receiveWhatsapp ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
</div>
            <div className="bg-gray-100 p-1 rounded-lg flex items-center">
              <button
                onClick={() => changeView("list")}
                className={`p-2 rounded-md transition ${view === "list" ? "bg-white shadow-sm text-black" : "text-gray-400 hover:text-gray-600"}`}
              >
                <List size={20} />
              </button>
              <button
                onClick={() => changeView("grid")}
                className={`p-2 rounded-md transition ${view === "grid" ? "bg-white shadow-sm text-black" : "text-gray-400 hover:text-gray-600"}`}
              >
                <LayoutGrid size={20} />
              </button>
            </div>
           
            <div className="bg-green-50 border border-green-200 px-4 py-2 rounded-xl text-right">
              <p className="text-[10px] text-green-600 font-bold uppercase">
                Ventas Hoy
              </p>
              <p className="text-lg font-bold text-green-900">
                $
                {orders
                  .filter(
                    (o) =>
                      o.status === "completado" || o.status === "entregado",
                  )
                  .reduce((acc, curr) => acc + Number(curr.total), 0)}
              </p>
            </div>
          </div>
        </div>

        <div
          className={
            view === "list"
              ? "space-y-4"
              : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 align-start"
          }
        >
          {!isLocked && orders.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-400">
              <ShoppingBag size={48} className="mx-auto mb-4 opacity-20" />
              <p>No tienes pedidos activos.</p>
            </div>
          )}

          {orders.map((order) => (
          <div
  key={order.id}
  className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm transition-all flex flex-col justify-between"
>
              <div>
                <div className="flex justify-between items-start mb-4 border-b pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono font-bold text-gray-500">
                        #{order.id.slice(0, 5)}
                      </span>
                      {getStatusBadge(order.status)}
                    </div>
                    {/* INFORMACIÓN CLIENTE (Nombre + Teléfono) */}
                    <div className="space-y-0.5 mb-2">
                      {order.customer_name && (
                        <div className="flex items-center gap-1 text-sm font-bold text-gray-800">
                          <User size={14} className="text-gray-400" />{" "}
                          {order.customer_name}
                        </div>
                      )}
                      {order.customer_phone && (
                        <div className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 w-fit px-2 py-0.5 rounded-md">
                          <Phone size={12} /> {order.customer_phone}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-bold text-gray-600">
                      <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                        {order.order_type === "delivery" ? (
                          <Bike size={14} />
                        ) : order.order_type === "retiro" ? (
                          <Store size={14} />
                        ) : (
                          <MapPin size={14} />
                        )}
                        {order.order_type?.toUpperCase() || "DELIVERY"}
                      </span>
                      <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                        {order.payment_method === "transferencia" ? (
                          <CreditCard size={14} />
                        ) : (
                          <Banknote size={14} />
                        )}
                        {order.payment_method?.toUpperCase() || "EFECTIVO"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-2xl text-gray-900">
                      ${order.total}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1 font-bold">
                      {new Date(order.created_at).toLocaleString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                {/* LISTADO DE ITEMS Y EXTRAS */}
                <div
                  className={`space-y-3 mb-4 ${view === "grid" ? "max-h-48 overflow-y-auto custom-scrollbar" : ""}`}
                >
                  {order.items?.map((item: any, i: number) => (
                    <div
                      key={i}
                      className="border-b border-gray-50 pb-2 last:border-0"
                    >
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-800 font-bold">
                          <span className="text-black">{item.quantity}x</span>{" "}
                          {item.name}
                        </span>
                        <span className="font-black text-gray-900">
                          ${item.price * item.quantity}
                        </span>
                      </div>
                      {/* VISUALIZACIÓN DE EXTRAS */}
                      {item.extrasList && item.extrasList.length > 0 && (
                        <div className="pl-4 mt-1 border-l-2 border-gray-100 space-y-0.5">
                          {item.extrasList.map((extra: any, j: number) => (
                            <div
                              key={j}
                              className="flex justify-between text-[11px] text-gray-500 italic font-medium"
                            >
                              <span>
                                + {extra.quantity} {extra.name}
                              </span>
                              <span>${extra.price * extra.quantity}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {order.delivery_cost > 0 && (
                    <div className="flex justify-between text-xs text-blue-600 font-bold pt-1 uppercase tracking-tighter">
                      <span>Costo de Envío</span>
                      <span>+${order.delivery_cost}</span>
                      
                    </div>
                    
                  )}
                </div>
                {order.description && (
    <div className="mt-3 p-2 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-md">
        <p className="text-[10px] font-bold text-yellow-700 uppercase flex items-center gap-1">
            <FileText size={12}/> Aclaraciones:
        </p>
        <p className="text-sm text-yellow-900 italic">"{order.description}"</p>
    </div>
)}
             
              </div>

              <div className={`flex flex-col gap-2 pt-2 border-t mt-auto`}>
                <button 
                            onClick={() => handlePrint(order)} 
                            className="w-full bg-gray-100 text-gray-700 hover:bg-gray-200 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition"
                        >
                            <Printer size={16}/> Imprimir Ticket
                        </button>
                {order.status === "pendiente" && (
                    
                  <div className="flex gap-2">
                    
                    <button
                      onClick={() => updateStatus(order.id, "cancelado")}
                      className="border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-bold transition flex-1"
                    >
                      Rechazar
                    </button>
                    <button
                      onClick={() => updateStatus(order.id, "en_proceso")}
                      className="bg-black text-white hover:bg-gray-800 px-6 py-2 rounded-lg text-sm font-bold transition shadow-lg flex items-center justify-center gap-2 flex-1"
                    >
                      <ChefHat size={16} /> Cocinar
                    </button>
                  </div>
                )}

                {order.status === "en_proceso" && (
                  <button
                    onClick={() => updateStatus(order.id, "en_camino")}
                    className="bg-blue-600 text-white hover:bg-blue-700 px-6 py-2 rounded-lg text-sm font-bold transition shadow-lg flex items-center justify-center gap-2 w-full"
                  >
                    <Send size={16} /> Enviar Pedido
                  </button>
                )}

                {order.status === "en_camino" && (
                  <div className="flex flex-col gap-2">
                    {order.customer_phone && (
                      <a
                        href={getWhatsAppLink(order.customer_phone, "notify")}
                        className="bg-green-500 text-white hover:bg-green-600 px-4 py-2 rounded-lg text-sm font-bold transition shadow flex items-center justify-center gap-2 w-full no-underline"
                      >
                        <MessageCircle size={18} /> Avisar "En Camino" 🛵
                      </a>
                    )}
                    <button
                      onClick={() => updateStatus(order.id, "completado")}
                      className="bg-gray-900 text-white hover:bg-black px-6 py-2 rounded-lg text-sm font-bold transition shadow flex items-center justify-center gap-2 w-full"
                    >
                      <Check size={16} /> Marcar Entregado
                    </button>
                  </div>
                )}

                {(order.status === "completado" ||
                  order.status === "entregado" ||
                  order.status === "cancelado") && (
                  <div className="flex gap-2">
                    {order.customer_phone && (
                      <a
                        href={getWhatsAppLink(order.customer_phone, "chat")}
                        className="flex-1 bg-green-50 text-green-700 border border-green-200 px-3 py-2 rounded-lg hover:bg-green-100 transition flex items-center justify-center gap-2 font-bold text-xs no-underline"
                      >
                        <MessageCircle size={16} /> Abrir Chat
                      </a>
                    )}
                    <button
                      onClick={() => deleteOrder(order.id)}
                      className="text-gray-400 hover:text-red-500 p-2 transition flex justify-center w-10 bg-gray-50 rounded-lg border border-gray-200"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
              
            </div>
          ))}
        </div>
      </div>
      {/* MODAL DE ALERTA (FUERA DEL BLUR) */}
      {showPhoneAlert && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4 text-amber-600">
              <Phone size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Falta el número</h3>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Para recibir pedidos por WhatsApp, primero tenés que ingresar tu número en el editor de <b>Personalizar</b>.
            </p>
            <div className="flex flex-col gap-3">
              <Link 
                href="/dashboard/personalizar"
                className="w-full py-3 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all text-center no-underline"
              >
                Ir a Personalizar
              </Link>
              <button 
                onClick={() => setShowPhoneAlert(false)}
                className="w-full py-3 text-gray-400 font-bold text-sm hover:text-gray-600 transition-colors"
              >
                Quizás más tarde
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
