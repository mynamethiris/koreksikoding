import { useNavigate } from 'react-router-dom';
import { Terminal, Share2, Wand2, ArrowRightLeft, Copy, Check, Clock, Keyboard, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function TerminalPreview() {
  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border bg-muted">
        <div className="w-2 h-2 rounded-full bg-destructive/60" />
        <div className="w-2 h-2 rounded-full bg-warning/60" />
        <div className="w-2 h-2 rounded-full bg-success/60" />
        <span className="ml-1.5 text-[8px] text-muted-foreground font-mono">terminal</span>
      </div>
      <div className="p-2.5 space-y-1 text-[9px] font-mono">
        <div className="text-muted-foreground">$ npm run build</div>
        <div className="text-destructive">Error: Cannot find module 'foo'</div>
        <div className="flex items-center gap-1 text-success">
          <span>$ npm install foo</span>
        </div>
      </div>
    </div>
  );
}

function SharePreview() {
  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <div className="p-2.5 space-y-2">
        <div className="flex items-center gap-1.5">
          <div className="flex-1 px-2 py-1 text-[8px] font-mono bg-muted border border-border rounded truncate text-muted-foreground">
            https://koreksikoding.app/editor#snippet=aF3x...
          </div>
          <div className="p-1 rounded bg-accent/10">
            <Copy size={8} className="text-accent" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-[8px] text-muted-foreground">
            <Clock size={8} />
            <span>1:45:30</span>
          </div>
          <div className="flex items-center gap-1 text-[8px] text-muted-foreground">
            <Check size={8} className="text-success" />
            <span>Disalin</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PromptPreview() {
  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <div className="p-2.5 space-y-1.5">
        <div className="flex gap-1">
          <span className="px-1.5 py-0.5 text-[7px] font-medium rounded bg-accent/10 text-accent">Maker</span>
          <span className="px-1.5 py-0.5 text-[7px] font-medium rounded bg-muted text-muted-foreground">Fixer</span>
        </div>
        <div className="px-2 py-1.5 text-[8px] bg-muted border border-border rounded text-muted-foreground">
          Buat prompt untuk...
        </div>
        <div className="space-y-0.5">
          <div className="h-1 bg-accent/10 rounded w-full" />
          <div className="h-1 bg-accent/10 rounded w-4/5" />
          <div className="h-1 bg-accent/10 rounded w-3/5" />
        </div>
      </div>
    </div>
  );
}

function ConvertPreview() {
  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <div className="flex">
        <div className="flex-1 p-2 space-y-1 border-r border-border">
          <div className="text-[7px] text-muted-foreground font-mono mb-1">JS</div>
          <div className="h-1 bg-muted rounded w-3/4" />
          <div className="h-1 bg-muted rounded w-1/2" />
          <div className="h-1 bg-muted rounded w-2/3" />
        </div>
        <div className="flex-1 p-2 space-y-1">
          <div className="text-[7px] text-accent font-mono mb-1">Python</div>
          <div className="h-1 bg-accent/10 rounded w-3/4" />
          <div className="h-1 bg-accent/10 rounded w-2/3" />
          <div className="h-1 bg-accent/10 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

function TypingTestPreview() {
  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <div className="p-2 space-y-1.5">
        <div className="flex items-center gap-2 text-[7px] font-mono">
          <span className="text-success">0:42</span>
          <span className="text-warning">85 WPM</span>
          <span className="text-accent">97%</span>
        </div>
        <div className="font-mono text-[7px] leading-relaxed">
          <span className="text-success">cons</span>
          <span className="text-destructive bg-destructive/10">t</span>
          <span className="text-muted-foreground"> fib = (n) =&gt; </span>
          <span className="animate-pulse bg-accent/30">|</span>
        </div>
      </div>
    </div>
  );
}

function GuidePreview() {
  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <div className="p-2.5 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <BookOpen size={10} className="text-accent" />
          <span className="text-[7px] font-mono text-muted-foreground">guides</span>
        </div>
        <div className="space-y-1">
          <div className="h-1 bg-accent/20 rounded w-full" />
          <div className="h-1 bg-accent/20 rounded w-4/5" />
          <div className="h-1 bg-muted rounded w-3/5" />
        </div>
      </div>
    </div>
  );
}

const TOOLS = [
  {
    id: 'terminal',
    path: '/terminal',
    icon: Terminal,
    titleKey: 'tools.terminalTitle',
    descKey: 'tools.terminalDesc',
    color: 'text-warning',
    bg: 'bg-warning/10',
    preview: <TerminalPreview />,
  },
  {
    id: 'share',
    path: '/share-code',
    icon: Share2,
    titleKey: 'tools.shareTitle',
    descKey: 'tools.shareDesc',
    color: 'text-info',
    bg: 'bg-info/10',
    preview: <SharePreview />,
  },
  {
    id: 'prompt',
    path: '/prompt-builder',
    icon: Wand2,
    titleKey: 'tools.promptTitle',
    descKey: 'tools.promptDesc',
    color: 'text-accent',
    bg: 'bg-accent/10',
    preview: <PromptPreview />,
  },
  {
    id: 'convert',
    path: '/converter',
    icon: ArrowRightLeft,
    titleKey: 'tools.convertTitle',
    descKey: 'tools.convertDesc',
    color: 'text-accent',
    bg: 'bg-accent/10',
    preview: <ConvertPreview />,
  },
  {
    id: 'typingtest',
    path: '/typing-test',
    icon: Keyboard,
    titleKey: 'tools.typingTestTitle',
    descKey: 'tools.typingTestDesc',
    color: 'text-accent',
    bg: 'bg-accent/10',
    preview: <TypingTestPreview />,
  },
  {
    id: 'guides',
    path: '/guides',
    icon: BookOpen,
    titleKey: 'tools.guidesTitle',
    descKey: 'tools.guidesDesc',
    color: 'text-accent',
    bg: 'bg-accent/10',
    preview: <GuidePreview />,
  },
];

export function ToolsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-full pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{t('tools.title')}</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">{t('tools.subtitle')}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.id}
                onClick={() => navigate(tool.path)}
                className="group rounded-xl border border-border bg-card overflow-hidden hover:border-accent/30 hover:bg-accent/5 transition-[border-color,background-color] duration-300 cursor-pointer"
              >
                <div className="p-5 space-y-3">
                  <div className={`inline-flex p-2.5 rounded-lg ${tool.bg}`}>
                    <Icon size={18} className={tool.color} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{t(tool.titleKey)}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t(tool.descKey)}</p>
                  </div>
                </div>
                <div className="px-5 pb-4">
                  {tool.preview}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
