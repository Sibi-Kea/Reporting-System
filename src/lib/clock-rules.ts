function timeStringToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function getCurrentTimeInTimezone(timezone: string, date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const [hours, minutes] = formatter.format(date).split(":").map(Number);
  return hours * 60 + minutes;
}

function isMinutesInRange(current: number, start: number, end: number) {
  if (start <= end) {
    return current >= start && current <= end;
  }

  return current >= start || current <= end;
}

export function isTimeWithinClockWindow(options: {
  timezone: string;
  start: string;
  end: string;
  date?: Date;
}) {
  const currentMinutes = getCurrentTimeInTimezone(options.timezone, options.date);
  const startMinutes = timeStringToMinutes(options.start);
  const endMinutes = timeStringToMinutes(options.end);

  return isMinutesInRange(currentMinutes, startMinutes, endMinutes);
}

export function getClockWindowLabel(start: string, end: string) {
  return `${start} - ${end}`;
}

export function getClockWindowMode(options: {
  timezone: string;
  settings: {
    enforceClockWindows: boolean;
    clockInWindowStart: string;
    clockInWindowEnd: string;
    clockOutWindowStart: string;
    clockOutWindowEnd: string;
  } | null;
  date?: Date;
}): "CLOCK_IN" | "CLOCK_OUT" | "FLEX" {
  if (!options.settings?.enforceClockWindows) {
    return "FLEX";
  }

  if (
    isTimeWithinClockWindow({
      timezone: options.timezone,
      start: options.settings.clockOutWindowStart,
      end: options.settings.clockOutWindowEnd,
      date: options.date,
    })
  ) {
    return "CLOCK_OUT";
  }

  if (
    isTimeWithinClockWindow({
      timezone: options.timezone,
      start: options.settings.clockInWindowStart,
      end: options.settings.clockInWindowEnd,
      date: options.date,
    })
  ) {
    return "CLOCK_IN";
  }

  return "FLEX";
}
