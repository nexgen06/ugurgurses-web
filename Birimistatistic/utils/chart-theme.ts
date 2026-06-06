import type { CSSProperties } from 'react';

export type ChartTheme = {
  grid: string;
  axis: string;
  tooltipBg: string;
  tooltipText: string;
  tooltipBorder: string;
  barLabelInside: string;
  barLabelOutside: string;
  pieLabel: string;
  pieLabelStroke: string;
};

export function getChartTheme(isDark: boolean): ChartTheme {
  return isDark
    ? {
        grid: '#334155',
        axis: '#94a3b8',
        tooltipBg: '#1e293b',
        tooltipText: '#f1f5f9',
        tooltipBorder: '#475569',
        barLabelInside: '#f8fafc',
        barLabelOutside: '#e2e8f0',
        pieLabel: '#f1f5f9',
        pieLabelStroke: 'rgba(15,23,42,0.65)'
      }
    : {
        grid: '#f1f5f9',
        axis: '#64748b',
        tooltipBg: '#ffffff',
        tooltipText: '#0f172a',
        tooltipBorder: '#e2e8f0',
        barLabelInside: '#ffffff',
        barLabelOutside: '#1e293b',
        pieLabel: '#1e293b',
        pieLabelStroke: 'rgba(255,255,255,0.9)'
      };
}

export function chartTooltipStyle(theme: ChartTheme): CSSProperties {
  return {
    borderRadius: 16,
    border: `1px solid ${theme.tooltipBorder}`,
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.15)',
    background: theme.tooltipBg,
    color: theme.tooltipText,
    fontSize: 12,
    fontWeight: 600
  };
}
