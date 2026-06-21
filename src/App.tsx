import { Sparkles } from 'lucide-react';
import { ControlsPanel } from './components/ControlsPanel';
import { PreviewCanvas } from './components/PreviewCanvas';
import { ExportBar } from './components/ExportBar';

export default function App() {
  return (
    <div className="mx-auto flex min-h-full max-w-[1400px] flex-col gap-6 px-4 py-6 lg:px-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 shadow-glow">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Slider Show</h1>
            <p className="text-xs text-white/45">Before / after video generator</p>
          </div>
        </div>
        <a
          href="https://github.com/argaurshar/slider-show"
          target="_blank"
          rel="noreferrer"
          className="hidden text-xs text-white/40 transition hover:text-white/70 sm:block"
        >
          Runs 100% in your browser
        </a>
      </header>

      <main className="grid flex-1 gap-6 lg:grid-cols-[minmax(320px,380px)_1fr]">
        <aside className="order-2 flex flex-col rounded-2xl border border-white/10 bg-ink-800/40 p-5 lg:order-1">
          <div className="flex-1 overflow-y-auto pr-1">
            <ControlsPanel />
          </div>
          <div className="mt-5 border-t border-white/10 pt-4">
            <ExportBar />
          </div>
        </aside>

        <section className="order-1 flex items-center justify-center rounded-2xl border border-white/10 bg-ink-900/40 p-5 lg:order-2">
          <PreviewCanvas />
        </section>
      </main>

      <footer className="text-center text-[11px] text-white/30">
        Slider Show — your images never leave your device.
      </footer>
    </div>
  );
}
