import type { CSSProperties, ReactNode } from "react";

import { autoTextColor } from "../utils/colorContrast";

export interface SegmentedBarSegment {
  value: number;
  color: string;
  /** Explicit label text color (e.g. a party's own chosen text color); falls back to auto contrast. */
  textColor?: string;
  label?: ReactNode;
  key?: string | number;
}

interface SegmentedBarThreshold {
  /** Same units as `total`. */
  value: number;
}

interface SegmentedBarProps {
  segments: SegmentedBarSegment[];
  /** Denominator every segment's proportion (and the threshold's position) is measured against. */
  total: number;
  orientation?: "horizontal" | "vertical";
  /** Bar thickness: height for horizontal, width for vertical. Defaults to filling the cross axis. */
  thickness?: number | string;
  /** Full length along the proportional axis: width for horizontal, height for vertical. */
  length?: number | string;
  threshold?: SegmentedBarThreshold;
}

const GAP_COLOR = "var(--mantine-color-body)";
const RADIUS = 4;

/**
 * One colored rectangle (or several, stacked) sized by proportion of `total`, with a
 * printed in-segment value/label and an optional threshold marker line. Shared
 * primitive behind the Voting Results chart (vertical, one segment per bar) and the
 * Coalitions bar (horizontal, one segment per party in the coalition).
 */
export function SegmentedBar({
  segments,
  total,
  orientation = "horizontal",
  thickness,
  length,
  threshold,
}: SegmentedBarProps) {
  const isHorizontal = orientation === "horizontal";
  const visibleSegments = segments.filter((segment) => segment.value > 0);

  const containerStyle: CSSProperties = isHorizontal
    ? {
        display: "flex",
        alignItems: "stretch",
        height: thickness ?? "100%",
        width: length ?? "100%",
        position: "relative",
        boxSizing: "border-box",
      }
    : {
        display: "flex",
        flexDirection: "column-reverse",
        width: thickness ?? "100%",
        height: length ?? "100%",
        position: "relative",
        boxSizing: "border-box",
      };

  return (
    <div style={containerStyle}>
      {visibleSegments.map((segment, index) => {
        const proportion = total > 0 ? segment.value / total : 0;
        const isFirst = index === 0;
        const isLast = index === visibleSegments.length - 1;
        const sizeStyle: CSSProperties = isHorizontal
          ? { width: `${proportion * 100}%`, height: "100%" }
          : { height: `${proportion * 100}%`, width: "100%" };
        const radiusStyle: CSSProperties = isHorizontal
          ? {
              borderTopLeftRadius: isFirst ? RADIUS : 0,
              borderBottomLeftRadius: isFirst ? RADIUS : 0,
              borderTopRightRadius: isLast ? RADIUS : 0,
              borderBottomRightRadius: isLast ? RADIUS : 0,
              borderLeft: isFirst ? undefined : `2px solid ${GAP_COLOR}`,
            }
          : {
              borderBottomLeftRadius: isFirst ? RADIUS : 0,
              borderBottomRightRadius: isFirst ? RADIUS : 0,
              borderTopLeftRadius: isLast ? RADIUS : 0,
              borderTopRightRadius: isLast ? RADIUS : 0,
              borderTop: isFirst ? undefined : `2px solid ${GAP_COLOR}`,
            };
        return (
          <div
            key={segment.key ?? index}
            style={{
              ...sizeStyle,
              ...radiusStyle,
              background: segment.color,
              color: segment.textColor ?? autoTextColor(segment.color),
              display: "flex",
              alignItems: "center",
              justifyContent: isHorizontal ? "flex-start" : "center",
              paddingInline: isHorizontal ? 10 : 2,
              fontWeight: 700,
              fontSize: 14,
              whiteSpace: "nowrap",
              overflow: "hidden",
              boxSizing: "border-box",
            }}
          >
            {segment.label}
          </div>
        );
      })}

      {threshold && total > 0 && (
        <div
          style={
            isHorizontal
              ? {
                  position: "absolute",
                  left: `${(threshold.value / total) * 100}%`,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: "var(--mantine-color-text)",
                  // A light halo keeps the line visible when it falls on top of a
                  // saturated segment fill, not just in the empty space past a bar's end.
                  boxShadow: "0 0 0 1.5px var(--mantine-color-body)",
                }
              : {
                  position: "absolute",
                  bottom: `${(threshold.value / total) * 100}%`,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: "var(--mantine-color-text)",
                  boxShadow: "0 0 0 1.5px var(--mantine-color-body)",
                }
          }
        />
      )}
    </div>
  );
}
