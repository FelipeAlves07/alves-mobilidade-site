type Props = {
  eyebrow?: string;
  title: string;
};

export default function PageTitle({
  eyebrow,
  title,
}: Props) {
  return (
    <div className="mb-8">

      {eyebrow && (
        <p className="mb-2 text-xs font-black uppercase tracking-[0.35em] text-[#d6a85f]">
          {eyebrow}
        </p>
      )}

      <h1 className="text-5xl font-black text-white">
        {title}
      </h1>

    </div>
  );
}