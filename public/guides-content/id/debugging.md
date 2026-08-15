---
id: debugging
title: "Debugging Dasar"
description: "Temukan dan perbaiki bug dalam kode Anda melalui proses yang sistematis."
icon: Bug
color: warning
lang: id
---

## Ringkasan

Debugging adalah proses sistematis menemukan dan memperbaiki bug. Bukan menebak, tapi isolasi dan verifikasi dari pesan error hingga reproduksi.

## Jenis-Jenis Error

Kesalahan program ada tiga: syntax error (salah penulisan), runtime error (error saat jalan), logic error (hasil tidak sesuai). Pahami perbedaan untuk mempercepat perbaikan.

### Poin Utama

- Syntax Error: kode tidak sesuai aturan bahasa
- Runtime Error: error saat program berjalan
- Logic Error: hasil salah meski tidak ada error

## Print Debugging

Sisipkan `print` atau `console.log` untuk memantau nilai variabel saat program berjalan. Setelah ketemu masalah, hapus atau ganti dengan debugger.

### Poin Utama

- console.log / print untuk melihat nilai
- Beri label jelas setiap keluaran
- Hapus semua pernyataan debug sebelum rilis

<!-- visual: debugging-print -->

## Mengisolasi Masalah

Komentari blok kode yang mencurigakan. Jika error hilang, blok itu bersalah. Kecilkan masalah dengan input uji paling sederhana.

### Poin Utama

- Komentari kode secara bertahap
- Buat input uji paling sederhana
- Periksa perubahan terbaru

<!-- visual: debugging-isolate -->

## Menguji Kasus Tepi

Bug sering tersembunyi di nilai ekstrem: masukan kosong, nol, negatif, atau data sangat besar. Uji semua batas.

### Poin Utama

- Uji nilai batas bawah dan atas
- Coba input kosong dan nol
- Uji kasus yang tidak biasa

<!-- visual: debugging-edge -->

## Kuis

> Kuis: Debugging Dasar

### 1. Syntax error terjadi ketika?

- [ ] Program sedang berjalan
- [ ] Hasil tidak sesuai
- [x] Kode tidak sesuai aturan bahasa
- [ ] Memori penuh

### 2. Print debugging berguna untuk?

- [ ] Menghapus kode
- [x] Memantau nilai variabel saat runtime
- [ ] Mengompilasi kode
- [ ] Menghubungkan database

### 3. Teknik isolasi masalah yang benar?

- [ ] Nyalakan ulang komputer
- [x] Komentari kode yang dicurigai, lalu minimalkan input
- [ ] Tambah console.log di setiap baris
- [ ] Hapus semua kode

### 4. Apa arti "kasus tepi" dalam debugging?

- [ ] Nilai normal
- [x] Nilai ekstrem seperti kosong, nol, negatif
- [ ] Nilai acak
- [ ] Nilai null

### 5. "Mereproduksi error" berarti?

- [ ] Abaikan error
- [x] Pastikan error terjadi secara konsisten
- [ ] Ganti komputer
- [ ] Perbarui library