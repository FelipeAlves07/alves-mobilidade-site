type Props = {
  eyebrow?: string;
  title: string;
};

export default function PageTitle({
  eyebrow,
  title,
}: Props) {
  return (
    <div className="mb-6">

      {eyebrow && (
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--accent)]">
          {eyebrow}
        </p>
      )}

      <h1 className="text-3xl font-black tracking-tight md:text-4xl">
        {title}
      </h1>

    </div>
  );
}