// Stands in for `@opencode/ui/context/i18n` in the external bundle. The vendored graph UI reads translations through
// `useI18n`; here that reads the plugin context the host puts in the Solid context at each render root.

import { createContext, useContext } from "solid-js"

export type UiI18nParams = Record<string, string | number | boolean>

export interface UiI18n {
  locale: () => string
  layoutLocale?: () => string
  t: (key: string, params?: UiI18nParams) => string
  plural: (key: string, count: number, params?: UiI18nParams) => string
  pluralForm?: (key: string, category: string, params?: UiI18nParams) => string
  tDynamic: (key: string, source: string, params?: UiI18nParams) => string
  list: (items: readonly string[]) => string
  listSeparator: (index: number, count: number) => string
}

type Translate = (key: string, params?: UiI18nParams) => string
type Plural = (key: string, count: number, params?: UiI18nParams) => string

export function createUiI18n(input: {
  locale: () => string
  t: Translate
  plural: Plural
}): UiI18n {
  return {
    locale: input.locale,
    layoutLocale: input.locale,
    t: input.t,
    plural: input.plural,
    pluralForm: (key, category, params) => input.t(`${key}.${category}`, params),
    tDynamic: (key, source, params) => input.t(key, params) || source,
    list: (items) => items.join(", "),
    listSeparator: (index, count) => (index > 0 && index < count ? "," : ""),
  }
}

const fallback: UiI18n = createUiI18n({
  locale: () => "en",
  t: (key) => key,
  plural: (key) => key,
})

export const I18nContext = createContext<UiI18n>(fallback)

export function useI18n() {
  return useContext(I18nContext)
}
