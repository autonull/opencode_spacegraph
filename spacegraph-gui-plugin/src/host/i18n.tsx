import { createContext, useContext, type ParentProps } from "solid-js"

export interface UiI18n {
  t(key: string, params?: Record<string, string | number | boolean>): string
  plural(key: string, count: number, params?: Record<string, string | number | boolean>): string
}

const Context = createContext<UiI18n>()

export function I18nProvider(props: ParentProps<{ value: UiI18n }>) {
  return <Context.Provider value={props.value}>{props.children}</Context.Provider>
}

/** Translation for plugin-owned chrome. Seeded once from `ctx` at the surface root. */
export function useI18n(): UiI18n {
  const value = useContext(Context)
  if (value) return value
  throw new Error("Spacegraph i18n provider is missing from the surface root")
}
