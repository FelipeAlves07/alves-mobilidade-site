import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

export default function ButtonDark(props: Props) {
  return (
    <button
      {...props}
      className={`
      cursor-pointer
      rounded-full
      border
      border-[#d6a85f]/20
      bg-[#202020]
      px-6
      py-3
      font-bold
      text-[#f1d28b]
      transition
      hover:bg-[#d6a85f]
      hover:text-black
      ${props.className ?? ""}
      `}
    />
  );
}