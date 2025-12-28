/**
 * Generate .ics calendar file content for a reminder
 */
export function generateICS(
  reminderId: string,
  title: string,
  description: string,
  startDate: Date,
  endDate?: Date
): string {
  const formatICSDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const icsStart = formatICSDate(startDate);
  const icsEnd = formatICSDate(endDate || new Date(startDate.getTime() + 60 * 60 * 1000)); // 1 hour default
  
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ClaimPilot//Reminder//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${reminderId}@claimpilot`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${icsStart}`,
    `DTEND:${icsEnd}`,
    `SUMMARY:${escapeICS(title)}`,
    `DESCRIPTION:${escapeICS(description)}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeICS(title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/**
 * Escape special characters for ICS format
 */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}

/**
 * Download ICS file
 */
export function downloadICS(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

