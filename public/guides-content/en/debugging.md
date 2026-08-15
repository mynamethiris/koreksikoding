---
id: debugging
title: "Basic Debugging"
description: "Find and fix bugs in your code through a systematic process."
icon: Bug
color: warning
lang: en
---

## Summary

Debugging is the systematic process of finding and fixing bugs. It is not guessing, but isolation and verification from the error message down to reproduction.

## Types of Errors

Programming errors fall into three categories: syntax errors (wrong spelling), runtime errors (crash while running), and logic errors (wrong output). Recognizing them speeds up the fix.

### Key Points

- Syntax Error: code does not match language rules
- Runtime Error: error occurs while the program runs
- Logic Error: output is wrong even without an error

## Print Debugging

Insert `print` or `console.log` to watch variable values while the program runs. After finding the bug, remove it or replace it with a debugger.

### Key Points

- console.log / print to inspect values
- Label each output clearly
- Remove all debug prints before release

<!-- visual: debugging-print -->

## Isolating the Problem

Comment out suspected code blocks. If the error disappears, that block is the culprit. Then reduce the problem to the simplest test input.

### Key Points

- Comment code in stages
- Make the minimal test input
- Check the most recent changes

<!-- visual: debugging-isolate -->

## Testing Edge Cases

Bugs often hide at extremes: empty input, zero, negative, or very large data. Test all boundaries.

### Key Points

- Test lower and upper bounds
- Try empty and zero inputs
- Test unusual cases

<!-- visual: debugging-edge -->

## Quiz

> Quiz: Basic Debugging

### 1. A syntax error occurs when?

- [ ] The program is running
- [ ] The output is wrong
- [x] The code does not follow language rules
- [ ] Memory is full

### 2. Print debugging is useful for?

- [ ] Deleting code
- [x] Monitoring variable values at runtime
- [ ] Compiling code
- [ ] Connecting to database

### 3. Which is the correct problem isolation technique?

- [ ] Restart the computer
- [x] Comment out suspected code, then minimize input
- [ ] Add console.log to every line
- [ ] Delete all code

### 4. What does "edge case" mean in debugging?

- [ ] Normal values
- [x] Extreme values like empty, zero, negative
- [ ] Random values
- [ ] Null values

### 5. To "reproduce the error" means?

- [ ] Ignore the error
- [x] Confirm the error happens consistently
- [ ] Replace the computer
- [ ] Update the library