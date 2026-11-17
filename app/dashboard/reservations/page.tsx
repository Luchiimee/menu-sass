"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import {
  Users, Clock3, MessageCircle, CalendarCheck, ChevronLeft, ChevronRight,
  BellRing, List, Columns2, CalendarDays, Plus, X, NotebookPen, Zap,
  Check, CheckCheck, Ban, Ellipsis, Eye, RefreshCw, Trash2, MessageSquare, ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { isAdminEmail } from "@/lib/access";
import styles from "./reservas.module.css";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const STATUS_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  programada: "Reprogramada",
  suspendida: "Suspendida",
  cancelada: "Cancelada",
};
const STATUS_CLASS: Record<string, string> = {
  pendiente: styles.statusPendiente,
  confirmada: styles.statusConfirmada,
  programada: styles.statusProgramada,
  suspendida: styles.statusSuspendida,
  cancelada: styles.statusCancelada,
};
const DOT_CLASS: Record<string, string> = {
  pendiente: styles.dotPendiente,
  confirmada: styles.dotConfirmada,
  programada: styles.dotProgramada,
  suspendida: styles.dotSuspendida,
  cancelada: styles.dotCancelada,
};

const getArgentinaDate = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
// Mediodía para que el huso horario no corra el día
const parseDay = (ymd: string) => new Date(`${ymd}T12:00:00`);
const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dateLabel = (ymd: string, short = false) =>
  parseDay(ymd).toLocaleDateString("es-AR", short ? { day: "numeric", month: "short" } : { weekday: "long", day: "numeric", month: "long" });

// wa.me necesita código de país: un número argentino de 10 dígitos (sin 54) se completa con 549
const whatsappUrl = (raw: string) => {
  let digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  if (digits.length === 10) digits = `549${digits}`;
  return `https://wa.me/${digits}`;
};

type ModalState =
  | { type: "manual" }
  | { type: "close" }
  | { type: "reschedule" | "note" | "detail" | "cancel" | "delete"; res: any }
  | null;

