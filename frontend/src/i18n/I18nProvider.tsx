import { createContext, useContext, type ReactNode } from "react";

import { en, type Dictionary } from "./en";

export const dictionaries = { en } as const;
export type Locale = keyof typeof dictionaries;

const I18nContext = createContext<Dictionary>(en);

export function I18nProvider({
  locale = "en",
  children,
}: {
  locale?: Locale;
  children: ReactNode;
}) {
  return <I18nContext.Provider value={dictionaries[locale]}>{children}</I18nContext.Provider>;
}

export function useTranslation(): Dictionary {
  return useContext(I18nContext);
}
