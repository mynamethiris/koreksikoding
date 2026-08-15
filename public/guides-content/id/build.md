---
id: build
title: "Dasar Build & Manajemen Dependensi"
description: "Cara proyek dibangun dan bagaimana dependensinya dikelola."
icon: Package
color: info
lang: id
---

## Ringkasan

Build mengubah kode sumber dan dependensi jadi artefak yang bisa dijalankan. Manajemen dependensi menjaga library tetap konsisten.

## Apa Itu Build

Build mengubah kode sumber jadi berkas siap jalankan. Bisa kompilasi, bundling modul, atau transpilasi ke target lain.

### Poin Utama

- Kompilasi: ubah kode jadi bahasa lain
- Bundling: gabung banyak modul jadi satu berkas
- Transpilasi: ubah ke versi bahasa lebih lama

## Package Manager

Package manager ambil dan kelola library pihak ketiga otomatis. Selamatkan dari unduh dan kelola manual.

### Poin Utama

- npm: untuk JavaScript / Node.js
- pip: untuk Python
- cargo: untuk Rust

## Manifest vs Lockfile

Manifest (`package.json`) deklarasikan kebutuhan. Lockfile (`package-lock.json`) catat versi pasti terpasang, semua orang dapat versi sama.

### Poin Utama

- package.json = deklarasi kebutuhan
- package-lock.json = versi pasti terpasang
- Jaga keduanya tetap sinkron

## Resolusi Dependensi

Banyak versi tersedia, pemilih versi pilih yang kompatibel, hindari konflik. Prefiks caret (^) dan tilde (~) kontrol rentang versi.

### Poin Utama

- caret (^): kompatibel minor & patch
- tilde (~): hanya patch
- versi pasti: tanpa prefiks, versi eksak

## Versioning Semantik

Versi pola MAJOR.MINOR.PATCH. Patch perbaiki bug, minor tambah fitur, major bisa hancurkan kompatibilitas.

### Poin Utama

- 1.2.3 = major.minor.patch
- ^ dan ~ kontrol rentang versi
- Waspadai perubahan major yang hancurkan

## Kuis

> Kuis: Dasar Build & Manajemen Dependensi

### 1. Build adalah proses?

- [ ] Menghapus berkas
- [x] Mengkompilasi kode menjadi artefak yang dapat dijalankan
- [ ] Mengganti nama
- [ ] Hanya mengompresi

### 2. npm adalah package manager untuk?

- [ ] Python
- [x] JavaScript
- [ ] Rust
- [ ] Go

### 3. package.json berisi?

- [ ] Lockfile
- [x] Manifest dependensi
- [ ] Kode sumber
- [ ] Konfigurasi OS

### 4. package-lock.json berisi?

- [ ] Kode sumber
- [x] Versi dependensi yang ditetapkan
- [ ] README
- [ ] Lisensi

### 5. Apa arti SemVer?

- [ ] Format tanggal
- [x] MAJOR.MINOR.PATCH
- [ ] Acak
- [ ] Nama penulis