export default function ReservationsPage() {
  const router = useRouter();
  const [isLocked, setIsLocked] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "split">("split");
  const [dailyReservations, setDailyReservations] = useState<any[]>([]);
  const [pendingInBox, setPendingInBox] = useState<any[]>([]);
  const [monthData, setMonthData] = useState<any[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [calendarView, setCalendarView] = useState<"month" | "week">("month");
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [noteData, setNoteData] = useState({ id: "", text: "" });
  const [rescheduleData, setRescheduleData] = useState({ id: "", date: "", time: "" });

  const [selectedDate, setSelectedDate] = useState(getArgentinaDate());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [manualData, setManualData] = useState({
    customer_name: "",
    customer_lastname: "",
    customer_phone: "",
    reservation_date: getArgentinaDate(),
    reservation_time: "21:00",
    guests: 2,
    notes: "",
  });

  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const refreshAllData = async () => {
    if (!restaurantId) return;
    const { data: daily } = await supabase.from("reservations").select("*").eq("restaurant_id", restaurantId).eq("reservation_date", selectedDate).order("reservation_time", { ascending: true });
    const { data: globalPending } = await supabase.from("reservations").select("*").eq("restaurant_id", restaurantId).eq("status", "pendiente").order("reservation_date", { ascending: true }).order("reservation_time", { ascending: true });
    const { data: month } = await supabase.from("reservations").select("reservation_date, status").eq("restaurant_id", restaurantId);

    setDailyReservations(daily || []);
    setPendingInBox(globalPending || []);
    setMonthData(month || []);
    fetchBlockedDates();
  };

  const fetchBlockedDates = async () => {
    if (!restaurantId) return;
    const { data } = await supabase.from("blocked_dates").select("blocked_date").eq("restaurant_id", restaurantId);
    setBlockedDates(data?.map((d) => d.blocked_date) || []);
  };

  const toggleBlockDate = async () => {
    const isBlocked = blockedDates.includes(selectedDate);
    if (isBlocked) {
      await supabase.from("blocked_dates").delete().eq("restaurant_id", restaurantId).eq("blocked_date", selectedDate);
      toast.success("Día habilitado");
    } else {
      await supabase.from("blocked_dates").insert({ restaurant_id: restaurantId, blocked_date: selectedDate });
      toast.error("Reservas cerradas para este día");
    }
    fetchBlockedDates();
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: rest } = await supabase.from("restaurants").select("id, subscription_plan").eq("user_id", user.id).single();
        if (rest) {
          // Reservas es exclusiva del Plan Plus
          setIsLocked(rest.subscription_plan !== "plus" && !isAdminEmail(user.email));
          setRestaurantId(rest.id);
        }
      }
    };
    init();
  }, []);

  useEffect(() => { if (restaurantId && !isLocked) refreshAllData(); }, [restaurantId, isLocked, selectedDate, currentMonth]);

  useEffect(() => {
    if (!restaurantId || isLocked) return;
    const channel = supabase
      .channel("realtime-reservations")
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations", filter: `restaurant_id=eq.${restaurantId}` }, () => {
        refreshAllData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [restaurantId]);

  // Menú ⋯ y modales: se cierran tocando afuera / con Escape
  useEffect(() => {
    if (!menuId) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-res-menu]")) setMenuId(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuId]);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setModal(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modal]);

  const updateStatus = async (id: string, newStatus: string) => {
    await supabase.from("reservations").update({ status: newStatus }).eq("id", id);
    toast.success(newStatus === "confirmada" ? "Reserva confirmada" : newStatus === "cancelada" ? "Reserva cancelada" : "Estado actualizado");
    refreshAllData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("reservations").delete().eq("id", id);
    if (!error) {
      toast.success("Reserva eliminada");
      refreshAllData();
    }
  };

  const saveAdminNote = async () => {
    await supabase.from("reservations").update({ admin_notes: noteData.text }).eq("id", noteData.id);
    toast.success("Nota guardada");
    setModal(null);
    refreshAllData();
  };

  const confirmReschedule = async () => {
    await supabase.from("reservations").update({ reservation_date: rescheduleData.date, reservation_time: rescheduleData.time, status: "programada" }).eq("id", rescheduleData.id);
    toast.success("Reprogramada");
    setModal(null);
    refreshAllData();
  };

  const handleManualReserve = async () => {
    if (!manualData.customer_name || !manualData.customer_phone) return toast.error("Faltan datos");
    const { error } = await supabase.from("reservations").insert([{ ...manualData, restaurant_id: restaurantId, status: "confirmada" }]);
    if (!error) {
      setModal(null);
      setSelectedDate(manualData.reservation_date);
      refreshAllData();
    }
  };

  const openModal = (state: NonNullable<ModalState>) => {
    setMenuId(null);
    if (state.type === "manual") {
      setManualData({ customer_name: "", customer_lastname: "", customer_phone: "", reservation_date: selectedDate, reservation_time: "21:00", guests: 2, notes: "" });
    } else if (state.type === "note") {
      setNoteData({ id: state.res.id, text: state.res.admin_notes || "" });
    } else if (state.type === "reschedule") {
      setRescheduleData({ id: state.res.id, date: state.res.reservation_date, time: String(state.res.reservation_time).slice(0, 5) });
    }
    setModal(state);
  };

  // ---------- calendario ----------
  const today = getArgentinaDate();
  const tomorrow = dateKey(new Date(parseDay(today).getTime() + 86400000));

  const moveDay = (amount: number) => {
    const d = parseDay(selectedDate);
    d.setDate(d.getDate() + amount);
    setSelectedDate(dateKey(d));
    setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  };
  const moveCalendar = (amount: number) => {
    if (calendarView === "week") { moveDay(amount * 7); return; }
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + amount, 1));
  };

  const calendarCells: (Date | null)[] = (() => {
    if (calendarView === "month") {
      const y = currentMonth.getFullYear();
      const m = currentMonth.getMonth();
      const offset = (new Date(y, m, 1).getDay() + 6) % 7;
      const days = new Date(y, m + 1, 0).getDate();
      return [...Array.from({ length: offset }, () => null), ...Array.from({ length: days }, (_, i) => new Date(y, m, i + 1))];
    }
    const monday = parseDay(selectedDate);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; });
  })();

  const monthLabelRaw = (calendarView === "week" ? parseDay(selectedDate) : currentMonth).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  const monthLabel = monthLabelRaw.charAt(0).toUpperCase() + monthLabelRaw.slice(1);

  const isClosed = blockedDates.includes(selectedDate);
  // Cancelada y suspendida no cuentan como gente a recibir
  const expected = dailyReservations.filter((r) => r.status !== "cancelada" && r.status !== "suspendida");
  const expectedPeople = expected.reduce((sum, r) => sum + (Number(r.guests) || 0), 0);
  const fullName = (r: any) => `${r.customer_name ?? ""} ${r.customer_lastname ?? ""}`.trim();

  const closeDayButton = (
    <button className={cx(styles.btn, isClosed ? styles.btnOpen : styles.btnWarning, styles.dayClose)} onClick={() => openModal({ type: "close" })}>
      <Ban size={14} />{isClosed ? "Reabrir reservas para este día" : "Cerrar reservas para este día"}
    </button>
  );

  return (
    <>
      {isLocked && (
        <div className="fixed inset-0 z-[150] backdrop-blur-sm bg-white/60 flex items-center justify-center p-4">
          <div className="bg-white shadow-2xl p-10 rounded-[2.5rem] max-w-md w-full text-center border border-gray-100 relative animate-in zoom-in-95">
            <button onClick={() => router.push("/dashboard")} className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
            <div className="mx-auto w-16 h-16 bg-brasa/10 rounded-full flex items-center justify-center mb-5 text-brasa">
              <CalendarCheck size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2 tracking-tighter uppercase italic text-gray-900">Reservas</h2>
            <p className="text-gray-500 mb-8 text-sm font-medium">La gestión de reservas es exclusiva del <b>Plan Plus</b>.</p>
            <div className="flex flex-col gap-3">
              <Link href="/dashboard/plan" className="w-full py-4 rounded-2xl font-bold bg-fresco text-white hover:bg-fresco/90 transition shadow-lg uppercase text-xs tracking-widest flex items-center justify-center gap-2">
                Actualizar a Plus <Zap size={18} fill="currentColor" />
              </Link>
              <button onClick={() => router.push("/dashboard")} className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2 hover:text-gray-600 transition">
                Volver al inicio
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={cx(styles.root, isLocked && "blur-sm pointer-events-none opacity-50 select-none overflow-hidden h-screen")}>
        {/* ENCABEZADO */}
        <header className={styles.pageHeader}>
          <div>
            <h1 className={cx(styles.pageTitle, styles.display)}>Agenda de reservas <CalendarCheck size={26} strokeWidth={1.8} /></h1>
            <p className={styles.pageSubtitle}>Cada mesa, cada día. Todo bajo control.</p>
          </div>
          <div className={styles.headerActions}>
            <button className={cx(styles.btn, styles.btnConfirm)} style={{ height: 40, fontSize: 12 }} onClick={() => openModal({ type: "manual" })}><Plus /> Carga manual</button>
            <div className={styles.segmented} aria-label="Vista de agenda">
              <button className={cx(styles.btn, styles.btnGhost, styles.btnSegment)} data-active={viewMode === "list"} onClick={() => setViewMode("list")}><List /> Lista</button>
              <button className={cx(styles.btn, styles.btnGhost, styles.btnSegment)} data-active={viewMode === "split"} onClick={() => setViewMode("split")}><Columns2 /> Dividida</button>
            </div>
          </div>
        </header>

        {/* PENDIENTES POR CONFIRMAR */}
        <section className={styles.pendingSection} aria-label="Pendientes por confirmar">
          <div className={styles.sectionHeading}>
            <h2 className={styles.display}><BellRing size={17} /> Pendientes por confirmar <span className={styles.pendingCount}>{pendingInBox.length}</span></h2>
            <span className={styles.pendingHint}>Una respuesta hace la diferencia</span>
          </div>
          {pendingInBox.length ? (
            <div className={styles.pendingGrid}>
              {pendingInBox.map((r) => (
                <article className={styles.pendingCard} key={r.id}>
                  <div className={styles.pendingDate}>
                    <Clock3 size={12} />
                    {r.reservation_date === today ? "HOY" : r.reservation_date === tomorrow ? "MAÑANA" : dateLabel(r.reservation_date, true).toUpperCase()}
                    {(r.reservation_date === today || r.reservation_date === tomorrow) && <> · {dateLabel(r.reservation_date, true).toUpperCase()}</>}
                    <span>{String(r.reservation_time).slice(0, 5)} h</span>
                  </div>
                  <h3 className={styles.reservationName}>{fullName(r)}</h3>
                  <div className={styles.pendingMeta}><Users size={13} />{r.guests} {Number(r.guests) === 1 ? "persona" : "personas"}</div>
                  <p className={styles.pendingNote}><MessageSquare size={12} />{r.notes || "Sin nota del cliente"}</p>
                  <div className={styles.pendingActions}>
                    <button className={cx(styles.btn, styles.btnConfirm)} onClick={() => updateStatus(r.id, "confirmada")}><Check /> Confirmar</button>
                    <button className={cx(styles.btn, styles.btnCancel)} onClick={() => openModal({ type: "cancel", res: r })}><X /> Cancelar</button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.pendingEmpty}>
              <CheckCheck size={30} />
              <div>
                <h3>Todo al día</h3>
                <p>No tenés reservas pendientes por confirmar. ¡Bien ahí!</p>
              </div>
            </div>
          )}
        </section>

        <div className={cx(styles.scheduleLayout, viewMode === "list" && styles.listView)}>
          {/* CALENDARIO */}
          <div className={styles.calendarColumn}>
            <section className={styles.calendarPanel} aria-label="Calendario de reservas">
              <div className={styles.segmented}>
                <button className={cx(styles.btn, styles.btnGhost, styles.btnSegment)} data-active={calendarView === "month"} onClick={() => setCalendarView("month")}>Mensual</button>
                <button className={cx(styles.btn, styles.btnGhost, styles.btnSegment)} data-active={calendarView === "week"} onClick={() => setCalendarView("week")}>Semanal</button>
              </div>
              <div className={styles.calendarMonth}>
                <span>{monthLabel}</span>
                <div className={styles.calendarNav}>
                  <button className={cx(styles.btn, styles.btnGhost, styles.btnIcon)} aria-label="Período anterior" onClick={() => moveCalendar(-1)}><ChevronLeft /></button>
                  <button className={cx(styles.btn, styles.btnGhost, styles.btnIcon)} aria-label="Período siguiente" onClick={() => moveCalendar(1)}><ChevronRight /></button>
                </div>
              </div>
              <div className={styles.calendarGrid}>
                {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <div key={i} className={styles.calendarWeekday}>{d}</div>)}
                {calendarCells.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} />;
                  const key = dateKey(day);
                  const statuses = [...new Set(monthData.filter((r) => r.reservation_date === key).map((r) => r.status as string))].slice(0, 3);
                  const blocked = blockedDates.includes(key);
                  return (
                    <button
                      key={key}
                      className={styles.calendarDay}
                      data-selected={key === selectedDate}
                      data-today={key === today}
                      data-blocked={blocked}
                      aria-label={`Ver reservas del ${dateLabel(key)}${blocked ? " (cerrado)" : ""}`}
                      aria-pressed={key === selectedDate}
                      onClick={() => { setSelectedDate(key); setMenuId(null); }}
                    >
                      <span>{day.getDate()}</span>
                      {!blocked && (
                        <span className={styles.dayDots}>
                          {statuses.map((s) => <span key={s} className={cx(styles.statusDot, DOT_CLASS[s])} />)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className={styles.calendarLegend}>
                {(["pendiente", "confirmada", "programada", "suspendida", "cancelada"] as const).map((s) => (
                  <span key={s}><i className={cx(styles.statusDot, DOT_CLASS[s])} />{STATUS_LABEL[s]}</span>
                ))}
              </div>
            </section>
            <div className={styles.dayInfo}>
              <CalendarCheck size={16} />
              <span>{isClosed ? "Las reservas están cerradas" : "Las reservas están abiertas"}<br />para el {dateLabel(selectedDate, true)}.</span>
            </div>
            {closeDayButton}
          </div>

          {/* AGENDA DEL DÍA */}
          <section aria-label="Agenda del día">
            <div className={styles.agendaHeader}>
              <div>
                <h2 className={cx(styles.agendaTitle, styles.display)}>{selectedDate === today ? "Hoy" : "Agenda"}<small> · {dateLabel(selectedDate, true)}</small></h2>
                <p className={styles.agendaSummary}>
                  <b>{expected.length} {expected.length === 1 ? "reserva" : "reservas"}</b> · <b>{expectedPeople} {expectedPeople === 1 ? "persona" : "personas"}</b>
                  {dailyReservations.length > expected.length && <span> a recibir</span>}
                </p>
              </div>
              {viewMode === "list" ? (
                <div className={styles.listDateControl}>
                  <button className={cx(styles.btn, styles.btnGhost, styles.btnIcon)} aria-label="Día anterior" onClick={() => moveDay(-1)}><ChevronLeft /></button>
                  <input aria-label="Fecha de la agenda" type="date" value={selectedDate} className={styles.dateInput} onChange={(e) => { if (e.target.value) { setSelectedDate(e.target.value); setCurrentMonth(parseDay(e.target.value)); } }} />
                  <button className={cx(styles.btn, styles.btnGhost, styles.btnIcon)} aria-label="Día siguiente" onClick={() => moveDay(1)}><ChevronRight /></button>
                </div>
              ) : (
                <button className={cx(styles.btn, styles.btnGhost, styles.todayTag)} onClick={() => { setSelectedDate(today); setCurrentMonth(new Date()); }}><CalendarDays size={12} />Hoy</button>
              )}
            </div>

            {isClosed && <div className={styles.closedNotice}><Ban size={14} /><span>Reservas cerradas para este día</span></div>}

            {dailyReservations.length ? (
              <div className={styles.agendaList}>
                {dailyReservations.map((r) => (
                  <article className={styles.reservationCard} key={r.id}>
                    <div className={styles.reservationTop}>
                      <time className={cx(styles.reservationTime, styles.display)}>{String(r.reservation_time).slice(0, 5)}</time>
                      <div className={styles.reservationPerson}>
                        <h3 className={styles.reservationName}>{fullName(r)}</h3>
                        <div className={styles.reservationPeople}><Users size={13} />{r.guests} {Number(r.guests) === 1 ? "persona" : "personas"}</div>
                      </div>
                      <span className={cx(styles.statusBadge, STATUS_CLASS[r.status] || styles.statusPendiente)}><span className={styles.statusDot} />{STATUS_LABEL[r.status] || r.status}</span>
                      <div className={styles.menuWrap} data-res-menu>
                        <button className={cx(styles.btn, styles.btnGhost, styles.btnIcon)} title="Más acciones" aria-label={`Más acciones para ${fullName(r)}`} aria-expanded={menuId === r.id} onClick={() => setMenuId(menuId === r.id ? null : r.id)}><Ellipsis /></button>
                        {menuId === r.id && (
                          <div className={styles.actionMenu}>
                            <button className={cx(styles.btn, styles.btnGhost)} onClick={() => openModal({ type: "reschedule", res: r })}><RefreshCw />Reprogramar</button>
                            <button className={cx(styles.btn, styles.btnGhost)} onClick={() => openModal({ type: "note", res: r })}><NotebookPen />Nota privada del dueño</button>
                            <button className={cx(styles.btn, styles.btnGhost)} onClick={() => openModal({ type: "detail", res: r })}><Eye />Ver detalle</button>
                            <button className={cx(styles.btn, styles.btnGhost, styles.danger)} onClick={() => openModal({ type: "delete", res: r })}><Trash2 />Eliminar</button>
                          </div>
                        )}
                      </div>
                    </div>
                    {r.notes && <p className={styles.reservationNote}><MessageSquare size={13} />{r.notes}</p>}
                    {r.admin_notes && <p className={styles.reservationNote}><NotebookPen size={13} />{r.admin_notes}</p>}
                    <div className={styles.reservationBottom}>
                      <div className={styles.cardActions}>
                        {r.status === "pendiente" && <button className={cx(styles.btn, styles.btnConfirm)} onClick={() => updateStatus(r.id, "confirmada")}><Check />Confirmar</button>}
                        {!["cancelada", "suspendida"].includes(r.status)
                          ? <button className={cx(styles.btn, styles.btnGhost)} style={{ color: "var(--muted-foreground)" }} onClick={() => openModal({ type: "cancel", res: r })}><X />Cancelar</button>
                          : <small>No se cuenta en las personas a recibir</small>}
                      </div>
                      <a className={cx(styles.btn, styles.btnWhatsapp)} href={whatsappUrl(r.customer_phone)} target="_blank" rel="noopener noreferrer">
                        <MessageCircle /><span><span className={styles.waLong}>Contactar por </span><span className={styles.waShort}>Escribir por </span>WhatsApp</span><ArrowUpRight />
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <CalendarDays size={35} strokeWidth={1.5} />
                <h3>Un día sin reservas, por ahora</h3>
                <p>Cuando llegue la próxima, la vas a ver acá.<br />También podés anotar una que recibiste por teléfono.</p>
                <button className={cx(styles.btn, styles.btnConfirm)} onClick={() => openModal({ type: "manual" })}><Plus />Carga manual</button>
              </div>
            )}
            {viewMode === "list" && closeDayButton}
          </section>
        </div>

        {/* MODALES */}
        {modal && (
          <div className={styles.modalBackdrop} onClick={() => setModal(null)}>
            <section className={styles.modal} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              {modal.type === "manual" && (
                <>
                  <h2 className={cx(styles.modalTitle, styles.display)}>Nueva reserva<button className={cx(styles.btn, styles.btnGhost, styles.btnIcon)} aria-label="Cerrar ventana" onClick={() => setModal(null)}><X /></button></h2>
                  <div className={styles.twoCols}>
                    <label>Nombre<input value={manualData.customer_name} onChange={(e) => setManualData({ ...manualData, customer_name: e.target.value })} placeholder="Ej: Sofía" /></label>
                    <label>Apellido<input value={manualData.customer_lastname} onChange={(e) => setManualData({ ...manualData, customer_lastname: e.target.value })} placeholder="Ej: García" /></label>
                  </div>
                  <label>WhatsApp<input type="tel" value={manualData.customer_phone} onChange={(e) => setManualData({ ...manualData, customer_phone: e.target.value })} placeholder="Ej: 1123456789" /></label>
                  <div className={styles.twoCols}>
                    <label>Fecha<input type="date" value={manualData.reservation_date} onChange={(e) => setManualData({ ...manualData, reservation_date: e.target.value })} /></label>
                    <label>Hora<input type="time" value={manualData.reservation_time} onChange={(e) => setManualData({ ...manualData, reservation_time: e.target.value })} /></label>
                  </div>
                  <label>Cantidad de personas<input type="number" min={1} max={50} value={manualData.guests} onChange={(e) => setManualData({ ...manualData, guests: Math.max(1, Number(e.target.value) || 1) })} /></label>
                  <label>Nota del cliente (opcional)<textarea rows={2} value={manualData.notes} onChange={(e) => setManualData({ ...manualData, notes: e.target.value })} /></label>
                  <div className={styles.modalActions}>
                    <button className={cx(styles.btn, styles.btnOutline)} onClick={() => setModal(null)}>Volver</button>
                    <button className={cx(styles.btn, styles.btnConfirm)} onClick={handleManualReserve}><Check />Ingresar reserva</button>
                  </div>
                </>
              )}

              {modal.type === "reschedule" && (
                <>
                  <h2 className={cx(styles.modalTitle, styles.display)}>Reprogramar reserva<button className={cx(styles.btn, styles.btnGhost, styles.btnIcon)} aria-label="Cerrar ventana" onClick={() => setModal(null)}><X /></button></h2>
                  <div className={styles.twoCols}>
                    <label>Fecha<input type="date" value={rescheduleData.date} onChange={(e) => setRescheduleData({ ...rescheduleData, date: e.target.value })} /></label>
                    <label>Hora<input type="time" value={rescheduleData.time} onChange={(e) => setRescheduleData({ ...rescheduleData, time: e.target.value })} /></label>
                  </div>
                  <div className={styles.modalActions}>
                    <button className={cx(styles.btn, styles.btnOutline)} onClick={() => setModal(null)}>Volver</button>
                    <button className={cx(styles.btn, styles.btnConfirm)} onClick={confirmReschedule}><Check />Guardar</button>
                  </div>
                </>
              )}

              {modal.type === "note" && (
                <>
                  <h2 className={cx(styles.modalTitle, styles.display)}>Nota privada del dueño<button className={cx(styles.btn, styles.btnGhost, styles.btnIcon)} aria-label="Cerrar ventana" onClick={() => setModal(null)}><X /></button></h2>
                  <label>Solo para vos<textarea rows={4} value={noteData.text} onChange={(e) => setNoteData({ ...noteData, text: e.target.value })} placeholder="Anotá algo importante..." /></label>
                  <div className={styles.modalActions}>
                    <button className={cx(styles.btn, styles.btnOutline)} onClick={() => setModal(null)}>Volver</button>
                    <button className={cx(styles.btn, styles.btnConfirm)} onClick={saveAdminNote}><Check />Guardar nota</button>
                  </div>
                </>
              )}

              {modal.type === "detail" && (
                <>
                  <h2 className={cx(styles.modalTitle, styles.display)}>Detalle de la reserva<button className={cx(styles.btn, styles.btnGhost, styles.btnIcon)} aria-label="Cerrar ventana" onClick={() => setModal(null)}><X /></button></h2>
                  <div className={styles.detail}>
                    <p style={{ fontWeight: 600, fontSize: 16 }}>{fullName(modal.res)}</p>
                    <p>{dateLabel(modal.res.reservation_date)} · {String(modal.res.reservation_time).slice(0, 5)} h</p>
                    <p>{modal.res.guests} {Number(modal.res.guests) === 1 ? "persona" : "personas"} · {STATUS_LABEL[modal.res.status] || modal.res.status}</p>
                    <div className={styles.detailBox}><small>WhatsApp</small>{modal.res.customer_phone}</div>
                    {modal.res.notes && <div className={styles.detailBox}><small>Nota del cliente</small>{modal.res.notes}</div>}
                    {modal.res.admin_notes && <div className={styles.detailBox}><small>Tus notas internas</small>{modal.res.admin_notes}</div>}
                  </div>
                  <div className={styles.modalActions}>
                    <button className={cx(styles.btn, styles.btnOutline)} onClick={() => setModal(null)}>Cerrar</button>
                  </div>
                </>
              )}

              {(modal.type === "cancel" || modal.type === "delete" || modal.type === "close") && (
                <>
                  <h2 className={cx(styles.modalTitle, styles.display)}>
                    {modal.type === "cancel" ? "Cancelar reserva" : modal.type === "delete" ? "Eliminar reserva" : isClosed ? "Reabrir reservas" : "Cerrar reservas para este día"}
                    <button className={cx(styles.btn, styles.btnGhost, styles.btnIcon)} aria-label="Cerrar ventana" onClick={() => setModal(null)}><X /></button>
                  </h2>
                  <p className={styles.modalText}>
                    {modal.type === "cancel" && `¿Querés cancelar la reserva de ${fullName(modal.res)}? Ya no se contará en las personas a recibir.`}
                    {modal.type === "delete" && `¿Querés eliminar la reserva de ${fullName(modal.res)}? Esta acción no se puede deshacer.`}
                    {modal.type === "close" && (isClosed
                      ? `Vas a volver a aceptar reservas para el ${dateLabel(selectedDate)}.`
                      : `No se podrán hacer nuevas reservas para el ${dateLabel(selectedDate)}. Las reservas existentes se mantienen.`)}
                  </p>
                  <div className={styles.modalActions}>
                    <button className={cx(styles.btn, styles.btnOutline)} onClick={() => setModal(null)}>Volver</button>
                    <button
                      className={cx(styles.btn, modal.type === "close" && isClosed ? styles.btnConfirm : styles.btnDestructive)}
                      onClick={() => {
                        if (modal.type === "cancel") updateStatus(modal.res.id, "cancelada");
                        if (modal.type === "delete") handleDelete(modal.res.id);
                        if (modal.type === "close") toggleBlockDate();
                        setModal(null);
                      }}
                    >
                      {modal.type === "cancel" ? "Sí, cancelar reserva" : modal.type === "delete" ? "Eliminar" : isClosed ? "Reabrir reservas" : "Cerrar reservas"}
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </>
  );
}
