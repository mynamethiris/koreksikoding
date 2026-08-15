---
id: linux
title: "Basic Linux CLI"
description: "Navigate the filesystem and run basic operations via the terminal."
icon: Terminal
color: info
lang: en
---

## Summary

The terminal is a direct line to your operating system. Mastering core commands greatly multiplies your productivity.

## Directory Navigation

Know where you are, list contents, move between folders. Check for key files like `package.json` (JavaScript) or `requirements.txt` (Python).

### Key Points

- pwd: print current directory
- ls: list folder contents
- cd: change directory
- ls -la: list all files including hidden ones

## File and Directory Operations

Create, copy, move, and remove files and directories.

### Key Points

- touch: create empty file
- cp: copy a file
- mv: move or rename
- rm: delete a file
- mkdir: create a folder

## Reading Files

`cat` prints the whole file. `less`, `head`, `tail` let you view parts of long files.

### Key Points

- cat: display entire file
- less: scroll page by page
- head: view first lines
- tail: view last lines

## Pipe and Redirect

Pipe `|` streams one command's output into the next. Redirect `>` writes output to a file.

### Key Points

- |: connect two commands
- >: write to a file (overwrite)
- >>: append to a file
- 2>&1: redirect errors to output

## Permissions

`chmod` sets who can read (r), write (w), and execute (x) a file.

### Key Points

- r read, w write, x execute
- chmod: set file permissions
- 755 = rwxr-xr-x

## Quiz

> Quiz: Basic Linux CLI

### 1. pwd is used to?

- [ ] List
- [x] Print working directory
- [ ] Change directory
- [ ] Make directory

### 2. ls is used to?

- [x] List directory contents
- [ ] Change directory
- [ ] Create file
- [ ] Delete file

### 3. The pipe `|` means?

- [x] Stream output to another command
- [ ] Redirect to file
- [ ] Delete output
- [ ] Exit

### 4. Which file shows JavaScript dependencies?

- [ ] requirements.txt
- [ ] Cargo.toml
- [x] package.json
- [ ] go.mod

### 5. The `>` redirect?

- [ ] Append
- [x] Write to file
- [ ] To variable
- [ ] Exit