import { describe, expect, test } from 'vitest';
import { bandValueToNumber, scoreToBandValue } from './profileModel';

describe('profile model helpers', () => {
  test('scoreToBandValue keeps the existing UI value when the API score is empty', () => {
    expect(scoreToBandValue(null, '7.0')).toBe('7.0');
    expect(scoreToBandValue(undefined, '6.5')).toBe('6.5');
  });

  test('scoreToBandValue converts API score numbers to input strings', () => {
    expect(scoreToBandValue(7, '6.5')).toBe('7');
    expect(scoreToBandValue(7.5, '6.5')).toBe('7.5');
  });

  test('bandValueToNumber returns undefined for invalid band input', () => {
    expect(bandValueToNumber('')).toBeUndefined();
    expect(bandValueToNumber('abc')).toBeUndefined();
    expect(bandValueToNumber('7.5')).toBe(7.5);
  });
});
