import { useCallback, useEffect, useState } from 'react';

const TIMEZONE_STORAGE_KEY = 'equipment_mgmt_timezone';
const TIMEZONE_CHANGE_EVENT = 'equipment-mgmt-timezone-change';
const DEFAULT_TIMEZONE_SETTING = 'system';
const FALLBACK_TIMEZONE = 'Asia/Shanghai';

const COMMON_TIMEZONES = [
  'Asia/Shanghai',
  'UTC',
  'Asia/Tokyo',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
];

export interface TimeZoneOption {
  value: string;
  label: string;
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat('zh-CN', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function getIntlSupportedTimeZones(): string[] {
  if (typeof Intl === 'undefined') return [];
  const supportedValuesOf = (Intl as any).supportedValuesOf;
  if (typeof supportedValuesOf !== 'function') return [];
  try {
    const values = supportedValuesOf.call(Intl, 'timeZone');
    if (!Array.isArray(values)) return [];
    return values.filter((v: unknown): v is string => typeof v === 'string');
  } catch {
    return [];
  }
}

function buildTimeZoneLabel(timeZone: string): string {
  if (timeZone === 'UTC') return 'UTC';
  return timeZone;
}

function createTimeZoneOptions(timezones: string[]): TimeZoneOption[] {
  const validUnique = Array.from(
    new Set(
      timezones.filter((tz) => !!tz && isValidTimeZone(tz))
    )
  ).sort((a, b) => a.localeCompare(b));

  const common = COMMON_TIMEZONES.filter((tz) => validUnique.includes(tz));
  const rest = validUnique.filter((tz) => !common.includes(tz));
  const ordered = [...common, ...rest];

  return [
    { value: 'system', label: '跟随系统时区' },
    ...ordered.map((tz) => ({ value: tz, label: buildTimeZoneLabel(tz) })),
  ];
}

function getSystemTimeZone(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return tz && isValidTimeZone(tz) ? tz : FALLBACK_TIMEZONE;
}

export function resolveTimeZone(timezoneSetting?: string | null): string {
  const setting = timezoneSetting || DEFAULT_TIMEZONE_SETTING;
  if (setting === 'system') return getSystemTimeZone();
  return isValidTimeZone(setting) ? setting : getSystemTimeZone();
}

export function getTimezoneSetting(): string {
  if (typeof window === 'undefined') return DEFAULT_TIMEZONE_SETTING;
  const saved = window.localStorage.getItem(TIMEZONE_STORAGE_KEY);
  if (!saved) return DEFAULT_TIMEZONE_SETTING;
  if (saved === 'system' || isValidTimeZone(saved)) return saved;
  return DEFAULT_TIMEZONE_SETTING;
}

export function getActiveTimeZone(): string {
  return resolveTimeZone(getTimezoneSetting());
}

export function setTimezoneSetting(timezoneSetting: string): void {
  if (typeof window === 'undefined') return;
  const normalized =
    timezoneSetting === 'system' || isValidTimeZone(timezoneSetting)
      ? timezoneSetting
      : DEFAULT_TIMEZONE_SETTING;
  window.localStorage.setItem(TIMEZONE_STORAGE_KEY, normalized);
  window.dispatchEvent(new CustomEvent(TIMEZONE_CHANGE_EVENT));
}

export function useTimezoneOptions() {
  const [options, setOptions] = useState<TimeZoneOption[]>(() =>
    createTimeZoneOptions(getIntlSupportedTimeZones())
  );

  useEffect(() => {
    let cancelled = false;
    const intlTimeZones = getIntlSupportedTimeZones();
    setOptions(createTimeZoneOptions(intlTimeZones));

    const loadBackendTimeZones = async () => {
      try {
        const response = await fetch('/api/timezones', {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) return;
        const payload = await response.json();
        const backendTimeZones = Array.isArray(payload?.timezones)
          ? payload.timezones.filter((v: unknown): v is string => typeof v === 'string')
          : [];
        const merged = [...intlTimeZones, ...backendTimeZones];
        if (!cancelled) {
          setOptions(createTimeZoneOptions(merged));
        }
      } catch {
        // 保持本地时区列表兜底，不中断页面
      }
    };

    loadBackendTimeZones();
    return () => {
      cancelled = true;
    };
  }, []);

  return options;
}

export function useTimezone() {
  const [timezoneSetting, setTimezoneState] = useState<string>(() => getTimezoneSetting());

  useEffect(() => {
    const sync = () => setTimezoneState(getTimezoneSetting());
    window.addEventListener(TIMEZONE_CHANGE_EVENT, sync as EventListener);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(TIMEZONE_CHANGE_EVENT, sync as EventListener);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const setTimezone = useCallback((next: string) => {
    setTimezoneSetting(next);
    setTimezoneState(getTimezoneSetting());
  }, []);

  return {
    timezoneSetting,
    timezone: resolveTimeZone(timezoneSetting),
    setTimezoneSetting: setTimezone,
  };
}

function parseApiDateTime(value?: string | null): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.includes(' ') && !trimmed.includes('T')
    ? trimmed.replace(' ', 'T')
    : trimmed;

  const withZone = /(?:Z|[+\-]\d{2}:\d{2})$/i.test(normalized)
    ? normalized
    : `${normalized}Z`;

  const date = new Date(withZone);
  if (!Number.isNaN(date.getTime())) return date;

  const fallback = new Date(normalized);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function formatDateTimeInTimeZone(
  value: string | undefined | null,
  timeZone: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = parseApiDateTime(value);
  if (!date) return '-';

  return new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  }).format(date);
}

export function getTodayDateInTimeZone(timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}
