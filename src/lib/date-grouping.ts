// Groups a list of items into calendar-day buckets, keyed by a "YYYY-MM-DD"
// string derived from each item's own local date — used to turn a flood of
// per-address tour/debrief rows into one card per day toured.

export function dateKey(iso: string): string {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function groupByDateKey<T>(items: T[], getIso: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = dateKey(getIso(item));
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

export function formatDateHeading(key: string): string {
  // key is "YYYY-MM-DD"; parse as local, not UTC, so it never shifts a day.
  const [year, month, day] = key.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
