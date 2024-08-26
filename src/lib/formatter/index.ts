const basicFormatter = new Intl.NumberFormat("en", {
  useGrouping: false,
});
const digitFormats = {} as Record<number, Intl.NumberFormat | undefined>;
const exponentialFormatter = makeFormatter(3, {
  notation: "scientific",
});
const numberSuffixList = ["", "k", "m", "b", "t", "q", "Q", "s", "S", "o", "n"];
const numberExpList = numberSuffixList.map((_, i) => parseFloat(`1e${i * 3}`));
const [ramSuffixList, ramLogFn, ramLogDivisor] = [
  ["GB", "TB", "PB", "EB"],
  Math.log10,
  3,
];
const ramExpList = ramSuffixList.map((_, i) => 1000 ** i);

function makeFormatter(
  fractionalDigits: number,
  otherOptions: Intl.NumberFormatOptions = {}
): Intl.NumberFormat {
  return new Intl.NumberFormat("en", {
    minimumFractionDigits: fractionalDigits,
    maximumFractionDigits: fractionalDigits,
    ...otherOptions,
  });
}

function formatExponential(n: number) {
  return exponentialFormatter.format(n).toLocaleLowerCase();
}

function getFormatter(
  fractionalDigits: number,
  formatList = digitFormats,
  options: Intl.NumberFormatOptions = {}
): Intl.NumberFormat {
  if (formatList[fractionalDigits])
    return formatList[fractionalDigits] as Intl.NumberFormat;
  return (formatList[fractionalDigits] = makeFormatter(
    fractionalDigits,
    options
  ));
}

export function formatNumber(
  n: number,
  fractionalDigits = 3,
  suffixStart = 1000,
  isInteger = false
) {
  // NaN does not get formatted
  if (Number.isNaN(n)) return "NaN";
  const nAbs = Math.abs(n);

  // Special handling for Infinities
  if (nAbs === Infinity) return n < 0 ? "-∞" : "∞";
  if (suffixStart < 1000) {
    throw new Error("suffixStart must be greater than or equal to 1000");
  }

  // Early return for non-suffix or if number and suffix are 0
  if (nAbs < suffixStart) {
    if (isInteger) return basicFormatter.format(n);
    return getFormatter(fractionalDigits).format(n);
  }

  // Exponential form
  if (nAbs >= 1e33) return formatExponential(n);

  // Calculate suffix index. 1000 = 10^3
  let suffixIndex = Math.floor(Math.log10(nAbs) / 3);

  n /= numberExpList[suffixIndex];
  // Todo: Find a better way to detect if number is rounding to 1000${suffix}, or find a simple way to truncate to x digits instead of rounding
  // Detect if number rounds to 1000.000 (based on number of digits given)
  if (
    Math.abs(n).toFixed(fractionalDigits).length === fractionalDigits + 5 &&
    numberSuffixList[suffixIndex + 1]
  ) {
    suffixIndex += 1;
    n = n < 0 ? -1 : 1;
  }
  return (
    getFormatter(fractionalDigits).format(n) + numberSuffixList[suffixIndex]
  );
}

export function formatBoolean(b: boolean) {
  return b ? "X" : " ";
}

/** Display standard ram formatting. */
export function formatRam(n: number, fractionalDigits = 2) {
  // NaN does not get formatted
  if (Number.isNaN(n)) return `NaN${ramSuffixList[0]}`;
  const nAbs = Math.abs(n);

  // Special handling for Infinities
  if (nAbs === Infinity) return `${n < 0 ? "-∞" : ""}∞${ramSuffixList.at(-1)}`;

  // Early return if using first suffix.
  if (nAbs < 1000)
    return getFormatter(fractionalDigits).format(n) + ramSuffixList[0];

  // Ram always uses a suffix and never goes to exponential
  const suffixIndex = Math.min(
    Math.floor(ramLogFn(nAbs) / ramLogDivisor),
    ramSuffixList.length - 1
  );
  n /= ramExpList[suffixIndex];
  /* Not really concerned with 1000-rounding or 1024-rounding for ram due to the actual values ram gets displayed at.
  If display of e.g. 1,000.00GB instead of 1.00TB for 999.995GB, or 1,024.00GiB instead of 1.00TiB for 1,023.995GiB
  becomes an actual issue we can add smart rounding, but ram values like that really don't happen ingame so it's
  probably not worth the performance overhead to check and correct these. */
  return getFormatter(fractionalDigits).format(n) + ramSuffixList[suffixIndex];
}

export function formatTime(milliseconds: number) {
  return convertTimeMsToTimeElapsedString(milliseconds, false);
}

export function convertTimeMsToTimeElapsedString(time: number, showMilli = false): string {
  const negFlag = time < 0;
  time = Math.abs(Math.floor(time));
  const millisecondsPerSecond = 1000;
  const secondPerMinute = 60;
  const minutesPerHours = 60;
  const secondPerHours: number = secondPerMinute * minutesPerHours;
  const hoursPerDays = 24;
  const secondPerDay: number = secondPerHours * hoursPerDays;

  // Convert ms to seconds, since we only have second-level precision
  const totalSeconds: number = Math.floor(time / millisecondsPerSecond);

  const days: number = Math.floor(totalSeconds / secondPerDay);
  const secTruncDays: number = totalSeconds % secondPerDay;

  const hours: number = Math.floor(secTruncDays / secondPerHours);
  const secTruncHours: number = secTruncDays % secondPerHours;

  const minutes: number = Math.floor(secTruncHours / secondPerMinute);
  const secTruncMinutes: number = secTruncHours % secondPerMinute;

  const milliTruncSec: string = (() => {
    let str = `${time % millisecondsPerSecond}`;
    while (str.length < 3) str = "0" + str;
    return str;
  })();

  const seconds: string = showMilli ? `${secTruncMinutes}.${milliTruncSec}` : `${secTruncMinutes}`;

  let res = "";
  if (days > 0) {
    res += `${days} day${days === 1 ? "" : "s"} `;
  }
  if (hours > 0) {
    res += `${hours} hour${hours === 1 ? "" : "s"} `;
  }
  if (minutes > 0) {
    res += `${minutes} minute${minutes === 1 ? "" : "s"} `;
  }
  res += `${seconds} second${!showMilli && secTruncMinutes === 1 ? "" : "s"}`;

  return negFlag ? `-(${res})` : res;
}
