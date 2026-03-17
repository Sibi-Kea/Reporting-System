import { type ClassValue, clsx } from "clsx";
import { format, formatDistanceStrict } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(value?: Date | string | null) {
  if (!value) {
    return "--";
  }

  return format(new Date(value), "HH:mm");
}

export function formatDateLabel(value?: Date | string | null, pattern = "dd MMM yyyy") {
  if (!value) {
    return "--";
  }

  return format(new Date(value), pattern);
}

export function minutesToHoursLabel(minutes = 0) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function formatDurationBetween(start?: Date | string | null, end?: Date | string | null) {
  if (!start || !end) {
    return "--";
  }

  return formatDistanceStrict(new Date(start), new Date(end), {
    unit: "minute",
  });
}

export function getInitials(name?: string | null) {
  if (!name) {
    return "WT";
  }

  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
