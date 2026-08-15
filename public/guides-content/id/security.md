---
id: security
title: "Keamanan Dasar"
description: "Praktik sederhana yang mencegah kerentanan kode umum."
icon: ShieldCheck
color: destructive
lang: id
---

## Ringkasan

Tanam keamanan sejak awal. Jangan simpan rahasia di kode, validasi setiap masukan pengguna.

## Manajemen Kredensial

API key, password, token jangan ditulis di kode (hardcoding). Simpan di file `.env` yang tidak ikut commit.

### Poin Utama

- Jangan pernah hardcode password atau API key di kode
- Gunakan file `.env` untuk menyimpan rahasia
- Pastikan `.env` ada di `.gitignore`

<!-- visual: security-secret -->

## Validasi Input Dasar

Perlakukan masukan pengguna sebagai berbahaya. Validasi tipe, panjang, format sebelum diproses.

### Poin Utama

- Gunakan whitelist: izinkan masukan yang dikenal
- Periksa tipe data yang masuk
- Tolak masukan tidak valid

## SQL Injection

Menyatukan string mentah untuk query SQL bikin rentan. Gunakan parameterized query agar data user tidak eksekusi SQL.

### Poin Utama

- Parameterized query (`?` placeholders)
- Prepared statements
- Jangan pernah concat string ke SQL

<!-- visual: security-sql -->

## XSS (Cross-Site Scripting)

Render masukan user mentah bisa jalankan skrip suntikan. Escape semua output HTML.

### Poin Utama

- Escape karakter khusus (<, >, &, ", ')
- Pakai templating aman
- Pertimbangkan Content Security Policy (CSP)

<!-- visual: security-xss -->

## Transport Security

Kirim data sensitif lewat HTTPS/TLS, jangan HTTP biasa yang bisa dibaca orang lain.

### Poin Utama

- TLS enkripsi data
- HTTPS untuk semua koneksi
- Pastikan sertifikat valid

## Kuis

> Kuis: Keamanan Dasar

### 1. API key seharusnya disimpan di?

- [ ] Hardcode di kode
- [x] Variabel lingkungan / file .env
- [ ] Komentar
- [ ] Nama berkas

### 2. Validasi input dasar bertujuan untuk?

- [ ] Mempercepat program
- [x] Menghalangi masukan berbahaya masuk sistem
- [ ] Menghemat memori
- [ ] Mengganti kode

### 3. SQL injection dicegah dengan?

- [ ] Penggabungan string
- [x] Parameterized query
- [ ] Komentar
- [ ] Indeks

### 4. XSS dicegah dengan?

- [ ] Merender masukan mentah
- [x] Escape HTML
- [ ] SQL
- [ ] JSON

### 5. HTTP berbahaya karena?

- [ ] Lambat
- [x] Mengirim teks tidak terenkripsi
- [ ] Redirect
- [ ] Menggunakan cookie