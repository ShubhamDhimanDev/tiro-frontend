/**
 * Cart labels are stored as one display string, e.g. "Bridgestone Turanza T005
 * 205/55 R16". The cart shows the name and the size on separate lines, so split
 * a trailing size off when there is one. Falls back to the whole label as the
 * name. The size may include a load/speed suffix ("205/55 R16 91V").
 */
const SIZE_AT_END = /\s(\d{3}\/\d{2}\s?Z?R\d{2}(?:\s?\d{2,3}[A-Z]{1,2})?)$/i;

export function splitTyreLabel(label: string): { name: string; size: string | null } {
  const match = SIZE_AT_END.exec(label);
  if (!match) return { name: label, size: null };
  return { name: label.slice(0, match.index).trim(), size: match[1].trim() };
}
