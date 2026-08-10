export const EVENT_TIME_ZONE = "America/Toronto"

const localDateTimePattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
const explicitTimeZonePattern = /(?:Z|[+-]\d{2}:?\d{2})$/i

function getTimeZoneOffsetMs(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const zonedTimeAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  )

  return zonedTimeAsUtc - date.getTime()
}

export function eventDateTimeToDate(value: string) {
  if (explicitTimeZonePattern.test(value)) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) throw new Error("Enter a valid date and time.")
    return date
  }

  const match = localDateTimePattern.exec(value)
  if (!match) throw new Error("Enter a valid date and time.")

  const [, year, month, day, hour, minute, second = "0"] = match
  const wallTimeAsUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  )
  const wallTimeCheck = new Date(wallTimeAsUtc)

  if (
    wallTimeCheck.getUTCFullYear() !== Number(year) ||
    wallTimeCheck.getUTCMonth() !== Number(month) - 1 ||
    wallTimeCheck.getUTCDate() !== Number(day) ||
    wallTimeCheck.getUTCHours() !== Number(hour) ||
    wallTimeCheck.getUTCMinutes() !== Number(minute) ||
    wallTimeCheck.getUTCSeconds() !== Number(second)
  ) {
    throw new Error("Enter a valid date and time.")
  }

  let utcTime = wallTimeAsUtc - getTimeZoneOffsetMs(new Date(wallTimeAsUtc))
  utcTime = wallTimeAsUtc - getTimeZoneOffsetMs(new Date(utcTime))
  const date = new Date(utcTime)

  if (formatEventDateTimeLocal(date.toISOString()) !== value.slice(0, 16)) {
    throw new Error("That local time does not exist because of daylight saving time.")
  }

  return date
}

export function isValidEventDateTime(value: string) {
  try {
    eventDateTimeToDate(value)
    return true
  } catch {
    return false
  }
}

export function formatEventDateTimeLocal(value: string | null) {
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`
}
