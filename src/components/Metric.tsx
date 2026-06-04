import type { ReactNode } from "react";

export function Metric({
  label,
  value,
  icon,
  compact = false
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`metric ${compact ? "is-compact" : ""}`}>
      <span>{label}</span>
      <strong>
        {icon}
        {value}
      </strong>
    </div>
  );
}
