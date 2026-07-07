"use client";

type MenuItem = {
  id: string;
  label: string;
};

type Props = {
  active: string;
  menu: MenuItem[];
  setActive: (id: string) => void;
};

export default function MobileNav({ active, menu, setActive }: Props) {
  return (
    <div className="mb-5 flex flex-wrap gap-2 xl:hidden">
      {menu.slice(0, 8).map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => setActive(item.id)}
          className={`cursor-pointer rounded-full px-4 py-2 text-xs font-black ${
            active === item.id
              ? "bg-[#d6a85f] text-black"
              : "bg-[#202020] text-[#f1d28b]"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}