export function ProgressBar({
  value,
  label,
}: {
  value: number;
  label?: string;
}) {
  const percent = Math.min(100, Math.max(0, value));

  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-border"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
