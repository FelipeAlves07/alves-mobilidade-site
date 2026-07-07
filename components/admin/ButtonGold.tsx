import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

export default function ButtonGold(props: Props) {
  return (
    <button
      {...props}
      className={`
      cursor-pointer
      rounded-full
      bg-[#d6a85f]
      px-6
      py-3
      font-bold
      text-black
      transition
      hover:scale-105
      active:scale-95
      ${props.className ?? ""}
      `}
    />
  );
}