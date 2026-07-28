import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

export default function ButtonDark(props: Props) {
  return (
    <button
      {...props}
      className={`btn-secondary ${props.className ?? ""}`}
    />
  );
}