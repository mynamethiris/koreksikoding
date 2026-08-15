import { BookOpen, Upload, BarChart3, Lightbulb, Shield } from 'lucide-react';

export const guideSections = [
  {
    icon: BookOpen,
    title: 'Mulai Cepat',
    items: [
      'Upload file atau ketik kode langsung di editor',
      'Klik "Analisis" atau tekan Ctrl+Enter',
      'Lihat hasil: skor, error, warning, dan saran perbaikan',
    ],
  },
  {
    icon: Upload,
    title: 'Upload File',
    items: [
      'Drag & drop, file individual, atau seluruh folder',
      '20+ bahasa didukung: Python, JS, TS, Java, C++, Go, Rust, dll',
      'Maks 5MB per file, kode disanitasi sebelum dikirim',
    ],
  },
  {
    icon: BarChart3,
    title: 'Membaca Hasil Analisis',
    items: [
      'Tab Hasil: ringkasan error, warning, saran, dan skor',
      'Tab Perbaikan: kode yang sudah diperbaiki + daftar perubahan',
      'Tab Belajar: konsep pemrograman terkait error',
      'Detail error: lokasi baris & penjelasan penyebab',
    ],
  },
  {
    icon: Lightbulb,
    title: 'Tips Belajar Efektif',
    items: [
      'Ikuti panduan berurutan: Logic → Debugging → IDE...',
      'Kerjakan quiz di akhir tiap bab untuk membuka guide berikutnya',
      'Tandai section selesai untuk melacak progress',
      'Coba tantangan coding di halaman Tantangan',
    ],
  },
  {
    icon: Shield,
    title: 'Privasi & Keamanan',
    items: [
      'Kode tidak pernah disimpan di server',
      'API key hanya ada di browser Anda (localStorage)',
      'Tidak ada tracking atau pihak ketiga',
    ],
  },
];