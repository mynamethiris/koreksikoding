---
id: security
title: "Basic Security"
description: "Simple practices that prevent common code vulnerabilities."
icon: ShieldCheck
color: destructive
lang: en
---

## Summary

Bake security in from the start. Never store secrets in code, always validate every user input.

## Credentials Management

API keys, passwords, tokens must never be hardcoded in code. Store them in a `.env` file not committed to the repository.

### Key Points

- Never hardcode passwords or API keys in code
- Use a `.env` file to store secrets
- Make sure `.env` is in `.gitignore`

<!-- visual: security-secret -->

## Basic Input Validation

Treat every user input as potentially harmful. Validate type, length, format before processing.

### Key Points

- Use a whitelist: only allow known input
- Check the data type coming in
- Reject invalid input

## SQL Injection

Building SQL by raw string concatenation makes apps vulnerable. Use parameterized queries so user data cannot execute arbitrary SQL.

### Key Points

- Parameterized queries (`?` placeholders)
- Prepared statements
- Never concatenate strings into SQL

<!-- visual: security-sql -->

## XSS (Cross-Site Scripting)

Rendering raw user input can run injected scripts. Escape all HTML output so it is safe.

### Key Points

- Escape special characters (<, >, &, ", ')
- Use safe templating
- Consider Content Security Policy (CSP)

<!-- visual: security-xss -->

## Transport Security

Send sensitive data over HTTPS/TLS, never over plain HTTP that others can read.

### Key Points

- TLS encrypts the data
- HTTPS for all connections
- Ensure the certificate is still valid

## Quiz

> Quiz: Basic Security

### 1. API keys should be stored in?

- [ ] Hardcoded in code
- [x] Environment variables / .env file
- [ ] Comments
- [ ] File names

### 2. Basic input validation aims to?

- [ ] Speed up the program
- [x] Block malicious input from entering the system
- [ ] Save memory
- [ ] Replace code

### 3. SQL injection is prevented by using?

- [ ] String concatenation
- [x] Parameterized queries
- [ ] Comments
- [ ] Indexes

### 4. XSS is prevented by?

- [ ] Rendering raw input
- [x] Escaping HTML
- [ ] SQL
- [ ] JSON

### 5. HTTP is dangerous because it?

- [ ] Is slow
- [x] Transmits unencrypted text
- [ ] Redirects
- [ ] Uses cookies