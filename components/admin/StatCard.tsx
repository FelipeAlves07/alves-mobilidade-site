"use client";

type Props = {
  title: string;
  value: string | number;
};

export default function StatCard({
  title,
  value,
}: Props) {
  return (
    <div className="rounded-3xl border border-[#d6a85f]/15 bg-[#171717] p-6">

      <p className="text-zinc-400">
        {title}
      </p>

      <h2 className="mt-3 text-4xl font-black text-[#f1d28b]">
        {value}
      </h2>

    </div>
  );
}