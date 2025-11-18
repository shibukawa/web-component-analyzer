/**
 * Test case: File with no React component
 * Expected behavior: Extension should display "No React component found in this file"
 * Requirements: 7.2
 */

// This file contains only utility functions, no React component

export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}

export const PI = 3.14159;

export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }

  subtract(a: number, b: number): number {
    return a - b;
  }
}

// No default export, no React component
