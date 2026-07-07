"use client";

type AdminHeaderProps = {
  title: string;
  subtitle?: string;
};

export default function AdminHeader({
  title,
  subtitle,
}: AdminHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-black text-white">
        {title}
      </h1>

      {subtitle && (
        <p className="mt-2 text-zinc-400">
          {subtitle}
        </p>
      )}
    </div>
  );
}