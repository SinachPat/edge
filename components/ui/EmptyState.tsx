export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#1A3C5E] bg-[#0F2236] px-6 py-14 text-center">
      <span className="mb-4 inline-flex text-3xl text-[#C8973A]/50" aria-hidden>
        {icon}
      </span>
      <p className="text-base font-medium text-white">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-400">{children}</div>}
    </div>
  );
}
