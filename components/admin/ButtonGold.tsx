import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

export default function ButtonPrimary(props: Props) {
  return (
    <button
      {...props}
      className={`
      cursor-pointer
      rounded-xl
      bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)]
      px-6
      py-3
      font-bold
      text-white
      transition
      hover:-translate-y-0.5
      hover:shadow-lg
      active:translate-y-0
      ${props.className ?? ""}
      `}
    />
  );
}
