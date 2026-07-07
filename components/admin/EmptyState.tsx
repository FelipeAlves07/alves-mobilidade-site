type Props = {
  title: string;
  description: string;
};

export default function EmptyState({
  title,
  description,
}: Props) {
  return (
    <div className="rounded-3xl border border-dashed border-[#d6a85f]/20 p-10 text-center">

      <h3 className="text-xl font-black text-white">
        {title}
      </h3>

      <p className="mt-3 text-zinc-400">
        {description}
      </p>

    </div>
  );
}