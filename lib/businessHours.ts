// Horario de atención del menú público. checkIsOpen es copia de la función del
// mismo nombre en app/[slug]/page.tsx (hora de Buenos Aires); isRestaurantOpen
// replica la condición con la que esa página arma `isOpen`.

export function checkIsOpen(businessHours: any) {
  if (!businessHours) return true;
  try {
    const now = new Date();
    const dayFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Argentina/Buenos_Aires",
      weekday: "long",
    });
    const dayName = dayFormatter.format(now).toLowerCase();
    const timeFormatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Argentina/Buenos_Aires",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const currentTime = timeFormatter.format(now);
    const todayConfig = businessHours[dayName];

    if (!todayConfig || !todayConfig.isOpen) return false;

    const fixTime = (time: string) => (time === "00:00" ? "24:00" : time);
    const open1 = todayConfig.open || "09:00";
    const close1 = fixTime(todayConfig.close || "13:00");

    const isInsideFirstSlot = currentTime >= open1 && currentTime <= close1;
    const isInsideSecondSlot =
      todayConfig.isSplit &&
      currentTime >= (todayConfig.open2 || "17:00") &&
      currentTime <= fixTime(todayConfig.close2 || "23:00");

    return isInsideFirstSlot || isInsideSecondSlot;
  } catch (err) {
    return true;
  }
}

export function isRestaurantOpen(restaurant: { always_open?: boolean | null; is_open?: boolean | null; business_hours?: any }) {
  return !!(restaurant.always_open || (restaurant.is_open && checkIsOpen(restaurant.business_hours)));
}
