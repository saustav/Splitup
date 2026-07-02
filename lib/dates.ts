/** Calendar date helpers for expense entry (no time-of-day). */

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function today(): Date {
  return startOfDay(new Date());
}

/** YYYY-MM-DD in local timezone — matches Postgres `date` columns. */
export function toISODateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISODate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return startOfDay(new Date(y, m - 1, d));
}

export function formatExpenseDate(
  value: Date | string,
  locale = 'en-NP'
): string {
  const date = typeof value === 'string' ? parseISODate(value) : value;
  return date.toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Shorter label for expense lists. */
export function formatExpenseDateCompact(
  value: Date | string,
  locale = 'en-NP'
): string {
  const date = typeof value === 'string' ? parseISODate(value) : value;
  const now = new Date();
  const sameYear = date.getFullYear() === now.getFullYear();

  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

export function startOfMonth(date: Date): Date {
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function addMonths(date: Date, count: number): Date {
  return startOfDay(new Date(date.getFullYear(), date.getMonth() + count, 1));
}

export function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function dateFromMonthDay(month: Date, day: number): Date {
  return startOfDay(new Date(month.getFullYear(), month.getMonth(), day));
}

export type CalendarCell = {
  date: Date;
  inCurrentMonth: boolean;
};

/** Monday-first grid including trailing/leading days from adjacent months. */
export function calendarMonthGrid(viewMonth: Date): CalendarCell[][] {
  const first = startOfMonth(viewMonth);
  const leadingBlanks = (first.getDay() + 6) % 7;
  const totalDays = daysInMonth(viewMonth);
  const cells: CalendarCell[] = [];

  const prevMonth = addMonths(viewMonth, -1);
  const prevMonthDays = daysInMonth(prevMonth);
  for (let i = leadingBlanks - 1; i >= 0; i--) {
    cells.push({
      date: dateFromMonthDay(prevMonth, prevMonthDays - i),
      inCurrentMonth: false,
    });
  }

  for (let day = 1; day <= totalDays; day++) {
    cells.push({
      date: dateFromMonthDay(viewMonth, day),
      inCurrentMonth: true,
    });
  }

  const nextMonth = addMonths(viewMonth, 1);
  let nextDay = 1;
  while (cells.length % 7 !== 0 || cells.length < 42) {
    cells.push({
      date: dateFromMonthDay(nextMonth, nextDay++),
      inCurrentMonth: false,
    });
  }

  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}
