type Props = {
  text: string;
};

export default function Badge({
  text,
}: Props) {
  return (
    <span className="rounded-full bg-[var(--accent-15)] px-4 py-2 text-xs font-bold text-[var(--accent)]">
      {text}
    </span>
  );
}