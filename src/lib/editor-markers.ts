import { StateEffect, StateField, type Extension } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  hoverTooltip,
  type DecorationSet,
  type EditorView as EditorViewType,
} from '@codemirror/view';
import type { AnalysisError, AnalysisResult } from '@/types';

export function resultToErrors(result: AnalysisResult): AnalysisError[] {
  const errors = (result.errors || []) as AnalysisError[];
  const warnings = (result.warnings || []) as AnalysisError[];
  const suggestions = (result.suggestions || []) as AnalysisError[];
  const vulns = (result.vulnerabilities || []) as Array<{ line: number; message: string; fix?: string; category: string; severity: string }>;
  const dups = (result.duplications || []) as Array<{ lineStart: number; message: string; fix?: string; category: string; severity: string }>;

  return [
    ...errors.map((e) => ({ ...e, severity: 'error' as const })),
    ...warnings.map((w) => ({ ...w, severity: 'warning' as const })),
    ...suggestions.map((s) => ({ ...s, severity: 'suggestion' as const })),
    ...vulns.map((v) => ({
      line: v.line,
      message: v.message,
      explanation: v.fix || '',
      category: v.category,
      severity: mapVulnSeverity(v.severity),
    })),
    ...dups.map((d) => ({
      line: d.lineStart,
      message: d.message,
      explanation: d.fix || '',
      category: d.category,
      severity: mapDupSeverity(d.severity),
    })),
  ];
}

function mapVulnSeverity(s: string): 'error' | 'warning' | 'suggestion' {
  if (s === 'critical' || s === 'high') return 'error';
  if (s === 'medium') return 'warning';
  return 'suggestion';
}

function mapDupSeverity(s: string): 'error' | 'warning' | 'suggestion' {
  if (s === 'critical' || s === 'high') return 'warning';
  if (s === 'medium') return 'suggestion';
  return 'suggestion';
}

export const setLineMarkers = StateEffect.define<AnalysisError[]>();
export const clearLineMarkers = StateEffect.define<null>();

const SEVERITY_CLASS: Record<string, string> = {
  error: 'korek-marker-error',
  warning: 'korek-marker-warning',
  suggestion: 'korek-marker-suggestion',
};

function normalizeSeverity(s: string | undefined): 'error' | 'warning' | 'suggestion' {
  if (!s) return 'suggestion';
  if (s === 'error') return 'error';
  if (s === 'warning') return 'warning';
  return 'suggestion';
}

function buildDecorations(doc: any, items: AnalysisError[]): DecorationSet {
  const decos: Array<{ from: number; to: number; value: Decoration }> = [];
  for (const item of items) {
    const line = item.line;
    if (!line || line < 1) continue;
    try {
      const { from, to } = doc.line(line);
      const sev = normalizeSeverity(item.severity);
      const cls = SEVERITY_CLASS[sev];
      decos.push({
        from,
        to,
        value: Decoration.line({
          attributes: { class: cls },
        }),
      });
    } catch {
    }
  }
  return Decoration.set(decos);
}

interface MarkerState {
  errors: AnalysisError[];
  decorations: DecorationSet;
}

const markerState = StateField.define<MarkerState>({
  create() {
    return { errors: [], decorations: Decoration.none };
  },
  update(value, tr) {
    let current = value;
    for (const effect of tr.effects) {
      if (effect.is(setLineMarkers)) {
        current = {
          errors: effect.value,
          decorations: buildDecorations(tr.state.doc, effect.value),
        };
      } else if (effect.is(clearLineMarkers)) {
        current = { errors: [], decorations: Decoration.none };
      }
    }
    return current;
  },
  provide: (field) => [
    EditorView.decorations.from(field, (state) => state.decorations),
    hoverTooltip((view, pos) => {
      const state = view.state.field(field);
      const line = view.state.doc.lineAt(pos);
      const error = state.errors.find((e) => e.line === line.number);
      if (!error) return null;

      const sev = normalizeSeverity(error.severity);

      return {
        pos,
        create: () => {
          const dom = document.createElement('div');
          dom.className = 'korek-tooltip';

          const title = document.createElement('div');
          title.className = 'korek-tooltip-title';
          title.textContent = error.message;
          dom.appendChild(title);

          if (error.explanation) {
            const body = document.createElement('div');
            body.className = 'korek-tooltip-body';
            body.textContent = error.explanation;
            dom.appendChild(body);
          }

          if (error.category) {
            const cat = document.createElement('span');
            cat.className = `korek-tooltip-category korek-tooltip-${sev}`;
            cat.textContent = error.category;
            dom.appendChild(cat);
          }

          return { dom };
        },
      };
    }),
  ],
});

export function lineMarkerExtension(): Extension[] {
  return [markerState];
}

export function scrollToLine(view: EditorViewType, line: number): void {
  if (line < 1) return;
  try {
    const { from } = view.state.doc.line(line);
    view.dispatch({
      effects: EditorView.scrollIntoView(from, { y: 'center' }),
    });
    } catch {
    }
}

export type { AnalysisError };
