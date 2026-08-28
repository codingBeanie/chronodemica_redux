import { Group, Text } from "@mantine/core";

import { themeConfig } from "../theme.config";
import { layoutHemicycleSeats } from "../utils/hemicycleLayout";
import { DiagramSurface } from "./DiagramSurface";

interface ParliamentHemicycleParty {
  id: number;
  name: string;
  abbreviation: string;
  color: string;
  seats: number;
  seatOrientation: number;
  inGovernment: boolean;
}

const RADIUS = 220;
const INNER_RADIUS = 70;
const DOT_RADIUS = 7;
const GAP = 4;

export function ParliamentHemicycle({ parties }: { parties: ParliamentHemicycleParty[] }) {
  const sortedParties = [...parties]
    .filter((party) => party.seats > 0)
    .sort((a, b) => a.seatOrientation - b.seatOrientation || b.seats - a.seats);
  const totalSeats = sortedParties.reduce((sum, party) => sum + party.seats, 0);

  const positions = layoutHemicycleSeats(totalSeats, {
    radius: RADIUS,
    innerRadius: INNER_RADIUS,
    dotRadius: DOT_RADIUS,
    gap: GAP,
  });

  const dots: { x: number; y: number; party: ParliamentHemicycleParty }[] = [];
  let cursor = 0;
  for (const party of sortedParties) {
    for (let s = 0; s < party.seats; s++) {
      const pos = positions[cursor++];
      if (!pos) break;
      dots.push({ x: pos.x, y: pos.y, party });
    }
  }

  const padding = DOT_RADIUS + 2;
  const width = 2 * RADIUS + 2 * padding;
  const height = RADIUS + 2 * padding;
  const centerX = RADIUS + padding;
  const baselineY = RADIUS + padding;

  if (totalSeats === 0) return null;

  return (
    <DiagramSurface>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto" }} role="img">
          {dots.map((dot, index) => (
            <circle
              key={index}
              cx={centerX + dot.x}
              cy={baselineY - dot.y}
              r={DOT_RADIUS}
              fill={dot.party.color}
              stroke={dot.party.inGovernment ? themeConfig.diagram.governmentOutline : "none"}
              strokeWidth={dot.party.inGovernment ? 1.5 : 0}
            >
              <title>{dot.party.name}</title>
            </circle>
          ))}
        </svg>
      </div>

      <Group gap="lg" justify="center" mt="sm">
        {sortedParties.map((party) => (
          <Group key={party.id} gap={6} wrap="nowrap">
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: party.color,
                flexShrink: 0,
              }}
            />
            <Text size="sm" c="dimmed">
              ({party.abbreviation}) {party.name} ({party.seats})
            </Text>
          </Group>
        ))}
      </Group>
    </DiagramSurface>
  );
}
