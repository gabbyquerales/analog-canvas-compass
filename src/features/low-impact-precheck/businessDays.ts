import Holidays from 'date-holidays';

const hd = new Holidays('US', 'CA');

/**
 * Count business days between two dates (exclusive of `from`, inclusive of `to`).
 * Skips weekends (Sat/Sun) and US-CA public holidays (includes Cesar Chavez Day, etc.).
 *
 * NOTE: FilmLA also enforces a 10am submission cutoff ("Application / location
 * submission is due in MyFilmLA by 10 a.m."). We do NOT enforce this at runtime
 * because the form captures a date-only submissionDate — any getHours() check
 * on a date-only string returns timezone-shifted midnight and fires incorrectly.
 * The 10am rule is documented in user-facing deadline copy instead.
 */
export function countBusinessDays(from: Date, to: Date): number {
  let count = 0;
  const current = new Date(from);
  current.setHours(0, 0, 0, 0);

  const end = new Date(to);
  end.setHours(0, 0, 0, 0);

  // Walk day by day from (from + 1 day) through to
  current.setDate(current.getDate() + 1);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = hd.isHoliday(current);
    const isPublicHoliday = Array.isArray(isHoliday)
      ? isHoliday.some((h) => h.type === 'public')
      : false;

    if (!isWeekend && !isPublicHoliday) {
      count++;
    }

    current.setDate(current.getDate() + 1);
  }

  return count;
}
