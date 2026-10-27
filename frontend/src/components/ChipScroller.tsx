import { ActionIcon, Chip } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { useTranslation } from "../i18n/I18nProvider";

export interface ChipScrollerOption {
  value: string;
  label: ReactNode;
  /** Checked-state color for this chip (e.g. a party's own color_bg). */
  color?: string;
}

interface ChipScrollerBaseProps {
  options: ChipScrollerOption[];
  ariaLabel?: string;
}

interface SingleChipScrollerProps extends ChipScrollerBaseProps {
  multiple?: false;
  value: string | null;
  onChange: (value: string) => void;
}

interface MultipleChipScrollerProps extends ChipScrollerBaseProps {
  multiple: true;
  value: string[];
  onChange: (value: string[]) => void;
}

type ChipScrollerProps = SingleChipScrollerProps | MultipleChipScrollerProps;

/**
 * A single- or multi-select row of chips that never wraps onto a second line: overflow is
 * clipped and revealed via the "<"/">" buttons (trackpad/wheel scrolling also works,
 * the buttons are just the primary affordance). Shared by every chip-based filter
 * (period selection, pop-group selection, ...) so they all behave identically.
 */
export function ChipScroller(props: ChipScrollerProps) {
  const { options, ariaLabel } = props;
  const t = useTranslation();
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    updateScrollState();
    window.addEventListener("resize", updateScrollState);
    return () => window.removeEventListener("resize", updateScrollState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.length]);

  const scrollByPage = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const showArrows = canScrollLeft || canScrollRight;

  const track = (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <ActionIcon
        variant="subtle"
        size="sm"
        aria-label={t.common.scrollLeft}
        onClick={() => scrollByPage(-1)}
        disabled={!canScrollLeft}
        style={{ flexShrink: 0, visibility: showArrows ? "visible" : "hidden" }}
      >
        <IconChevronLeft size={16} />
      </ActionIcon>

      <div
        ref={trackRef}
        onScroll={updateScrollState}
        role="group"
        aria-label={ariaLabel}
        className="chip-scroller-track"
        style={{ display: "flex", gap: 8, overflowX: "auto", flex: 1, minWidth: 0 }}
      >
        {options.map((option) => (
          <Chip key={option.value} value={option.value} color={option.color} autoContrast style={{ flexShrink: 0 }}>
            {option.label}
          </Chip>
        ))}
      </div>

      <ActionIcon
        variant="subtle"
        size="sm"
        aria-label={t.common.scrollRight}
        onClick={() => scrollByPage(1)}
        disabled={!canScrollRight}
        style={{ flexShrink: 0, visibility: showArrows ? "visible" : "hidden" }}
      >
        <IconChevronRight size={16} />
      </ActionIcon>
    </div>
  );

  // Chip.Group's value/onChange types depend on its `multiple` literal, so each
  // mode gets its own group rather than one with a widened prop type.
  if (props.multiple) {
    return (
      <Chip.Group multiple value={props.value} onChange={props.onChange}>
        {track}
      </Chip.Group>
    );
  }
  return (
    <Chip.Group value={props.value ?? undefined} onChange={(next) => props.onChange(next as string)}>
      {track}
    </Chip.Group>
  );
}
