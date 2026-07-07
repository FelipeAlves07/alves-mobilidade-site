type Props = {
  text: string;
};

export default function Badge({
  text,
}: Props) {
  return (
    <span className="rounded-full bg-[#d6a85f]/15 px-4 py-2 text-xs font-bold text-[#f1d28b]">
      {text}
    </span>
  );
}