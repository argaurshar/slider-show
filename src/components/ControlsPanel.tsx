import {
  ArrowLeftRight,
  ArrowRight,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Blend,
  Circle,
  Columns3,
  MoveHorizontal,
  Slash,
  SquareSplitHorizontal,
} from 'lucide-react';
import { useProjectStore } from '../state/useProjectStore';
import { ASPECT_PRESETS } from '../lib/presets';
import { EASING_LABELS } from '../lib/render/easing';
import { ColorControl, Field, Segmented, SliderControl, Toggle } from './ui/Controls';
import { ImageUploader } from './ImageUploader';
import { cn } from '../lib/cn';
import type { Direction, EasingId, LoopMode, TransitionId } from '../types/project';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-white/8 pt-5 first:border-0 first:pt-0">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function ControlsPanel() {
  const {
    imageA,
    imageB,
    config,
    setImage,
    clearImage,
    swapImages,
    updateConfig,
    setAspectRatio,
  } = useProjectStore();

  const isHorizontal = config.direction === 'ltr' || config.direction === 'rtl';
  // Transitions that move along an axis expose a direction control.
  const hasDirection =
    config.transition === 'reveal' ||
    config.transition === 'push' ||
    config.transition === 'diagonal' ||
    config.transition === 'blinds';
  // Transitions that draw an editable edge/line.
  const hasEdge =
    config.transition === 'reveal' ||
    config.transition === 'circle' ||
    config.transition === 'diagonal';

  return (
    <div className="space-y-6">
      <Section title="Images">
        <div className="grid grid-cols-2 gap-3">
          <ImageUploader
            slot="A"
            badge="Before"
            image={imageA}
            onLoaded={(img) => setImage('A', img)}
            onClear={() => clearImage('A')}
          />
          <ImageUploader
            slot="B"
            badge="After"
            image={imageB}
            onLoaded={(img) => setImage('B', img)}
            onClear={() => clearImage('B')}
          />
        </div>
        <button
          type="button"
          onClick={swapImages}
          disabled={!imageA && !imageB}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-ink-800 py-2 text-xs font-medium text-white/70 transition hover:border-white/25 hover:text-white disabled:opacity-40"
        >
          <ArrowLeftRight size={14} /> Swap before / after
        </button>
      </Section>

      <Section title="Format">
        <div className="grid grid-cols-3 gap-2">
          {ASPECT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setAspectRatio(preset.id)}
              title={preset.platform}
              className={cn(
                'rounded-lg border px-1 py-2 text-center transition',
                config.aspectRatio === preset.id
                  ? 'border-brand-400 bg-brand-500/15 text-white'
                  : 'border-white/10 bg-ink-800 text-white/60 hover:border-white/25',
              )}
            >
              <div className="text-xs font-semibold">{preset.label}</div>
              <div className="mt-0.5 text-[10px] leading-tight text-white/40">
                {preset.platform.split(' ')[0]}
              </div>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Transition">
        <Segmented<TransitionId>
          value={config.transition}
          columns={3}
          onChange={(transition) => updateConfig({ transition })}
          options={[
            { value: 'reveal', label: 'Reveal', icon: <SquareSplitHorizontal size={14} /> },
            { value: 'push', label: 'Slide', icon: <MoveHorizontal size={14} /> },
            { value: 'fade', label: 'Fade', icon: <Blend size={14} /> },
            { value: 'circle', label: 'Circle', icon: <Circle size={14} /> },
            { value: 'diagonal', label: 'Diagonal', icon: <Slash size={14} /> },
            { value: 'blinds', label: 'Blinds', icon: <Columns3 size={14} /> },
          ]}
        />
        {hasDirection && (
          <Field label="Direction">
            <Segmented<Direction>
              value={config.direction}
              columns={4}
              onChange={(direction) => updateConfig({ direction })}
              options={[
                { value: 'ltr', label: '', icon: <ArrowRight size={15} /> },
                { value: 'rtl', label: '', icon: <ArrowLeft size={15} /> },
                { value: 'ttb', label: '', icon: <ArrowDown size={15} /> },
                { value: 'btt', label: '', icon: <ArrowUp size={15} /> },
              ]}
            />
          </Field>
        )}
      </Section>

      <Section title="Timing">
        <SliderControl
          label="Duration"
          value={Number((config.durationMs / 1000).toFixed(1))}
          min={1}
          max={20}
          step={0.5}
          suffix="s"
          onChange={(v) => updateConfig({ durationMs: Math.round(v * 1000) })}
        />
        <div className="grid grid-cols-2 gap-3">
          <SliderControl
            label="Hold start"
            value={Number((config.holdStartMs / 1000).toFixed(1))}
            min={0}
            max={3}
            step={0.1}
            suffix="s"
            onChange={(v) => updateConfig({ holdStartMs: Math.round(v * 1000) })}
          />
          <SliderControl
            label="Hold end"
            value={Number((config.holdEndMs / 1000).toFixed(1))}
            min={0}
            max={3}
            step={0.1}
            suffix="s"
            onChange={(v) => updateConfig({ holdEndMs: Math.round(v * 1000) })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Easing">
            <select
              value={config.easing}
              onChange={(e) => updateConfig({ easing: e.target.value as EasingId })}
              className="w-full rounded-lg border border-white/10 bg-ink-800 px-2.5 py-2 text-sm text-white/80"
            >
              {Object.entries(EASING_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Frame rate">
            <select
              value={config.fps}
              onChange={(e) => updateConfig({ fps: Number(e.target.value) })}
              className="w-full rounded-lg border border-white/10 bg-ink-800 px-2.5 py-2 text-sm text-white/80"
            >
              {[24, 30, 60].map((fps) => (
                <option key={fps} value={fps}>
                  {fps} fps
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Segmented<LoopMode>
          label="Loop"
          value={config.loop}
          columns={3}
          onChange={(loop) => updateConfig({ loop })}
          options={[
            { value: 'none', label: 'None' },
            { value: 'loop', label: 'Loop' },
            { value: 'pingpong', label: 'Ping-pong' },
          ]}
        />
        <Toggle
          label="Ken-Burns zoom"
          checked={config.kenBurns}
          onChange={(kenBurns) => updateConfig({ kenBurns })}
        />
      </Section>

      {hasEdge && (
        <Section title="Slider style">
          <div className="grid grid-cols-2 gap-3">
            <ColorControl
              label="Line color"
              value={config.line.color}
              onChange={(color) => updateConfig({ line: { ...config.line, color } })}
            />
            <SliderControl
              label="Line width"
              value={config.line.width}
              min={0}
              max={24}
              suffix="px"
              onChange={(width) => updateConfig({ line: { ...config.line, width } })}
            />
          </div>
          {config.transition === 'reveal' && (
            <Toggle
              label="Show handle"
              checked={config.handle.enabled}
              onChange={(enabled) => updateConfig({ handle: { ...config.handle, enabled } })}
            />
          )}
          {config.transition === 'reveal' && config.handle.enabled && (
            <div className="space-y-3 rounded-xl bg-ink-800/60 p-3">
              <Segmented<'arrows' | 'dot' | 'none'>
                value={config.handle.icon}
                columns={3}
                onChange={(icon) => updateConfig({ handle: { ...config.handle, icon } })}
                options={[
                  { value: 'arrows', label: 'Arrows' },
                  { value: 'dot', label: 'Dot' },
                  { value: 'none', label: 'Plain' },
                ]}
              />
              <SliderControl
                label="Handle size"
                value={config.handle.radius}
                min={10}
                max={60}
                suffix="px"
                onChange={(radius) => updateConfig({ handle: { ...config.handle, radius } })}
              />
              <div className="grid grid-cols-2 gap-3">
                <ColorControl
                  label="Handle"
                  value={config.handle.color}
                  onChange={(color) => updateConfig({ handle: { ...config.handle, color } })}
                />
                <ColorControl
                  label="Icon"
                  value={config.handle.iconColor}
                  onChange={(iconColor) => updateConfig({ handle: { ...config.handle, iconColor } })}
                />
              </div>
            </div>
          )}
        </Section>
      )}

      <Section title="Background">
        <ColorControl
          label={isHorizontal ? 'Backdrop fill' : 'Backdrop fill'}
          value={config.background}
          onChange={(background) => updateConfig({ background })}
        />
      </Section>
    </div>
  );
}
