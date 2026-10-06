export function formatCurrency(amount: number, maxFractionDigits = 0): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  }).format(amount);
}

// <input type="datetime-local"> value (local time, no zone) → ISO UTC string for the API
export function localInputToIso(value: string): string {
  return new Date(value).toISOString();
}

// ISO string / Date → "YYYY-MM-DDTHH:mm" in local time for <input type="datetime-local">
export function isoToLocalInput(value: string | Date): string {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function timeRemaining(endTime: string): string {
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  return `${formatDuration(diff)} left`;
}

// Published auctions can start later: bidding opens at startTime
export function isUpcoming(startTime: string): boolean {
  return new Date(startTime).getTime() > Date.now();
}

export function timeUntilStart(startTime: string): string {
  const diff = new Date(startTime).getTime() - Date.now();
  if (diff <= 0) return "Started";
  return `Starts in ${formatDuration(diff)}`;
}

// ms → "2d 3h" / "3h 5m" / "5m"
function formatDuration(diff: number): string {
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
