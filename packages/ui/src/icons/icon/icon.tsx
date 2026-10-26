import { createSignal, onMount, type ComponentProps, splitProps } from "solid-js"
import { iconNames, isIconName, getIcon, type IconName } from "../catalog"
import { getNewIcon, newIconViewBox } from "../new-icons"
import "./icon.css"

const spriteID = "opencode-v2-icon-sprite"

const symbol = (name: IconName) => `opencode-v2-icon-${name}`

const newSymbol = (name: IconName) => `opencode-v2-icon-new-${name}`

let spriteInserted = false

// The "New icons" experiment, set by the app from its settings.
const [newIconsEnabled, setNewIconsEnabled] = createSignal(false)

export function setNewIcons(enabled: boolean) {
  setNewIconsEnabled(enabled)
}

/** Whether the "New icons" experiment is on, for call sites that pick a different icon under it. */
export const newIcons = newIconsEnabled

function spriteContent() {
  return iconNames()
    .map((name) => {
      const current = `<symbol id="${symbol(name)}" viewBox="${getIcon(name).viewBox}">${getIcon(name).body}</symbol>`
      const next = getNewIcon(name)

      return next ? `${current}<symbol id="${newSymbol(name)}" viewBox="${newIconViewBox}">${next}</symbol>` : current
    })
    .join("")
}

function ensureSprite() {
  if (spriteInserted) return

  if (typeof document === "undefined") return
  // Hot reload preserves the DOM sprite, but its symbols may be from an older module.
  const existing = document.getElementById(spriteID)

  if (existing) {
    existing.innerHTML = spriteContent()
    spriteInserted = true

    return
  }

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.id = spriteID
  svg.setAttribute("aria-hidden", "true")
  svg.setAttribute("width", "0")
  svg.setAttribute("height", "0")
  svg.style.position = "absolute"
  svg.style.overflow = "hidden"
  svg.innerHTML = spriteContent()
  document.body.insertBefore(svg, document.body.firstChild)
  spriteInserted = true
}

export interface IconProps extends ComponentProps<"svg"> {
  name: IconName | (string & {})
  size?: "small" | "normal" | "large"
}

/**
 * T14.4 — a missing icon is a development-time error, never a plausible glyph. Five buttons once
 * named icons that were not in the catalogue and all of them rendered as the same plus sign, so
 * nobody noticed. An unknown name warns once and draws a broken glyph in development; in
 * production it draws nothing, because a wrong icon is worse than no icon.
 */
const warned = new Set<string>()

function warnMissing(name: string) {
  if (warned.has(name)) return
  warned.add(name)
  console.warn(`[icon] unknown icon "${name}": it is not in the catalogue, so it cannot be drawn`)
}

export function Icon(props: IconProps) {
  const [split, rest] = splitProps(props, ["name", "size"])

  const iconName = (): IconName | undefined => {
    if (isIconName(split.name)) return split.name
    warnMissing(split.name)
    return undefined
  }

  const name = iconName()
  const icon = name ? getIcon(name) : getIcon("plus")
  const next = () => name ? newIconsEnabled() && getNewIcon(name) !== undefined : false
  const pixelSize = () => (split.size === "large" ? 20 : split.size === "small" && !next() ? 14 : 16)
  onMount(ensureSprite)

  return (
    <svg
      {...rest}
      data-slot="icon-svg"
      data-missing={name ? undefined : "true"}
      data-directional={
        name === "arrow-left" ||
        name === "arrow-right" ||
        name === "outline-arrow-left" ||
        name === "outline-arrow-right" ||
        name === "outline-chevron-right" ||
        name === "chevron-left" ||
        name === "chevron-right"
          ? ""
          : undefined
      }
      width={pixelSize()}
      height={pixelSize()}
      viewBox={next() && name ? newIconViewBox : icon.viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={rest["aria-hidden"] ?? "true"}
    >
      <use href={`#${next() && name ? newSymbol(name) : symbol(name ? name : "plus")}`} />
    </svg>
  )
}
