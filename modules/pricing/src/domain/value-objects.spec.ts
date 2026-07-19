import { describe, it, expect } from 'vitest';
import { Money, Percentage } from './value-objects';

describe('Money', () => {
  describe('fromCents', () => {
    it('should create Money from cents', () => {
      const money = Money.fromCents(100);
      expect(money.toCents()).toBe(100);
    });

    it('should reject negative values', () => {
      expect(() => Money.fromCents(-100)).toThrow('Money cannot be negative');
    });
  });

  describe('fromDollars', () => {
    it('should create Money from dollars', () => {
      const money = Money.fromDollars(10.50);
      expect(money.toCents()).toBe(1050);
    });

    it('should round to nearest cent', () => {
      const money = Money.fromDollars(10.555);
      expect(money.toCents()).toBe(1056);
    });
  });

  describe('toDollars', () => {
    it('should convert to dollars', () => {
      const money = Money.fromCents(100);
      expect(money.toDollars()).toBe(1.0);
    });
  });

  describe('add', () => {
    it('should add two Money values', () => {
      const a = Money.fromCents(100);
      const b = Money.fromCents(50);
      const result = a.add(b);
      expect(result.toCents()).toBe(150);
    });
  });

  describe('subtract', () => {
    it('should subtract two Money values', () => {
      const a = Money.fromCents(100);
      const b = Money.fromCents(50);
      const result = a.subtract(b);
      expect(result.toCents()).toBe(50);
    });

    it('should not go below zero', () => {
      const a = Money.fromCents(50);
      const b = Money.fromCents(100);
      const result = a.subtract(b);
      expect(result.toCents()).toBe(0);
    });
  });

  describe('multiply', () => {
    it('should multiply Money by factor', () => {
      const money = Money.fromCents(100);
      const result = money.multiply(2);
      expect(result.toCents()).toBe(200);
    });

    it('should round result', () => {
      const money = Money.fromCents(100);
      const result = money.multiply(2.555);
      expect(result.toCents()).toBe(256);
    });
  });

  describe('percentage', () => {
    it('should calculate percentage of Money', () => {
      const money = Money.fromCents(100);
      const result = money.percentage(20);
      expect(result.toCents()).toBe(20);
    });
  });

  describe('comparison', () => {
    it('should compare greater than', () => {
      const a = Money.fromCents(100);
      const b = Money.fromCents(50);
      expect(a.isGreaterThan(b)).toBe(true);
      expect(b.isGreaterThan(a)).toBe(false);
    });

    it('should compare less than', () => {
      const a = Money.fromCents(50);
      const b = Money.fromCents(100);
      expect(a.isLessThan(b)).toBe(true);
      expect(b.isLessThan(a)).toBe(false);
    });

    it('should check equality', () => {
      const a = Money.fromCents(100);
      const b = Money.fromCents(100);
      expect(a.equals(b)).toBe(true);
    });
  });
});

describe('Percentage', () => {
  describe('fromValue', () => {
    it('should create Percentage from value', () => {
      const percentage = Percentage.fromValue(50);
      expect(percentage.toValue()).toBe(50);
    });

    it('should reject values below 0', () => {
      expect(() => Percentage.fromValue(-1)).toThrow('Percentage must be between 0 and 100');
    });

    it('should reject values above 100', () => {
      expect(() => Percentage.fromValue(101)).toThrow('Percentage must be between 0 and 100');
    });
  });

  describe('of', () => {
    it('should calculate percentage of Money', () => {
      const percentage = Percentage.fromValue(20);
      const money = Money.fromCents(100);
      const result = percentage.of(money);
      expect(result.toCents()).toBe(20);
    });
  });
});
