import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

export default function ButtonDark(props: Props) {
  return (
    <button
      {...props}
      className={`
      cursor-pointer
      rounded-xl
      border
      border-[var(--accent-20)]
      bg-[var(--bg-surface)]
      px-6
      py-3
      font-bold
      text-[var(--accent)]
      transition
      hover:bg-[var(--accent)]
      hover:text-white
      ${props.className ?? ""}
      `}
    />
  );
}