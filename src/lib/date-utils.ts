/**
 * IST (Indian Standard Time) date utilities.
 * All date logic in this platform uses IST (UTC+5:30) since we only operate in India.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

/** Get the current Date/Time shifted to IST */
export function nowIST(): Date {
  return new Date(Date.now() + IST_OFFSET_MS)
}

/** Get today's date at midnight in IST (as a local Date object) */
export function getTodayIST(): Date {
  const ist = nowIST()
  return new Date(ist.getFullYear(), ist.getMonth(), ist.getDate())
}

/** Format a Date as 'YYYY-MM-DD' in IST */
export function toISTDateString(date: Date): string {
  const ist = new Date(date.getTime() + IST_OFFSET_MS)
  const y = ist.getUTCFullYear()
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0')
  const d = String(ist.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Check if two dates fall on the same IST calendar day */
export function isSameISTDate(date1: Date, date2: Date): boolean {
  return toISTDateString(date1) === toISTDateString(date2)
}

/** Get current IST hour (0-23) and minute (0-59) */
export function getISTHourMinute(): { hour: number; minute: number } {
  const ist = nowIST()
  return { hour: ist.getHours(), minute: ist.getMinutes() }
}

/** Parse a 'YYYY-MM-DD' string into a local Date at midnight (no timezone shift) */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}
