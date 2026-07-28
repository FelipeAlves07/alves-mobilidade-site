import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

export default function ButtonPrimary(props: Props) {
  return (
    <button
      {...props}
      className={`btn-primary ${props.className ?? ""}`}
    />
  );
}
