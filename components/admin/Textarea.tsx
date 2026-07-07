import type { TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>;

export default function Textarea(props: Props) {
  return (
    <textarea
      {...props}
      className={`
      input-admin
      min-h-28
      ${props.className ?? ""}
      `}
    />
  );
}