import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement>;

export default function Input(props: Props) {
  return (
    <input
      {...props}
      className={`
      input-admin
      ${props.className ?? ""}
      `}
    />
  );
}