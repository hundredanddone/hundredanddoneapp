import { EMPTY_WEEK } from '@/components/DayTimeBlockPicker';
import { fromPgTime } from '@/lib/time';
import type { AvailabilityRule, DayOfWeek, WeeklyAvailability } from '@/types';

export const DEFAULT_SLOT_MINUTES = 15;

/** Rows from `availability_rules` -> the shape DayTimeBlockPicker edits. */
export function rulesToWeekly(rules: AvailabilityRule[]): WeeklyAvailability {
  const weekly: WeeklyAvailability = {
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  };
  for (const rule of rules) {
    const day = rule.day_of_week as DayOfWeek;
    if (!weekly[day]) continue;
    weekly[day].push({ start: fromPgTime(rule.start_time), end: fromPgTime(rule.end_time) });
  }
  return weekly;
}

/** All rules share one slot length today; fall back when the org has no rules yet. */
export function slotDurationFromRules(rules: AvailabilityRule[]): number {
  return rules[0]?.slot_duration_minutes ?? DEFAULT_SLOT_MINUTES;
}

export function isWeekEmpty(weekly: WeeklyAvailability): boolean {
  return (Object.values(weekly) as WeeklyAvailability[DayOfWeek][]).every(
    (blocks) => blocks.length === 0,
  );
}

export function cloneEmptyWeek(): WeeklyAvailability {
  return { ...EMPTY_WEEK, 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
}

/** A sensible starting pattern: Mon–Fri, 10:00–13:00 and 17:00–20:00. */
export function defaultClinicWeek(): WeeklyAvailability {
  const week = cloneEmptyWeek();
  for (const day of [1, 2, 3, 4, 5] as DayOfWeek[]) {
    week[day] = [
      { start: '10:00', end: '13:00' },
      { start: '17:00', end: '20:00' },
    ];
  }
  return week;
}
