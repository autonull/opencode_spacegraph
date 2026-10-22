import { onMount, type ComponentProps, splitProps } from "solid-js"
import { iconNames, isIconName, getIcon, type IconName } from "../catalog"
import "./icon.css"

const spriteID = "opencode-v2-icon-sprite"

const symbol = (name: IconName) => `opencode-v2-icon-${name}`

let spriteInserted = false

function spriteContent() {
  return iconNames()
    .map((name) => `<symbol id="${symbol(name)}" viewBox="${getIcon(name).viewBox}">${getIcon(name).body}</symbol>`)
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

  const pixelSize = split.size === "small" ? 14 : split.size === "large" ? 20 : 16
  onMount(ensureSprite)

  return (
    <svg
      {...rest}
      data-slot="icon-svg"
      data-missing={iconName() ? undefined : "true"}
      data-directional={
        iconName() === "arrow-left" ||
        iconName() === "arrow-right" ||
        iconName() === "outline-arrow-left" ||
        iconName() === "outline-arrow-right" ||
        iconName() === "chevron-left" ||
        iconName() === "chevron-right"
          ? ""
          : undefined
      }
      width={pixelSize}
      height={pixelSize}
      viewBox={iconName() ? getIcon(iconName()!).viewBox : "0 0 16 16"}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={rest["aria-hidden"] ?? "true"}
    >
      {iconName() ? (
        <use href={`#${symbol(iconName()!)}`} />
      ) : (
        <path
          d="M2 2 L14 14 M14 2 L2 14"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          data-slot="icon-missing"
        />
      )}
    </svg>
  )
}
