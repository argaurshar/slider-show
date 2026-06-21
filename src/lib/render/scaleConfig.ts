import type { SliderConfig } from '../../types/project';

/**
 * Produce a proportionally scaled copy of the config for lightweight preview
 * rendering. All pixel-denominated values (size, line width, handle radius)
 * scale together so the preview matches the full-resolution export exactly.
 */
export function scaleConfig(config: SliderConfig, maxEdge = 820): SliderConfig {
  const longest = Math.max(config.width, config.height);
  const factor = Math.min(1, maxEdge / longest);
  if (factor === 1) return config;
  return {
    ...config,
    width: Math.round(config.width * factor),
    height: Math.round(config.height * factor),
    line: { ...config.line, width: config.line.width * factor },
    handle: { ...config.handle, radius: config.handle.radius * factor },
  };
}
