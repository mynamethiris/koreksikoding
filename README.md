# KoreksiKoding

Platform analisis kode berbasis AI. Kode dianalisis secara instan untuk mendeteksi error, warning, saran perbaikan, dan menghasilkan kode yang sudah diperbaiki.

## Fitur

- **Analisis Cerdas** - Deteksi error, warning, saran perbaikan otomatis pakai AI
- **CodeMirror 6** - Editor kode dengan syntax highlighting untuk 20+ bahasa
- **Perbaikan Instan** - Kode yang sudah diperbaiki beserta penjelasan detail
- **Mode Belajar** - Konsep pemrograman terkait dan tips untuk meningkatkan pemahaman
- **Riwayat Analisis** - Tersimpan lokal di IndexedDB, bisa di-export ke JSON/CSV
- **Multi Provider** - Gemini, Groq, atau custom provider OpenAI-compatible
- **Dark/Light Mode** - Toggle tema gelap dan terang
- **Responsive** - Split-pane di desktop, tabbed view di mobile
- **Privasi Terjaga** - Tidak ada backend, kode tidak pernah disimpan di server

## Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | React 19 |
| Bahasa | TypeScript |
| Bundler | Vite 8 |
| CSS | Tailwind CSS v4 |
| Editor | CodeMirror 6 |
| Animasi | Motion |
| Routing | React Router 7 |
| Persistensi | IndexedDB (idb) |
| Ikon | Lucide React |

## Prasyarat

- Node.js >= 18
- npm atau package manager lainnya

## Instalasi

```bash
npm install
npm run dev
```

## Skrip

| Skrip | Deskripsi |
|---|---|
| `npm run dev` | Jalankan development server |
| `npm run build` | Build untuk produksi (`tsc -b && vite build`) |
| `npm run preview` | Preview hasil build |
| `npm run lint` | Jalankan oxlint |

## Konfigurasi AI

Buka halaman **Pengaturan** untuk mengatur provider AI:

1. **Gemini** (default) - Dapatkan API key gratis dari [Google AI Studio](https://aistudio.google.com)
2. **Groq** (default) - Dapatkan API key gratis dari [console.groq.com](https://console.groq.com)
3. **Custom Provider** - Tambah provider dengan endpoint OpenAI-compatible

API key disimpan di `localStorage` browser Anda, tidak dikirim ke server manapun.
