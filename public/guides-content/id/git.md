---
id: git
title: "Git Dasar"
description: "Konsep version control: commit, branch, merge, dan kerja tim."
icon: GitBranch
color: success
lang: id
---

## Ringkasan

Git melacak riwayat perubahan kode. Setiap versi tersimpan rapi dan bisa dikembalikan. Sangat penting untuk kerja tim.

## Apa Itu Git

Git adalah sistem kontrol versi terdistribusi. Setiap klon menyimpan riwayat lengkap, bisa kerja offline.

### Poin Utama

- Bekerja offline tanpa internet
- Setiap commit simpan snapshot lengkap
- Bisa dibatalkan (rollback) jika salah

## Staging dan Commit

`git add` menandai berkas, `git commit -m "pesan"` mencatat snapshot. Pesan commit jelas menjelaskan mengapa perubahan dilakukan.

### Poin Utama

- git add: siapkan berkas untuk commit
- git commit -m "...": simpan snapshot
- Pesan commit jelaskan alasan, bukan apa yang diubah

## Branch

Branch adalah riwayat paralel. Kerja fitur di branch terpisah, jaga `main` stabil.

### Poin Utama

- git branch: lihat atau buat branch
- git checkout -b nama: buat dan pindah branch baru
- Kerja tim aman di branch terpisah

## Merge

Gabungkan branch. Fast-forward jika linear; selesaikan konflik jika perubahan tumpang tindih.

### Poin Utama

- git merge nama-branch: gabungkan branch
- Konfisi terjadi saat perubahan tumpang tindih
- Fast-forward: tanpa konflik

## Remote dan Pull Request

`git push` unggah, `git pull` ambil. Pull Request adalah permintaan merge yang ditinjau via UI.

### Poin Utama

- git push: unggah ke remote (GitHub/GitLab)
- git pull: ambil pembaruan dari remote
- Pull Request: gabungkan kode via antarmuka

## Kuis

> Kuis: Git Dasar

### 1. git init digunakan untuk?

- [ ] Push
- [x] Buat repository lokal baru
- [ ] Clone
- [ ] Merge

### 2. git add digunakan untuk?

- [ ] Commit
- [x] Menyiapkan file untuk commit
- [ ] Buat branch
- [ ] Pull

### 3. Branch digunakan untuk?

- [ ] Hapus file
- [x] Riwayat paralel untuk fitur
- [ ] Mengompresi
- [ ] Mengganti nama

### 4. git push?

- [ ] Unduh
- [x] Unggah
- [ ] Merge
- [ ] Diff

### 5. Konflik merge terjadi ketika?

- [ ] Selalu fast-forward
- [x] Perubahan tumpang tindih
- [ ] Commit pertama
- [ ] Branch baru