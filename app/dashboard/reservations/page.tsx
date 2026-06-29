"use client";

import { useEffect, useState, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { 
  Calendar as CalendarIcon, Users, Clock, CheckCircle2, XCircle, 
  MessageCircle, Loader2, Trash2, CalendarCheck, ChevronLeft, ChevronRight, 
  BellRing, LayoutList, Columns2, Sparkles, CalendarDays, Plus, 
  X, NotebookPen, Phone, CalendarRange, MessageSquareText
} from "lucide-react";
import { toast } from "sonner";

export default function ReservationsPage() {
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'split'>('split');
  const [dailyReservations, setDailyReservations] = useState<any[]>([]); 
  const [todayReservations, setTodayReservations] = useState<any[]>([]); 
  const [allConfirmed, setAllConfirmed] = useState<any[]>([]); 
  const [pendingInBox, setPendingInBox] = useState<any[]>([]); 
  const [monthData, setMonthData] = useState<any[]>([]); 
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month'); 
  
  // 🚀 ESTADOS DE MODALES Y BLOQUEO
  const [showClientMsgModal, setShowClientMsgModal] = useState(false); 
  const [clientMsgText, setClientMsgText] = useState(''); 
  const [selectedResDetail, setSelectedResDetail] = useState<any>(null);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteData, setNoteData] = useState({ id: '', text: '' });
  const [rescheduleData, setRescheduleData] = useState({ id: '', date: '', time: '' });

  const getArgentinaDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
  const [selectedDate, setSelectedDate] = useState(getArgentinaDate());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [manualData, setManualData] = useState({
    customer_name: '',
    customer_lastname: '',
    customer_phone: '',
    reservation_date: getArgentinaDate(),
    reservation_time: '21:00',
    guests: 2,
    notes: ''
  });

  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const refreshAllData = async () => {
    if (!restaurantId) return;
    const today = getArgentinaDate();

    const { data: todayRes } = await supabase.from('reservations').select('*').eq('restaurant_id', restaurantId).eq('reservation_date', today).order('reservation_time', { ascending: true });
    const { data: daily } = await supabase.from('reservations').select('*').eq('restaurant_id', restaurantId).eq('reservation_date', selectedDate).order('reservation_time', { ascending: true });
    const { data: confirmed } = await supabase.from('reservations').select('*').eq('restaurant_id', restaurantId).in('status', ['confirmada', 'suspendida', 'programada']).gte('reservation_date', today).order('reservation_date', { ascending: true }).order('reservation_time', { ascending: true });
    const { data: globalPending } = await supabase.from('reservations').select('*').eq('restaurant_id', restaurantId).eq('status', 'pendiente').order('reservation_date', { ascending: true });
    const { data: month } = await supabase.from('reservations').select('reservation_date, status').eq('restaurant_id', restaurantId);

    setTodayReservations(todayRes || []);
    setDailyReservations(daily || []);
    setAllConfirmed(confirmed || []);
    setPendingInBox(globalPending || []);
    setMonthData(month || []);
    fetchBlockedDates();
    setLoading(false);
  };

  const fetchBlockedDates = async () => {
    if (!restaurantId) return;
    const { data } = await supabase.from('blocked_dates').select('blocked_date').eq('restaurant_id', restaurantId);
    setBlockedDates(data?.map(d => d.blocked_date) || []);
  };

  const toggleBlockDate = async () => {
    const isBlocked = blockedDates.includes(selectedDate);
    if (isBlocked) {
        await supabase.from('blocked_dates').delete().eq('restaurant_id', restaurantId).eq('blocked_date', selectedDate);
        toast.success("Día habilitado");
    } else {
        await supabase.from('blocked_dates').insert({ restaurant_id: restaurantId, blocked_date: selectedDate });
        toast.error("Reservas cerradas para hoy");
    }
    fetchBlockedDates();
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: rest } = await supabase.from('restaurants').select('id').eq('user_id', user.id).single();
        if (rest) setRestaurantId(rest.id);
      }
    };
    init();
  }, []);

  useEffect(() => { if(restaurantId) refreshAllData(); }, [restaurantId, selectedDate, currentMonth]);
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel('realtime-reservations') // Nombre único para el canal
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'reservations', 
          filter: `restaurant_id=eq.${restaurantId}` 
        }, 
        () => {
          console.log("🔔 Cambio detectado en la base de datos");
          refreshAllData(); // Recarga todo automáticamente
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
}, [restaurantId]);

  const updateStatus = async (id: string, newStatus: string) => {
    await supabase.from('reservations').update({ status: newStatus }).eq('id', id);
    toast.success(`Estado actualizado`);
    refreshAllData();
  };

  const handleDelete = async (id: string) => {
    if(!confirm("¿Borrar definitivamente?")) return;
    const { error } = await supabase.from('reservations').delete().eq('id', id);
    if (!error) {
      toast.success("Reserva eliminada");
      refreshAllData();
    }
  };

  const saveAdminNote = async () => {
    await supabase.from('reservations').update({ admin_notes: noteData.text }).eq('id', noteData.id);
    toast.success("Nota guardada");
    setShowNoteModal(false);
    refreshAllData();
  };

  const confirmReschedule = async () => {
    await supabase.from('reservations').update({ reservation_date: rescheduleData.date, reservation_time: rescheduleData.time, status: 'programada' }).eq('id', rescheduleData.id);
    toast.success("Reprogramada");
    setShowRescheduleModal(false);
    refreshAllData();
  };

  const handleManualReserve = async () => {
    if (!manualData.customer_name || !manualData.customer_phone) return toast.error("Faltan datos");
    const { error } = await supabase.from('reservations').insert([{ ...manualData, restaurant_id: restaurantId, status: 'confirmada' }]);
    if (!error) {
      setShowManualModal(false);
      refreshAllData();
    }
  };

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < offset; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    return days;
  }, [currentMonth]);

  const weekDays = useMemo(() => {
    const start = new Date(selectedDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Empezar en Lunes
    const monday = new Date(start.setDate(diff));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
}, [selectedDate]);

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-6 font-sans pb-24 text-left text-gray-900">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl lg:text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3">
          Agenda de Reservas <CalendarCheck size={32} className="text-brasa"/>
        </h1>

        <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowManualModal(true)} className="bg-fresco text-white px-4 py-2 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-lg active:scale-95 transition-all">
                <Plus size={16} strokeWidth={3}/> Carga Manual
            </button>
            <div className="flex bg-white p-1 rounded-xl border shadow-sm">
                <button onClick={() => setViewMode('list')} className={`px-4 py-1.5 rounded-lg flex items-center gap-2 text-[9px] font-black uppercase transition-all ${viewMode === 'list' ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:bg-gray-100'}`}>
                    <LayoutList size={14}/> Lista
                </button>
                <button onClick={() => setViewMode('split')} className={`px-4 py-1.5 rounded-lg flex items-center gap-2 text-[9px] font-black uppercase transition-all ${viewMode === 'split' ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:bg-gray-100'}`}>
                    <Columns2 size={14}/> Dividida
                </button>
            </div>
        </div>
      </div>

      {/* 🚀 PANEL DE HOY */}
      {todayReservations.length > 0 && (
          <section className="bg-zinc-900 p-5 rounded-[2.5rem] text-white shadow-2xl animate-in fade-in zoom-in-95">
             <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-brasa rounded-lg animate-pulse"><Clock size={18}/></div>
                <h2 className="font-black text-xs uppercase italic tracking-widest">Hoy — {getArgentinaDate().split('-').reverse().join('/')}</h2>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {todayReservations.map(res => (
                    <ReservationCard 
                        key={res.id} res={res} 
                        onStatusChange={(s: string) => updateStatus(res.id, s)} 
                        onDelete={() => handleDelete(res.id)} 
                        onReschedule={() => { setRescheduleData({ id: res.id, date: res.reservation_date, time: res.reservation_time }); setShowRescheduleModal(true); }}
                        onEditNote={(id: string, text: string) => { setNoteData({ id, text }); setShowNoteModal(true); }}
                        onShowClientMsg={(msg: string) => { setClientMsgText(msg); setShowClientMsgModal(true); }}
                        onShowDetail={(r: any) => setSelectedResDetail(r)}
                        isTodayVariant={true}
                    />
                ))}
             </div>
          </section>
      )}

      <div className={`grid grid-cols-1 ${viewMode === 'split' ? 'lg:grid-cols-12' : ''} gap-6 lg:gap-10 items-start`}>
        
      {/* 🗓️ COLUMNA IZQUIERDA: CALENDARIO OPTIMIZADO */}
        <div className={`${viewMode === 'split' ? 'lg:col-span-5 xl:col-span-4' : 'w-full max-w-md mx-auto'} flex flex-col gap-4`}>
          
          {/* 🚀 BOTÓN DE BLOQUEO: AHORA ARRIBA */}
          <button 
              onClick={toggleBlockDate}
              className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg active:scale-95 ${blockedDates.includes(selectedDate) ? 'bg-fresco text-white' : 'bg-alert text-white'}`}
          >
              {blockedDates.includes(selectedDate) ? '✅ Habilitar Reservas' : '🚫 Cerrar Reservas para este día'}
          </button>

          <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-gray-100 text-center text-gray-900">
            {/* SELECTOR DE VISTA: MES / SEMANA */}
            <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                <button onClick={() => setCalendarView('month')} className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${calendarView === 'month' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}>Mensual</button>
                <button onClick={() => setCalendarView('week')} className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${calendarView === 'week' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}>Semanal</button>
            </div>

            <div className="flex justify-between items-center mb-6 px-2">
              <h3 className="font-black text-sm uppercase tracking-tighter italic">
                {currentMonth.toLocaleString('es-AR', { month: 'long', year: 'numeric' })}
              </h3>
              <div className="flex gap-1">
                <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="p-1.5 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-900"><ChevronLeft size={16}/></button>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="p-1.5 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-900"><ChevronRight size={16}/></button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-4 text-gray-300 font-black text-[9px]">
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, idx) => <span key={idx}>{d}</span>)}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {/* Alrededor de la línea 240 en ReservationsPage */}
{(calendarView === 'month' ? calendarDays : weekDays).map((day, i) => {
    if (!day) return <div key={`empty-${i}`} className="aspect-square" />;
    const dateStr = day.toLocaleDateString('en-CA');
    const isSelected = selectedDate === dateStr;
    const isToday = new Date().toLocaleDateString('en-CA') === dateStr;
    const isBlocked = blockedDates.includes(dateStr); // 🚀 Detectamos si está bloqueado

    const resOnDay = monthData.filter(r => r.reservation_date === dateStr && r.status !== 'cancelada');
    const hasPending = resOnDay.some(r => r.status === 'pendiente');
    const hasConfirmed = resOnDay.some(r => ['confirmada', 'programada', 'suspendida'].includes(r.status));

return (
  <button 
    key={dateStr} 
    onClick={() => setSelectedDate(dateStr)} 
    className={`relative aspect-square flex items-center justify-center rounded-xl text-xs font-black transition-all 
      ${isSelected ? 'bg-black text-white scale-110 shadow-lg z-10' : 
        isToday ? 'bg-brasa/10 text-brasa ring-2 ring-brasa/30' : 
        'bg-gray-50 text-gray-500 hover:bg-white hover:shadow-md'}`}
  >
    {day.getDate()}

    {/* ❌ LA FRANJA ROJA DE BLOQUEO (Tachado) */}
    {isBlocked && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[80%] h-[2px] bg-alert rotate-45 absolute rounded-full" />
            <div className="w-[80%] h-[2px] bg-alert -rotate-45 absolute rounded-full" />
        </div>
    )}

    {/* Puntitos de estado solo si NO está bloqueado */}
    {!isBlocked && (
        <div className="absolute -bottom-1 flex w-full justify-center gap-0.5 px-1">
            {hasPending && <div className="h-1 flex-1 bg-brasa rounded-full" />}
            {hasConfirmed && <div className="h-1 flex-1 bg-fresco rounded-full" />}
        </div>
    )}
  </button>
);
})}
            </div>
          </div>
        </div>

        {/* 📋 COLUMNA DERECHA: LISTAS */}
        <div className={`${viewMode === 'split' ? 'lg:col-span-7 xl:col-span-8' : 'w-full'} space-y-12`}>
          <section className="space-y-4">
             <div className="flex items-center gap-2 px-3">
                <BellRing size={16} className="text-brasa animate-bounce" />
                <h3 className="text-[11px] font-black uppercase text-brasa tracking-[0.2em]">Pendientes Globales</h3>
             </div>
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {pendingInBox.map(res => (
                  <ReservationCard key={res.id} res={res} onStatusChange={(s: string) => updateStatus(res.id, s)} onDelete={() => handleDelete(res.id)} onEditNote={(id: string, text: string) => { setNoteData({ id, text }); setShowNoteModal(true); }} onShowClientMsg={(msg: string) => { setClientMsgText(msg); setShowClientMsgModal(true); }} onShowDetail={(r: any) => setSelectedResDetail(r)}/>
                ))}
             </div>
          </section>

          <section className="space-y-4">
             <div className="flex items-center gap-2 px-3">
                <CalendarRange size={16} className="text-fresco" />
                <h3 className="text-[11px] font-black uppercase text-fresco tracking-[0.2em]">Agenda Completa</h3>
             </div>
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {allConfirmed.map(res => (
                  <ReservationCard key={res.id} res={res} onStatusChange={(s: string) => updateStatus(res.id, s)} onDelete={() => handleDelete(res.id)} showDate onEditNote={(id: string, text: string) => { setNoteData({ id, text }); setShowNoteModal(true); }} onShowClientMsg={(msg: string) => { setClientMsgText(msg); setShowClientMsgModal(true); }} onShowDetail={(r: any) => setSelectedResDetail(r)}/>
                ))}
             </div>
          </section>
        </div>
      </div>

      {/* 🎫 TODOS LOS MODALES AL FINAL (FUERA DE LAS CARDS) */}

      {/* 1. Modal Detalle Reserva */}
      {selectedResDetail && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 text-gray-900 text-left">
            <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter">{selectedResDetail.customer_name} {selectedResDetail.customer_lastname}</h3>
                        <p className="text-brasa font-bold text-[10px] uppercase tracking-widest">Información detallada</p>
                    </div>
                    <button onClick={() => setSelectedResDetail(null)} className="p-2 bg-gray-50 rounded-full"><X size={20}/></button>
                </div>
                <div className="space-y-6">
                    <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <Phone size={20} className="text-fresco" />
                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase">WhatsApp</p>
                            <p className="font-bold text-lg">{selectedResDetail.customer_phone}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-2xl border">
                            <p className="text-[9px] font-black text-gray-400 uppercase">Personas</p>
                            <p className="font-bold">{selectedResDetail.guests}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-2xl border">
                            <p className="text-[9px] font-black text-gray-400 uppercase">Horario</p>
                            <p className="font-bold">{selectedResDetail.reservation_time.slice(0,5)} hs</p>
                        </div>
                    </div>
                    {selectedResDetail.notes && (
                        <div className="bg-brasa/10 p-4 rounded-2xl border border-brasa/10">
                            <p className="text-[9px] font-black text-brasa uppercase mb-1">Descripción del Cliente</p>
                            <p className="text-sm italic font-bold">"{selectedResDetail.notes}"</p>
                        </div>
                    )}
                    {selectedResDetail.admin_notes && (
                        <div className="bg-zinc-900 p-4 rounded-2xl text-white">
                            <p className="text-[9px] font-black text-zinc-500 uppercase mb-1 tracking-widest">Tus Notas Internas</p>
                            <p className="text-sm font-medium">{selectedResDetail.admin_notes}</p>
                        </div>
                    )}
                </div>
                <button onClick={() => setSelectedResDetail(null)} className="w-full mt-8 py-5 bg-zinc-900 text-white rounded-2xl font-black uppercase text-xs">Cerrar Detalle</button>
            </div>
        </div>
      )}

      {/* 2. Modal Mensaje Cliente */}
      {showClientMsgModal && (
        <div className="fixed inset-0 z-[1500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 text-left">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 text-gray-900 border-4 border-brasa/10">
            <div className="flex items-center gap-2 mb-6">
                <MessageSquareText size={20} className="text-brasa" />
                <h3 className="text-xl font-black uppercase italic tracking-tighter">Mensaje del Cliente</h3>
            </div>
            <div className="bg-brasa/10/50 p-6 rounded-2xl border border-brasa/10 italic font-bold text-gray-700 text-sm leading-relaxed">
               "{clientMsgText}"
            </div>
            <button onClick={() => setShowClientMsgModal(false)} className="w-full mt-6 py-4 bg-zinc-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">Cerrar Mensaje</button>
          </div>
        </div>
      )}

      {/* 3. Modal Nota Admin */}
      {showNoteModal && (
        <div className="fixed inset-0 z-[1400] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 text-left text-gray-900">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black uppercase italic tracking-widest mb-4">Nota Privada (Admin)</h3>
            <textarea value={noteData.text} onChange={e => setNoteData({...noteData, text: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm h-32 resize-none outline-none focus:ring-2 ring-black text-gray-900" placeholder="Anotá algo importante..." />
            <div className="flex gap-2 mt-6">
                <button onClick={() => setShowNoteModal(false)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-black uppercase text-[10px]">Cerrar</button>
                <button onClick={saveAdminNote} className="flex-[2] py-4 bg-black text-white rounded-2xl font-black uppercase text-[10px] shadow-lg">Guardar Nota</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal Carga Manual */}
      {showManualModal && (
        <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 text-left text-gray-900">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black uppercase italic tracking-tighter">Nueva Reserva</h3>
              <button onClick={() => setShowManualModal(false)} className="p-2 bg-gray-50 rounded-full"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Nombre" value={manualData.customer_name} onChange={e=>setManualData({...manualData, customer_name: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm focus:ring-2 ring-fresco" />
                <input type="text" placeholder="Apellido" value={manualData.customer_lastname} onChange={e=>setManualData({...manualData, customer_lastname: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm focus:ring-2 ring-fresco" />
              </div>
              <input type="tel" placeholder="WhatsApp" value={manualData.customer_phone} onChange={e=>setManualData({...manualData, customer_phone: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={manualData.reservation_date} onChange={e=>setManualData({...manualData, reservation_date: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-xs" />
                <input type="time" value={manualData.reservation_time} onChange={e=>setManualData({...manualData, reservation_time: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-xs" />
              </div>
              <button onClick={handleManualReserve} className="w-full py-5 bg-fresco text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl active:scale-95">Ingresar Reserva</button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal Reprogramar */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-[1300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 text-left text-gray-900">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-2xl font-black uppercase italic mb-8">Reprogramar</h3>
            <div className="space-y-6">
              <input type="date" value={rescheduleData.date} onChange={e => setRescheduleData({...rescheduleData, date: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm" />
              <input type="time" value={rescheduleData.time} onChange={e => setRescheduleData({...rescheduleData, time: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm" />
              <div className="flex gap-2">
                <button onClick={() => setShowRescheduleModal(false)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-black uppercase text-[10px]">Cancelar</button>
                <button onClick={confirmReschedule} className="flex-[2] py-4 bg-fresco text-white rounded-2xl font-black uppercase text-[10px] shadow-lg">Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function ReservationCard({ res, onStatusChange, onReschedule, onEditNote, onDelete, onShowClientMsg, onShowDetail, showDate = false, isTodayVariant = false }: any) {
  const statusConfig: any = {
    'confirmada': { color: 'bg-fresco', label: 'CONFIRMADA', border: 'border-fresco/10' },
    'pendiente': { color: 'bg-brasa', label: 'PENDIENTE', border: 'border-brasa/10' },
    'suspendida': { color: 'bg-orange-500', label: 'SUSPENDIDA', border: 'border-orange-100' },
    'programada': { color: 'bg-fresco', label: 'REPROGRAMADA', border: 'border-[#E8F7F1]' },
    'cancelada': { color: 'bg-alert', label: 'CANCELADA', border: 'border-alert/10' }
  };

  const currentStatus = statusConfig[res.status] || statusConfig['pendiente'];

  return (
    <div 
        onClick={() => onShowDetail(res)}
        className={`cursor-pointer bg-white p-5 rounded-[2.2rem] border-2 transition-all flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 ${currentStatus.border} ${isTodayVariant ? 'shadow-xl' : 'shadow-sm'} hover:border-gray-900`}
    >
      
      {/* CABECERA */}
      <div className="flex items-center gap-3 text-left">
        <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 text-white shadow-lg ${currentStatus.color}`}>
           <span className="text-xs font-black">{res.reservation_time.slice(0,5)}</span>
           {showDate && <span className="text-[8px] font-black uppercase">{res.reservation_date.split('-')[2]}/{res.reservation_date.split('-')[1]}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-black text-gray-900 uppercase italic text-sm truncate leading-none">
            {res.customer_name} {res.customer_lastname}
          </h4>
          <p className={`text-[9px] font-black mt-1.5 uppercase tracking-widest ${currentStatus.color.replace('bg-', 'text-')}`}>
            {currentStatus.label}
          </p>
        </div>
      </div>

      {/* FILA DE INFO COMPACTA */}
      <div className="flex items-center justify-between gap-2 border-y border-gray-50 py-3">
         <div className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200">
            <Users size={12} className="text-gray-400" />
            <span className="text-[10px] font-black text-gray-600 uppercase tracking-tighter">
               {res.guests} <span className="hidden xs:inline">Personas</span>
            </span>
         </div>

         <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {res.notes && (
               <button onClick={() => onShowClientMsg(res.notes)} className="w-9 h-9 flex items-center justify-center bg-brasa/10 text-brasa rounded-xl hover:bg-brasa/10 border border-brasa/20">
                  <MessageSquareText size={18}/>
               </button>
            )}

            <button onClick={() => onEditNote(res.id, res.admin_notes || '')} className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all ${res.admin_notes ? 'bg-zinc-900 text-white border-zinc-900 shadow-md' : 'bg-white text-gray-400 border-gray-200 hover:text-black'}`}>
               <NotebookPen size={18}/>
            </button>
         </div>
      </div>
      
      {/* BOTONERAS */}
    
      <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
          {/* Si está pendiente, el primer botón es CONFIRMAR */}
          {res.status === 'pendiente' ? (
              <button onClick={() => onStatusChange('confirmada')} className="py-2.5 rounded-xl bg-fresco text-white font-black text-[9px] uppercase shadow-md active:scale-95 transition-all">Confirmar</button>
          ) : (
              <button onClick={() => onReschedule()} className="py-2.5 rounded-xl bg-[#F0FAF6] text-fresco font-bold text-[9px] uppercase border border-[#E8F7F1]">Re-Prog.</button>
          )}

          <button 
            onClick={() => {
              if (res.status === 'cancelada') { onDelete(); } 
              else { if(confirm("¿Cancelar reserva?")) onStatusChange('cancelada'); }
            }} 
            className="py-2.5 rounded-xl bg-alert/10 text-alert font-bold text-[9px] uppercase border border-alert/10"
          >
            {res.status === 'cancelada' ? 'Borrar' : 'Cancelar'}
          </button>
      </div>

      <a 
        href={`https://wa.me/${res.customer_phone}`} 
        target="_blank" 
        onClick={(e) => e.stopPropagation()}
        className="w-full py-3 bg-green-50 text-green-600 rounded-2xl font-black text-[10px] uppercase hover:bg-green-100 transition-colors flex items-center justify-center gap-2 border border-green-100"
      >
        <MessageCircle size={16}/> <span>Contactar WhatsApp</span>
      </a>
    </div>
  );
}