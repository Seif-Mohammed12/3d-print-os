// Value objects for pricing calculations

export class Money {
  constructor(private readonly amount: number) {
    if (amount < 0) {
      throw new Error('Money cannot be negative');
    }
  }

  static fromCents(cents: number): Money {
    return new Money(cents);
  }

  static fromDollars(dollars: number): Money {
    return new Money(Math.round(dollars * 100));
  }

  toCents(): number {
    return this.amount;
  }

  toDollars(): number {
    return this.amount / 100;
  }

  add(other: Money): Money {
    return new Money(this.amount + other.amount);
  }

  subtract(other: Money): Money {
    return new Money(Math.max(0, this.amount - other.amount));
  }

  multiply(factor: number): Money {
    return new Money(Math.round(this.amount * factor));
  }

  percentage(percent: number): Money {
    return this.multiply(percent / 100);
  }

  isGreaterThan(other: Money): boolean {
    return this.amount > other.amount;
  }

  isLessThan(other: Money): boolean {
    return this.amount < other.amount;
  }

  equals(other: Money): boolean {
    return this.amount === other.amount;
  }

  toJSON(): number {
    return this.amount;
  }
}

export class Percentage {
  constructor(private readonly value: number) {
    if (value < 0 || value > 100) {
      throw new Error('Percentage must be between 0 and 100');
    }
  }

  static fromValue(value: number): Percentage {
    return new Percentage(value);
  }

  toValue(): number {
    return this.value;
  }

  of(amount: Money): Money {
    return amount.percentage(this.value);
  }

  toJSON(): number {
    return this.value;
  }
}

export class PriceBreakdown {
  constructor(
    public readonly materialCost: Money,
    public readonly machineCost: Money,
    public readonly electricityCost: Money,
    public readonly maintenanceCost: Money,
    public readonly riskCost: Money,
    public readonly postProcessingCost: Money,
    public readonly discountAmount: Money,
    public readonly rushSurcharge: Money,
    public readonly profitMargin: Percentage
  ) {}

  get subtotal(): Money {
    return this.materialCost
      .add(this.machineCost)
      .add(this.electricityCost)
      .add(this.maintenanceCost)
      .add(this.riskCost)
      .add(this.postProcessingCost);
  }

  get beforeProfit(): Money {
    return this.subtotal
      .subtract(this.discountAmount)
      .add(this.rushSurcharge);
  }

  get profit(): Money {
    return this.profitMargin.of(this.beforeProfit);
  }

  get finalPrice(): Money {
    return this.beforeProfit.add(this.profit);
  }

  toJSON() {
    return {
      materialCost: this.materialCost.toCents(),
      machineCost: this.machineCost.toCents(),
      electricityCost: this.electricityCost.toCents(),
      maintenanceCost: this.maintenanceCost.toCents(),
      riskCost: this.riskCost.toCents(),
      postProcessingCost: this.postProcessingCost.toCents(),
      subtotal: this.subtotal.toCents(),
      discountAmount: this.discountAmount.toCents(),
      rushSurcharge: this.rushSurcharge.toCents(),
      profit: this.profit.toCents(),
      finalPrice: this.finalPrice.toCents(),
    };
  }
}
