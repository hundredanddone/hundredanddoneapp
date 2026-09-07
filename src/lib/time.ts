import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

import type { DayOfWeek, TimeBlock } from '@/types';

dayjs.extend(customParseFormat);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export { dayjs };

export const DAY_LABELS: Record<DayOfWeek, string> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

/** Monday-first ordering for the day selector, matching how clinics publish hours. */
export const WEEK_ORDER: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];

/** 'HH:mm' or 'HH:mm:ss' -> minutes since midnight. */
export function timeToMinutes(time: string): number {
  const [h = '0', m = '0'] = time.split(':');
  return Number(h) * 60 + Number(m);
}

/** Minutes since midnight -> 'HH:mm'. */
export function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(minutes, 24 * 60));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 'HH:mm[:ss]' -> '10:30 AM' for display. */
export function formatTimeLabel(time: string): string {
  return dayjs(time.slice(0, 5), 'HH:mm').format('h:mm A');
}

/** Postgres `time` columns round-trip as 'HH:mm:ss'. */
export function toPgTime(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

export function fromPgTime(time: string): string {
  return time.slice(0, 5);
}

/** Every `stepMinutes` time of day, for the time-block dropdowns. */
export function timeOptions(stepMinutes = 15): string[] {
  const options: string[] = [];
  for (let m = 0; m < 24 * 60; m += stepMinutes) options.push(minutesToTime(m));
  return options;
}

export function isValidBlock(block: TimeBlock): boolean {
  return timeToMinutes(block.end) > timeToMinutes(block.start);
}

/** True when two blocks on the same day overlap. */
export function blocksOverlap(a: TimeBlock, b: TimeBlock): boolean {
  return (
    timeToMinutes(a.start) < timeToMinutes(b.end) && timeToMinutes(b.start) < timeToMinutes(a.end)
  );
}

export function sortBlocks(blocks: TimeBlock[]): TimeBlock[] {
  return [...blocks].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
}

/**
 * Expand a block into bookable slot start times.
 * A slot is only produced when the whole appointment fits inside the block.
 */
export function slotsForBlock(block: TimeBlock, slotDurationMinutes: number): string[] {
  const start = timeToMinutes(block.start);
  const end = timeToMinutes(block.end);
  const slots: string[] = [];
  for (let m = start; m + slotDurationMinutes <= end; m += slotDurationMinutes) {
    slots.push(minutesToTime(m));
  }
  return slots;
}

export function describeBlocks(blocks: TimeBlock[]): string {
  if (blocks.length === 0) return 'Closed';
  return sortBlocks(blocks)
    .map((b) => `${formatTimeLabel(b.start)} – ${formatTimeLabel(b.end)}`)
    .join(', ');
}
