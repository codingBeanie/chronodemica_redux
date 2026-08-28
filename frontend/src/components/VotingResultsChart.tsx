import { Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

import { themeConfig } from "../theme.config";
import { SegmentedBar } from "./SegmentedBar";

export interface VotingResultsChartParty {
  id: string;
  abbreviation: string;
  color: string;
  /** Vote share, 0-100. */
  percent: number;
  /** Percentage-point change vs. the previous period, or null when there's nothing to compare against. */
  change: number | null;
}

interface VotingResultsChartProps {
  parties: VotingResultsChartParty[];
}

/**
 * One compact column per party: bar (height = vote share), the vote share itself,
 * a connected gray bar with the party's short name, and its own small box for the
 * change vs. the previous period — per examples/votings_results.png. Every text
 * element sets an explicit color rather than relying on Mantine's default Text
 * color, which (unlike `c="dimmed"` etc.) resolves from the app-root's color
 * scheme instead of this surface's own pinned dark-on-white palette — see
 * DiagramSurface.tsx.
 */
export function VotingResultsChart({ parties }: VotingResultsChartProps) {
  // Narrower columns on small screens so a typical handful of parties fits without
  // needing to scroll at all; larger party counts still scroll within this chart's
  // own container rather than the whole page (see the overflowX wrapper below).
  const isMobile = useMediaQuery("(max-width: 36em)");
  const columnWidth = isMobile ? 84 : 120;
  const barHeight = isMobile ? 140 : 200;
  const maxPercent = Math.max(...parties.map((party) => party.percent), 1);

  return (
    <div style={{ maxWidth: parties.length * columnWidth, margin: "0 auto", overflowX: "auto" }}>
      {/* Bars */}
      <div style={{ display: "flex" }}>
        {parties.map((party) => (
          <div key={party.id} style={{ width: columnWidth, flexShrink: 0, padding: "0 3px" }}>
            <SegmentedBar
              orientation="vertical"
              segments={[{ value: party.percent, color: party.color }]}
              total={maxPercent}
              length={barHeight}
            />
          </div>
        ))}
      </div>

      {/* Percentage — connected strip, blends with the surface's own white */}
      <div style={{ display: "flex" }}>
        {parties.map((party) => (
          <div key={party.id} style={{ width: columnWidth, flexShrink: 0, textAlign: "center", padding: "8px 0" }}>
            <Text fw={800} size="xl" c={themeConfig.diagram.text}>
              {party.percent.toFixed(1)}%
            </Text>
          </div>
        ))}
      </div>

      {/* Party short name — one connected gray bar across all columns */}
      <div style={{ display: "flex" }}>
        {parties.map((party) => (
          <div
            key={party.id}
            style={{
              width: columnWidth,
              flexShrink: 0,
              textAlign: "center",
              padding: "6px 4px",
              background: themeConfig.diagram.nameBarBackground,
            }}
          >
            <Text fw={600} size="sm" c={themeConfig.diagram.text} truncate="end">
              {party.abbreviation}
            </Text>
          </div>
        ))}
      </div>

      {/* Change vs. previous period — its own small box per party */}
      <div style={{ display: "flex" }}>
        {parties.map((party) => (
          <div key={party.id} style={{ width: columnWidth, flexShrink: 0, padding: "4px 3px 0" }}>
            <div
              style={{
                background: themeConfig.diagram.changeBoxBackground,
                borderRadius: 4,
                textAlign: "center",
                padding: "4px 0",
              }}
            >
              <Text
                size="sm"
                fw={600}
                c={
                  party.change === null
                    ? themeConfig.diagram.dimmed
                    : party.change > 0
                      ? "green.7"
                      : party.change < 0
                        ? "red.7"
                        : themeConfig.diagram.dimmed
                }
              >
                {party.change === null ? "—" : `${party.change > 0 ? "+" : ""}${Math.round(party.change)}`}
              </Text>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
