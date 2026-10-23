# KoreksiKoding

Platform analisis kode berbasis AI. Kode dianalisis secara instan untuk mendeteksi error, warning, dan saran perbaikan, lalu aplikasi membimbing Anda memperbaiki sendiri tanpa memberikan kode perbaikan siap pakai.

## Fitur

- **Analisis Cerdas** - Deteksi error, warning, saran perbaikan otomatis pakai AI
- **CodeMirror 6** - Editor kode dengan syntax highlighting untuk 20+ bahasa
- **Perbaikan Terbimbing** - Tangga petunjuk (konsep, penyebab, arah) tanpa kode jadi; perbaikannya Anda tulis sendiri
- **Pemeriksa Perbaikan** - Penguji AI menilai apakah perbaikan Anda benar-benar mengatasi isu, bukan apakah teksnya sama dengan kunci jawaban
- **Keamanan & Duplikasi** - Deteksi vulnerability (CWE) dan code duplication
- **Mode Belajar** - Konsep pemrograman terkait dan tips untuk meningkatkan pemahaman
- **Terminal Error Analyzer** - Analisis pesan error terminal dan dapatkan solusi
- **Code Converter** - Konversi kode antar bahasa pemrograman dengan penjelasan
- **Prompt Builder** - Buat dan perbaiki prompt untuk AI
- **Coding Challenge** - Tantangan coding interaktif dengan verifikasi solusi
- **Typing Test** - Latihan mengetik kode dengan pengukuran WPM dan akurasi
- **Snippet Sharing** - Bagikan kode via link (berlaku 2 jam)
- **Learning Guides** - Panduan belajar interaktif dengan quiz
- **Riwayat Analisis** - Tersimpan lokal di IndexedDB, bisa di-export ke JSON/CSV
- **Multi Provider** - Gemini, Groq, atau custom provider OpenAI-compatible
- **Dark/Light Mode** - Toggle tema gelap dan terang
- **Responsive** - Split-pane di desktop, tabbed view di mobile
- **Privasi Terjaga** - Tidak ada backend, kode tidak pernah disimpan di server
- **Multi Bahasa** - Dukungan Indonesia dan English

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
| Linting | oxlint |

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
3. **Custom Provider** - Tambah provider dengan endpoint OpenAI-compatible (Mistral, OpenAI, dll)

API key disimpan di `localStorage` browser Anda, tidak dikirim ke server manapun.
