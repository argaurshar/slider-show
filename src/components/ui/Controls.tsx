import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-white/55">{label}</span>
        {hint && <span className="text-xs tabular-nums text-white/40">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

export function SliderControl({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <Field label={label} hint={`${value}${suffix}`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );
}

export function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-ink-800 px-2 py-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-7"
          aria-label={label}
        />
        <span className="font-mono text-xs uppercase text-white/60">{value}</span>
      </div>
    </Field>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  columns,
}: {
  label?: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (v: T) => void;
  columns?: number;
}) {
  const content = (
    <div
      className="grid gap-1 rounded-xl bg-ink-800 p-1"
      style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition',
            value === opt.value
              ? 'bg-brand-500 text-white shadow-glow'
              : 'text-white/60 hover:bg-white/5 hover:text-white',
          )}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
  if (!label) return content;
  return <Field label={label}>{content}</Field>;
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-ink-800 px-3 py-2.5 text-sm text-white/80 transition hover:border-white/20"
    >
      <span>{label}</span>
      <span
        className={cn(
          'relative h-5 w-9 rounded-full transition',
          checked ? 'bg-brand-500' : 'bg-white/15',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white transition',
            checked ? 'left-[18px]' : 'left-0.5',
          )}
        />
      </span>
    </button>
  );
}
