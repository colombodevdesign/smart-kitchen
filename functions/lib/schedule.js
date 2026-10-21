// Time and day-window helpers for per-user notification times.
// Pure functions on epoch milliseconds + an IANA time zone, built on Intl only,
// so they can be tested with plain node (no firebase imports).

const DEFAULT_TZ = 'Europe/Rome'
const SEND_WINDOW_MIN = 30   // tolerates Scheduler jitter around the chosen time

function safeTz(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return tz
  } catch {
    return DEFAULT_TZ
  }
}

function partsIn(ms, tz) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: safeTz(tz),
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const out = {}
  for (const p of fmt.formatToParts(new Date(ms))) {
    if (p.type !== 'literal') out[p.type] = Number(p.value)
  }
  if (out.hour === 24) out.hour = 0
  return out
}

// Local wall-clock fields of `ms` in `tz`.
function localParts(ms, tz) {
  const p = partsIn(ms, tz)
  return { year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute }
}

// Offset (local minus UTC) in ms at instant `ms`.
function tzOffsetMs(ms, tz) {
  const p = partsIn(ms, tz)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - Math.floor(ms / 1000) * 1000
}

// Epoch ms of a local wall-clock time in `tz`, correct across DST changes.
function localToUtc(year, month, day, hour, minute, tz) {
  const guess = Date.UTC(year, month - 1, day, hour, minute)
  const off1 = tzOffsetMs(guess, tz)
  let t = guess - off1
  const off2 = tzOffsetMs(t, tz)
  if (off2 !== off1) t = guess - off2
  return t
}

// [start, end] (inclusive) of the local calendar day `offsetDays` from today.
function dayWindow(nowMs, tz, offsetDays) {
  const p = localParts(nowMs, tz)
  const target = new Date(Date.UTC(p.year, p.month - 1, p.day + offsetDays))
  const next = new Date(Date.UTC(p.year, p.month - 1, p.day + offsetDays + 1))
  const start = localToUtc(target.getUTCFullYear(), target.getUTCMonth() + 1, target.getUTCDate(), 0, 0, tz)
  const end = localToUtc(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), 0, 0, tz) - 1
  return [start, end]
}

function localDateStr(ms, tz) {
  const p = localParts(ms, tz)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

function roundQuarter(minute) {
  const m = Number.isFinite(minute) ? minute : 0
  return Math.min(45, Math.max(0, Math.round(m / 15) * 15))
}

// True when the user's local time is within the send window of their chosen time.
function shouldSendNow(prefs, nowMs) {
  const tz = prefs.tz || DEFAULT_TZ
  const p = localParts(nowMs, tz)
  const target = (Number.isFinite(prefs.hour) ? prefs.hour : 9) * 60 + roundQuarter(prefs.minute)
  const cur = p.hour * 60 + p.minute
  return cur >= target && cur < target + SEND_WINDOW_MIN
}

module.exports = {
  DEFAULT_TZ, SEND_WINDOW_MIN,
  localParts, tzOffsetMs, localToUtc, dayWindow, localDateStr, roundQuarter, shouldSendNow,
}
