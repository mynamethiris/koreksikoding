---
id: linux
title: "Terminal & CLI Dasar"
description: "Navigasi sistem file dan jalankan operasi dasar melalui terminal."
icon: Terminal
color: info
lang: id
---

## Ringkasan

Terminal adalah jalur langsung ke sistem operasi. Menguasai perintah inti meningkatkan produktivitas kerja Anda.

## Navigasi Direktori

Ketahui posisi Anda, lihat isi, pindah direktori cepat. Cek file penting seperti `package.json` (JavaScript) atau `requirements.txt` (Python).

### Poin Utama

- pwd: cetak direktori saat ini
- ls: lihat isi direktori
- cd: pindah direktori
- ls -la: lihat semua berkas termasuk tersembunyi

## Operasi File dan Direktori

Buat, salin, pindah, hapus berkas dan folder.

### Poin Utama

- touch: buat file kosong
- cp: salin file
- mv: pindah atau ganti nama
- rm: hapus file
- mkdir: buat folder

## Membaca File

`cat` cetak isi seluruh berkas. `less`, `head`, `tail` lihat sebagian berkas panjang.

### Poin Utama

- cat: tampilkan isi seluruh berkas
- less: gulir halaman demi halaman
- head: lihat baris pertama
- tail: lihat baris terakhir

## Pipe dan Redirect

Pipe `|` alirkan output satu perintah ke perintah lain. Redirect `>` tulis output ke berkas.

### Poin Utama

- |: hubungkan dua perintah
- >: tulis ke berkas (timpa)
- >>: tambah ke berkas
- 2>&1: alihkan error ke output

## Izin

`chmod` atur siapa yang bisa baca (r), tulis (w), eksekusi (x) berkas.

### Poin Utama

- r: baca, w: tulis, x: jalankan
- chmod: atur izin berkas
- 755 = rwxr-xr-x

## Kuis

> Kuis: Terminal & CLI Dasar

### 1. pwd digunakan untuk?

- [ ] Daftar
- [x] Cetak direktori kerja
- [ ] Ganti direktori
- [ ] Buat direktori

### 2. ls digunakan untuk?

- [x] Daftar isi direktori
- [ ] Ganti direktori
- [ ] Buat file
- [ ] Hapus file

### 3. Pipe `|` berarti?

- [x] Alirkan keluaran ke perintah lain
- [ ] Arahkan ke berkas
- [ ] Hapus keluaran
- [ ] Keluar

### 4. File proyek apa yang menunjukkan dependensi JavaScript?

- [ ] requirements.txt
- [ ] Cargo.toml
- [x] package.json
- [ ] go.mod

### 5. Redirect `>`?

- [ ] Tambahkan
- [x] Tulis ke berkas
- [ ] Ke variabel
- [ ] Keluar