export interface HemicycleOptions {
  radius: number;
  innerRadius: number;
  dotRadius: number;
  gap: number;
}

interface RowLayout {
  radius: number;
  nominalCapacity: number;
}

interface SeatPosition {
  x: number;
  y: number;
  angle: number;
}

function buildRows(totalSeats: number, options: HemicycleOptions): RowLayout[] {
  const { radius, innerRadius, dotRadius, gap } = options;
  const unit = 2 * dotRadius + gap;
  const maxRows = Math.max(1, Math.floor((radius - innerRadius) / unit) + 1);

  let rows: RowLayout[] = [];
  for (let numRows = 1; numRows <= maxRows; numRows++) {
    rows = [];
    for (let i = 0; i < numRows; i++) {
      const rowRadius = numRows === 1 ? radius : innerRadius + (i * (radius - innerRadius)) / (numRows - 1);
      // Nominal capacity at a fixed physical spacing — used only to weight how many
      // seats each row gets; actual per-row spacing is re-derived to always span the
      // full 180° so every row is flush at both ends (see layoutHemicycleSeats).
      const nominalCapacity = Math.max(1, Math.floor((Math.PI * rowRadius) / unit) + 1);
      rows.push({ radius: rowRadius, nominalCapacity });
    }
    const totalCapacity = rows.reduce((sum, row) => sum + row.nominalCapacity, 0);
    if (totalCapacity >= totalSeats) break;
  }
  return rows;
}

function distributeSeatsAcrossRows(totalSeats: number, rows: RowLayout[]): number[] {
  const totalCapacity = rows.reduce((sum, row) => sum + row.nominalCapacity, 0);
  const rawShares = rows.map((row) => (totalSeats * row.nominalCapacity) / totalCapacity);
  const floors = rawShares.map(Math.floor);
  const remainder = totalSeats - floors.reduce((sum, v) => sum + v, 0);
  const order = floors
    .map((floor, index) => ({ index, fraction: rawShares[index] - floor }))
    .sort((a, b) => b.fraction - a.fraction);
  const seatsPerRow = [...floors];
  for (let k = 0; k < remainder; k++) {
    seatsPerRow[order[k].index] += 1;
  }
  return seatsPerRow;
}

/**
 * Lays out `totalSeats` dots in concentric semicircle arcs, sorted left-to-right by
 * angle. Each row's seats are spread across the full 180° (angle π to 0), so every
 * row — including the outermost, bottom-most one — is flush with both ends of the
 * semicircle rather than leaving a gap.
 */
export function layoutHemicycleSeats(totalSeats: number, options: HemicycleOptions): SeatPosition[] {
  if (totalSeats <= 0) return [];

  const rows = buildRows(totalSeats, options);
  const seatsPerRow = distributeSeatsAcrossRows(totalSeats, rows);

  const positions: SeatPosition[] = [];
  rows.forEach((row, i) => {
    const count = seatsPerRow[i];
    if (count <= 0) return;
    const angleStep = count > 1 ? Math.PI / (count - 1) : 0;
    for (let k = 0; k < count; k++) {
      const angle = count > 1 ? Math.PI - k * angleStep : Math.PI / 2;
      positions.push({
        x: row.radius * Math.cos(angle),
        y: row.radius * Math.sin(angle),
        angle,
      });
    }
  });

  positions.sort((a, b) => b.angle - a.angle);
  return positions;
}
