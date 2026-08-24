import { IconCheck } from "@tabler/icons-react";

import { useTranslation } from "../i18n/I18nProvider";

export function InGovernmentIcon({ inGovernment }: { inGovernment: boolean }) {
  const t = useTranslation();
  if (!inGovernment) return null;
  return <IconCheck size={18} color="var(--mantine-color-green-6)" aria-label={t.common.inGovernment} />;
}
