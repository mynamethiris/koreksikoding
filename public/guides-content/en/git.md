---
id: git
title: "Basic Git"
description: "Version control concepts: commit, branch, merge, and teamwork."
icon: GitBranch
color: success
lang: en
---

## Summary

Git tracks your code history. Every version is stored neatly and can be restored. Essential for team collaboration.

## What Is Git

Git is a distributed version control system. Every clone stores the full history, so you can work offline.

### Key Points

- Work offline without internet
- Each commit stores a full snapshot
- You can undo (rollback) almost anything

## Staging and Commit

`git add` stages files, `git commit -m "message"` records the snapshot. A clear commit message explains WHY the change was made.

### Key Points

- git add: stage files for commit
- git commit -m "...": save a snapshot
- Message should explain the reason for the change

## Branches

A branch is a parallel history line. Do feature work on a separate branch so `main` stays stable.

### Key Points

- git branch: view or create branches
- git checkout -b name: create and switch to new branch
- Safe parallel work for features

## Merge

Bring one branch into another. Fast-forward if linear; resolve conflicts if changes overlap.

### Key Points

- git merge name: combine a branch
- Conflicts happen when changes overlap
- Fast-forward: no conflict

## Remote and Pull Request

`git push` uploads, `git pull` fetches. A Pull Request is a merge request reviewed through a UI.

### Key Points

- git push: upload to remote (GitHub/GitLab)
- git pull: fetch updates from remote
- Pull Request: merge code via web UI

## Quiz

> Quiz: Basic Git

### 1. git init is used to?

- [ ] Push
- [x] Create a new local repository
- [ ] Clone
- [ ] Merge

### 2. What is git add used for?

- [ ] Commit
- [x] Stage files for commit
- [ ] Create branch
- [ ] Pull

### 3. Branches are used for?

- [ ] Delete files
- [x] Parallel history for features
- [ ] Compress
- [ ] Rename

### 4. git push?

- [ ] Download
- [x] Upload
- [ ] Merge
- [ ] Diff

### 5. Merge conflicts occur when?

- [ ] Always fast-forward
- [x] Changes overlap
- [ ] First commit
- [ ] New branch