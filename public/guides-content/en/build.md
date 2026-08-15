---
id: build
title: "Build & Dependency Management Basics"
description: "How projects are built and how their dependencies are managed."
icon: Package
color: info
lang: en
---

## Summary

A build transforms your source code and dependencies into a runnable artifact. Dependency management keeps every library consistent.

## What Is a Build

A build transforms source code into a file ready to run. This can be compilation, module bundling, or transpilation to a different target.

### Key Points

- Compilation: turn code into another language
- Bundling: merge many modules into one file
- Transpilation: convert to an older language version

## Package Managers

Package managers fetch and manage third-party libraries automatically. This saves you from downloading and managing libraries by hand.

### Key Points

- npm: for JavaScript / Node.js
- pip: for Python
- cargo: for Rust

## Manifest vs Lockfile

The manifest (`package.json`) declares what you need. The lockfile (`package-lock.json`) pins exact installed versions so everyone gets the same thing.

### Key Points

- package.json = declaration of needs
- package-lock.json = pinned exact versions
- Keep both in sync

## Dependency Resolution

When many versions exist, a resolver picks compatible versions and avoids conflicts. The caret (^) and tilde (~) prefixes control which version range is allowed.

### Key Points

- caret (^): compatible with minor & patch
- tilde (~): patch only
- exact version: no prefix, pinned exactly

## Semantic Versioning

Versions follow the pattern MAJOR.MINOR.PATCH. Patches fix bugs, minors add features, majors may break compatibility.

### Key Points

- 1.2.3 = major.minor.patch
- ^ and ~ control version ranges
- Watch for major versions that may break

## Quiz

> Quiz: Build & Dependency Management Basics

### 1. A build is the process of?

- [ ] Deleting files
- [x] Compiling source into a runnable artifact
- [ ] Renaming
- [ ] Compressing only

### 2. npm is a package manager for?

- [ ] Python
- [x] JavaScript
- [ ] Rust
- [ ] Go

### 3. package.json contains?

- [ ] Lockfile
- [x] Dependency manifest
- [ ] Source code
- [ ] OS config

### 4. package-lock.json contains?

- [ ] Source code
- [x] Pinned dependency versions
- [ ] README
- [ ] License

### 5. What does SemVer mean?

- [ ] Date format
- [x] MAJOR.MINOR.PATCH
- [ ] Random
- [ ] Author name