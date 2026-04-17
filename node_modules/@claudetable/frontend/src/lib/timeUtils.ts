/**
 * Convert "HH:MM" to total minutes from midnight.
 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Convert minutes from midnight to "HH:MM".
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Compute horizontal position (left%) and width% for a Gantt bar.
 * Business hours: 17:00 (1020 min) → 24:00 (1440 min) = 420 minutes window.
 */
const GANTT_START = 17 * 60; // 1020
const GANTT_END = 24 * 60;   // 1440
const GANTT_RANGE = GANTT_END - GANTT_START; // 420

export function ganttLeft(startTime: string): number {
  const mins = timeToMinutes(startTime);
  // Handle times past midnight (00:xx → 24:xx)
  const adjusted = mins < GANTT_START ? mins + 24 * 60 : mins;
  return ((adjusted - GANTT_START) / GANTT_RANGE) * 100;
}

export function ganttWidth(durationMinutes: number): number {
  return (durationMinutes / GANTT_RANGE) * 100;
}

/**
 * Generate 30-min time slots from openTime to closeTime.
 */
export function generateTimeSlots(openTime = "17:00", closeTime = "00:00", intervalMinutes = 30): string[] {
  const slots: string[] = [];
  let current = timeToMinutes(openTime);
  const end = timeToMinutes(closeTime) || 24 * 60; // "00:00" → 1440

  while (current < end) {
    slots.push(minutesToTime(current));
    current += intervalMinutes;
  }
  return slots;
}

/**
 * Generate tick marks for the Gantt time axis.
 */
export function generateGanttTicks(intervalMinutes = 60): Array<{ time: string; left: number }> {
  const ticks = [];
  for (let mins = GANTT_START; mins <= GANTT_END; mins += intervalMinutes) {
    ticks.push({
      time: minutesToTime(mins % (24 * 60)),
      left: ((mins - GANTT_START) / GANTT_RANGE) * 100,
    });
  }
  return ticks;
}

/**
 * Get the current time as "HH:MM".
 */
export function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Current time left% on Gantt (null if outside business hours).
 */
export function currentTimeLeft(): number | null {
  const mins = timeToMinutes(nowTime());
  const adjusted = mins < GANTT_START ? mins + 24 * 60 : mins;
  if (adjusted < GANTT_START || adjusted > GANTT_END) return null;
  return ((adjusted - GANTT_START) / GANTT_RANGE) * 100;
}

/**
 * Format date to "YYYY-MM-DD" using LOCAL timezone (not UTC).
 */
export function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Format date to display string (e.g. "2026年4月15日 週三").
 */
export function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const days = ["日", "一", "二", "三", "四", "五", "六"];
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const dow = days[date.getDay()];
  return `${y}年${m}月${d}日 週${dow}`;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}
