type Props = {
  status: string;
};

export default function StatusBadge({ status }: Props) {
  return (
    <span className="rounded-full border border-[#d6a85f]/20 bg-[#d6a85f]/10 px-3 py-1 text-xs font-black text-[#f1d28b]">
      {status}
    </span>
  );
}