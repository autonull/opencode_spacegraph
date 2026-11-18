import type { JSX } from "solid-js"
import { splitProps } from "solid-js"

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: string
  size?: string
}

export function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, ["variant", "size", "class"])
  return (
    <button
      {...rest}
      class={`sg-button sg-button-${local.variant ?? "default"} sg-button-${local.size ?? "medium"} ${local.class ?? ""}`}
    />
  )
}

interface TextInputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  appearance?: string
  leadingIcon?: JSX.Element
}

export function TextInput(props: TextInputProps) {
  const [local, rest] = splitProps(props, ["appearance", "leadingIcon", "class"])
  return (
    <span class={`sg-textinput sg-textinput-${local.appearance ?? "base"} ${local.class ?? ""}`}>
      {local.leadingIcon}
      <input {...rest} />
    </span>
  )
}
