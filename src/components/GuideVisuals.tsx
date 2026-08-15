import { Code } from 'lucide-react';
import type { JSX } from 'react';

type V = () => JSX.Element;

export function ImageVisual({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <figure className="my-3">
      <img
        src={src}
        alt={alt}
        className="w-full max-h-[200px] object-contain rounded-lg border border-border bg-card"
        loading="lazy"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
      {caption && (
        <figcaption className="text-[7px] text-muted-foreground text-center mt-1">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function Box({ title, children }: { title?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background p-2.5 space-y-1.5 text-[10px]">
      {title && <div className="text-[8px] font-mono text-muted-foreground">{title}</div>}
      <div className="text-[9px] text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}

function TerminalView({ title, lines }: { title?: string; lines: string[] }) {
  return (
    <div className="rounded-lg border border-border bg-muted overflow-hidden text-[9px] font-mono">
      {title && (
        <div className="px-2 py-0.5 text-[7px] text-muted-foreground bg-background border-b border-border">
          {title}
        </div>
      )}
      <div className="px-2 py-1.5 space-y-0.5">
        {lines.map((l, i) => (
          <div key={i} className="text-muted-foreground whitespace-pre-wrap break-all">
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

function Svg({ children, w = 80, h = 48 }: { children: React.ReactNode; w?: number; h?: number }) {
  return (
    <div className="w-full flex justify-center">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-h-28 text-foreground/60" fill="none">
        <defs>
          <marker id="arrow" markerWidth={6} markerHeight={6} refX={5} refY={3} orient="auto" markerUnits="strokeWidth">
            <polygon points="0 0, 6 3, 0 6" fill={S.muted} />
          </marker>
        </defs>
        {children}
      </svg>
    </div>
  );
}

const S = {
  c: '#22c55e', acc: '#3b82f6', warn: '#eab308', desc: '#ef4444', muted: '#9ca3af',
};

const visuals: Record<string, V> = {
  // ── Logic ──
  'logic-pseudo': () => <Box>{'if score >= 60:\n  print("Lulus")\nelse:\n  print("Coba lagi")'}</Box>,

  // ── Debugging ──
  'debugging-print': () => (
    <TerminalView title="console" lines={['> print(user)', '5', '> print(name)', 'NaN']} />
  ),
  'debugging-isolate': () => <Box title="isolate">{'// if balance < 0:  (commented)\nif balance < 0:\n    return "invalid"'}</Box>,
  'debugging-edge': () => (
    <Svg w={90} h={44}>
      <line x1={14} y1={22} x2={76} y2={22} stroke={S.muted} strokeWidth={1} />
      <circle cx={18} cy={22} r={3} stroke={S.desc} fill={S.desc} />
      <text x={18} y={14} fontSize={3.6} fill={S.desc}>0</text>
      <text x={12} y={34} fontSize={3.6} fill={S.muted}>empty</text>
      <text x={28} y={34} fontSize={3.6} fill={S.muted}>neg</text>
      <text x={68} y={34} fontSize={3.6} fill={S.muted}>huge</text>
    </Svg>
  ),

  // ── IDE ──
  'ide-nav': () => (
    <TerminalView title="VS Code" lines={['[Explorer]  [Search]  [Source Control]  [Extensions]', '', '$ pwd', '/home/user/project', '$ ls', 'package.json  src/  README.md', '$ cd src']} />
  ),

  // ── Git ──
  'git-intro': () => (
    <Svg w={90} h={44}>
      <rect x={10} y={12} width={22} height={14} rx={2} stroke={S.c} strokeWidth={1.4} />
      <rect x={58} y={12} width={22} height={14} rx={2} stroke={S.acc} strokeWidth={1.4} />
      <text x={12} y={10} fontSize={3.4} fill={S.muted}>local</text>
      <text x={60} y={10} fontSize={3.4} fill={S.muted}>remote</text>
      <path d="M32 20 L58 20" stroke={S.c} strokeWidth={1.4} />
      <polygon points="58,20 53,22 53,18" fill={S.c} />
    </Svg>
  ),
  'git-commit': () => (
    <Svg w={90} h={40}>
      <circle cx={45} cy={20} r={5} stroke={S.c} strokeWidth={1.6} />
      <text x={52} y={23} fontSize={3.4} fill={S.muted}>A1b2c3d</text>
      <path d="M45 15 L45 8" stroke={S.muted} strokeWidth={1} />
      <polygon points="45,7 47,9 43,9" fill={S.muted} />
      <text x={10} y={34} fontSize={3} fill={S.muted}>git commit -m "tambah fitur X"</text>
    </Svg>
  ),
  'git-remote': () => (
    <Box title="remote">
      {'git push origin main  -> mengunggah\n git pull origin main   <- mengunduh\n Pull Request -> gabung via UI'}
    </Box>
  ),

  // ── Prompt ──
  'prompt-def': () => (
    <Box>
      {'system: Anda adalah guru koding yang jelas.\nuser: Jelaskan while-loop dengan contoh.\nassistant: <jawaban>'}
    </Box>
  ),
  'prompt-role': () => (
    <Box>
      {'Anda adalah reviewer senior yang fokus pada keamanan.\nPeriksa kode berikut untuk SQL injection:'}
    </Box>
  ),
  'prompt-clear': () => (
    <Box>
      {'Outputkan JSON:\n{"errors":[...],"score":0}\nHanya JSON, tidak ada tambahan teks.'}
    </Box>
  ),
  'prompt-fewcothink': () => (
    <Box>
      {'Input: "halo"\nOutput: "Halo! Ada yang bisa saya bantu?"\n\nSekarang: tempelkan balasan serupa.'}
    </Box>
  ),
  'prompt-iterate': () => (
    <Svg w={90} h={34}>
      <rect x={12} y={6} width={46} height={6} rx={1} stroke={S.muted} strokeWidth={1} />
      <path d="M58 9 L78 9" stroke={S.warn} strokeWidth={1.2} />
      <polygon points="78,9 72,11 72,7" fill={S.warn} />
      <rect x={52} y={22} width={28} height={6} rx={1} stroke={S.c} strokeWidth={1} />
      <text x={12} y={30} fontSize={3} fill={S.muted}>review - refine - repeat</text>
    </Svg>
  ),

  // ── Linux ──
  'linux-nav': () => (
    <TerminalView title="terminal" lines={['$ pwd', '/home/user/project', '$ ls', 'README.md  src/  package.json', '$ cd src', '']} />
  ),
  'linux-files': () => (
    <TerminalView lines={['$ touch new.txt        # buat file baru', '$ cp a.txt b.txt      # salin file', '$ mv a.txt c.txt      # pindah / rename', '$ rm old.txt          # hapus file', '$ mkdir notes         # buat folder']} />
  ),
  'linux-read': () => (
    <TerminalView lines={['$ cat README.md', 'Isi README...', '$ less long.log', '(scrolling output...)', '$ head -5 file.txt', 'baris 1', 'baris 2', 'baris 3', 'baris 4', 'baris 5', '$ tail -n +10 file.txt', '(dari baris 10 ke bawah...)']} />
  ),
  'linux-pipe': () => (
    <TerminalView lines={['$ ls -l | grep ".txt" | wc -l', '|              |', 'cari           |', '           hitung', '(jumlah file .txt)']} />
  ),
  'linux-perm': () => (
    <TerminalView lines={['$ chmod 755 script.sh', '# rwx r-x r-x', '# 7   5   5', 'owner group others']} />
  ),

  // ── Build & Dependency ──
  'build-def': () => (
    <Svg w={90} h={34}>
      <rect x={10} y={8} width={22} height={6} rx={1} stroke={S.muted} strokeWidth={1} />
      <text x={36} y={12} fontSize={3} fill={S.muted}>source</text>
      <path d="M32 11 L48 11" stroke={S.c} strokeWidth={1.4} />
      <polygon points="48,11 44,13 44,9" fill={S.c} />
      <rect x={52} y={8} width={22} height={6} rx={1} stroke={S.c} strokeWidth={1.4} />
      <text x={56} y={28} fontSize={3} fill={S.muted}>build artifact</text>
    </Svg>
  ),
  'build-pkg': () => (
    <TerminalView title="terminal" lines={['$ npm install lodash     # JS', '$ pip install requests    # Python', '$ cargo add serde          # Rust']} />
  ),
  'build-manifest': () => (
    <Box title="package.json">
      {'{\n  "name": "my-app",\n  "dependencies": {\n    "react": "^19.0.0"\n  }\n}'}</Box>
  ),
  'build-deps': () => (
    <Box>
      {'^1.2.3  # kompatibel minor & patch\n~1.2.3  # hanya patch\n1.2.3   # versi pasti'}
    </Box>
  ),

  // ── Security ──
  'security-input': () => (
    <Box>
      {'# buruk\nquery = f"SELECT * FROM u WHERE id=" + user_id + "\n# benar\nquery = "SELECT * FROM u WHERE id = ?", (user_id,)'}
    </Box>
  ),
  'security-sql': () => (
    <Box>
      {'# raw concat = rentan\nf"SELECT * FROM users WHERE name = \'{name}\'"\n# parameterized aman\ncursor.execute("... name = ?", (name,))'}
    </Box>
  ),
  'security-xss': () => (
    <Box>
      {'<!-- XSS -->\n<div>{user_html}</div>\n<!-- aman -->\n<div>{escape(user_html)}</div>'}
    </Box>
  ),
  'security-secret': () => (
    <Box>
      {'# buruk\napi_key = "sk-123"\n# benar\napi_key = os.environ["API_KEY"]'}
    </Box>
  ),
};

const Fallback = ({ keyName }: { keyName: string }) => (
  <div className="rounded-lg border border-border bg-muted text-center py-6 text-muted-foreground">
    <Code size={20} className="mx-auto mb-1 opacity-40" />
    <p className="text-[9px] font-mono">visual: {keyName}</p>
  </div>
);

export function GuideVisual({ name }: { name: string }) {
  const V = visuals[name.trim()];
  return V ? <V /> : <Fallback keyName={name} />;
}
