type Props = {
  status: string;
};

export default function StatusBadge({ status }: Props) {
  return (
    <span className="rounded-full border border-[var(--accent-20)] bg-[var(--accent-10)] px-3 py-1 text-xs font-bold text-[var(--accent)]">
      {status}
    </span>
  );
}