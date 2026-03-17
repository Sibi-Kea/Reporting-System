import { AttendanceStatus, ShiftType } from "@prisma/client";
import { addDays, differenceInMinutes, eachDayOfInterval, isAfter, startOfDay } from "date-fns";

type ShiftRuleInput = {
  startTime: string;
  endTime: string;
  lateAfter: string;
  overtimeAfterMinutes: number;
  type?: ShiftType;
};

export function normalizeAttendanceDate(date = new Date()) {
  return startOfDay(date);
}

export function applyTime(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const shifted = new Date(date);
  shifted.setHours(hours, minutes, 0, 0);
  return shifted;
}

export function resolveShiftWindow(date: Date, shift: ShiftRuleInput) {
  const start = applyTime(date, shift.startTime);
  let end = applyTime(date, shift.endTime);
  const lateAfter = applyTime(date, shift.lateAfter);

  if (end <= start) {
    end = addDays(end, 1);
  }

  return {
    start,
    end,
    lateAfter,
  };
}

export function calculateAttendanceMetrics(input: {
  clockIn: Date;
  clockOut?: Date | null;
  shift: ShiftRuleInput;
}) {
  const { clockIn, clockOut, shift } = input;
  const shiftWindow = resolveShiftWindow(clockIn, shift);
  const lateMinutes = isAfter(clockIn, shiftWindow.lateAfter)
    ? differenceInMinutes(clockIn, shiftWindow.start)
    : 0;

  if (!clockOut) {
    return {
      totalMinutes: 0,
      overtimeMinutes: 0,
      lateMinutes,
      earlyLeaveMinutes: 0,
      status: AttendanceStatus.CLOCKED_IN,
    };
  }

  const totalMinutes = Math.max(0, differenceInMinutes(clockOut, clockIn));
  const scheduledMinutes = Math.max(shift.overtimeAfterMinutes, differenceInMinutes(shiftWindow.end, shiftWindow.start));
  const overtimeMinutes = Math.max(0, totalMinutes - scheduledMinutes);
  const earlyLeaveMinutes = clockOut < shiftWindow.end ? differenceInMinutes(shiftWindow.end, clockOut) : 0;

  return {
    totalMinutes,
    overtimeMinutes,
    lateMinutes,
    earlyLeaveMinutes,
    status: lateMinutes > 0 ? AttendanceStatus.LATE : AttendanceStatus.COMPLETED,
  };
}

export function calculateAbsenceDays<T extends { date: Date; status: AttendanceStatus }>(
  entries: T[],
  rangeStart: Date,
  rangeEnd: Date,
  workDays = [1, 2, 3, 4, 5],
) {
  if (normalizeAttendanceDate(rangeStart) > normalizeAttendanceDate(rangeEnd)) {
    return 0;
  }

  const expectedWorkDates = eachDayOfInterval({
    start: normalizeAttendanceDate(rangeStart),
    end: normalizeAttendanceDate(rangeEnd),
  })
    .filter((date) => workDays.includes(date.getDay()))
    .map((date) => normalizeAttendanceDate(date).toISOString());

  const attendedDates = new Set(
    entries
      .filter((entry) => entry.status !== AttendanceStatus.ABSENT && entry.status !== AttendanceStatus.ON_LEAVE)
      .map((entry) => normalizeAttendanceDate(entry.date).toISOString()),
  );

  const excusedDates = new Set(
    entries
      .filter((entry) => entry.status === AttendanceStatus.ON_LEAVE)
      .map((entry) => normalizeAttendanceDate(entry.date).toISOString()),
  );

  return expectedWorkDates.filter((dateKey) => !attendedDates.has(dateKey) && !excusedDates.has(dateKey)).length;
}
