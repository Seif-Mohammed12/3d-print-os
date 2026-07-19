# Module: pricing

Configurable pricing engine for 3D Print OS with multi-tenant support.

## Overview

The pricing module provides a flexible, rule-based pricing calculation system that replaces simple weight-based pricing with a comprehensive formula:

```
Material Cost + Machine Time Cost + Electricity + Maintenance + Failure Risk + Post Processing + Profit Margin = Final Price
```

## Features

- **Hierarchical Pricing Rules**: Support for tenant → shop → material → printer specific rules
- **Configurable Cost Components**: Material, machine time, electricity, maintenance, risk, post-processing
- **Profit Margin Management**: Configurable percentage-based profit margins
- **Discount System**: Percentage and fixed amount discounts with usage limits and validity periods
- **Rush Order Surcharges**: Tier-based rush fees based on deadline urgency
- **Minimum Price Enforcement**: Configurable minimum prices per rule
- **Multi-Tenant Support**: Full tenant isolation with RLS policies
- **Admin Configuration**: All pricing values configurable by administrators

## Architecture

### Domain Layer

- **`types.ts`**: Domain types (PricingRule, Discount, RushSurcharge, PriceCalculationInput, PriceCalculationResult)
- **`value-objects.ts`**: Value objects (Money, Percentage, PriceBreakdown)
- **`pricing-calculator.ts`**: Core pricing calculation logic

### Application Layer

- **`pricing.service.ts`**: Main pricing service with rule resolution and calculation orchestration
- **`ports.ts`**: Repository interfaces for pricing rules, discounts, and rush surcharges

### Infrastructure Layer

- **`pricing-rules.repository.ts`**: PostgreSQL repository for pricing rules
- **`discounts.repository.ts`**: PostgreSQL repository for discounts
- **`rush-surcharges.repository.ts`**: PostgreSQL repository for rush surcharges

### Interface Layer

- **`dto.ts`**: Data transfer objects for API requests
- **`pricing.controller.ts`**: HTTP controller for pricing operations

## Database Schema

### pricing_rules

Stores hierarchical pricing rules with cost components:

- `tenant_id`, `shop_id`, `material_id`, `printer_id`: Rule scope (nullable for broader rules)
- `priority`: Rule priority (higher = more specific)
- `material_cost_per_gram`, `material_cost_per_mm3`: Material pricing options
- `machine_time_cost_per_minute`: Machine time cost
- `electricity_cost_per_hour`: Electricity cost
- `maintenance_cost_per_hour`: Maintenance cost
- `failure_risk_percentage`: Risk percentage (0-100)
- `post_processing_cost_per_unit`, `post_processing_fixed_cost`: Post-processing costs
- `profit_margin_percentage`: Profit margin (0-100)
- `minimum_price`: Minimum price enforcement
- `is_active`: Rule status

### pricing_discounts

Stores discount codes:

- `tenant_id`, `shop_id`: Discount scope
- `code`: Discount code
- `discount_type`: 'percentage' or 'fixed'
- `discount_value`: Discount amount
- `max_uses`, `current_uses`: Usage tracking
- `valid_from`, `valid_until`: Validity period
- `minimum_order_value`: Minimum order requirement
- `applicable_materials`, `applicable_printers`: Scope restrictions

### pricing_rush_surcharges

Stores rush order surcharge tiers:

- `tenant_id`, `shop_id`: Surcharge scope
- `tier_name`: Tier identifier
- `hours_before_deadline`: Deadline threshold
- `surcharge_type`: 'percentage' or 'fixed'
- `surcharge_value`: Surcharge amount

## Usage

### Calculate Price

```typescript
import {
  PricingService,
  PostgresPricingRulesRepository,
  PostgresDiscountsRepository,
  PostgresRushSurchargesRepository,
} from '@3d-print-os/pricing';

const pool = new Pool({ connectionString: DATABASE_URL });

const pricingService = new PricingService(
  new PostgresPricingRulesRepository(pool),
  new PostgresDiscountsRepository(pool),
  new PostgresRushSurchargesRepository(pool),
);

const result = await pricingService.calculatePrice({
  tenantId: 'tenant-123',
  shopId: 'shop-456',
  materialId: 'material-789',
  printerId: 'printer-012',
  weightGrams: 100,
  volumeMm3: 100000,
  estimatedTimeMinutes: 60,
  quantity: 1,
  discountCode: 'SAVE10',
  rushHoursBeforeDeadline: 24,
});

console.log(result.breakdown);
// {
//   materialCost: 1000,
//   machineCost: 3000,
//   electricityCost: 100,
//   maintenanceCost: 50,
//   riskCost: 200,
//   postProcessingCost: 100,
//   subtotal: 4450,
//   discountAmount: 445,
//   rushSurcharge: 1113,
//   profit: 1118,
//   finalPrice: 6236
// }
```

### Create Pricing Rule

```typescript
const controller = new PricingController(
  pricingService,
  rulesRepo,
  discountsRepo,
  rushSurchargesRepo,
);

const rule = await controller.createPricingRule({
  tenantId: 'tenant-123',
  shopId: 'shop-456',
  materialId: 'material-789',
  printerId: 'printer-012',
  priority: 10,
  materialCostPerGram: 10, // $0.10 per gram
  machineTimeCostPerMinute: 50, // $0.50 per minute
  electricityCostPerHour: 100, // $1.00 per hour
  maintenanceCostPerHour: 50, // $0.50 per hour
  failureRiskPercentage: 5, // 5%
  postProcessingCostPerUnit: 100, // $1.00 per unit
  profitMarginPercentage: 20, // 20%
  minimumPrice: 500, // $5.00 minimum
});
```

### Create Discount

```typescript
const discount = await controller.createDiscount({
  tenantId: 'tenant-123',
  code: 'SAVE10',
  discountType: 'percentage',
  discountValue: 10, // 10%
  maxUses: 100,
  validFrom: '2024-01-01T00:00:00Z',
  validUntil: '2024-12-31T23:59:59Z',
  minimumOrderValue: 1000, // $10.00 minimum
});
```

### Create Rush Surcharge

```typescript
const rushSurcharge = await controller.createRushSurcharge({
  tenantId: 'tenant-123',
  tierName: 'express',
  hoursBeforeDeadline: 24, // Within 24 hours
  surchargeType: 'percentage',
  surchargeValue: 25, // 25% surcharge
});
```

## Rule Resolution

The pricing engine resolves rules in order of specificity:

1. **Most Specific**: tenant + shop + material + printer
2. **Shop + Material**: tenant + shop + material
3. **Shop Only**: tenant + shop
4. **Material Only**: tenant + material
5. **Tenant Default**: tenant only

Higher priority rules override lower priority rules.

## Value Objects

### Money

Encapsulates monetary values in cents to avoid floating-point errors:

```typescript
const money = Money.fromCents(100); // $1.00
const money2 = Money.fromDollars(10.5); // $10.50
const sum = money.add(money2);
const percentage = money.percentage(20); // 20% of money
```

### Percentage

Encapsulates percentage values with validation:

```typescript
const percentage = Percentage.fromValue(20); // 20%
const ofMoney = percentage.of(money); // 20% of money
```

## Testing

Run tests with:

```bash
pnpm test
```

Test coverage includes:

- Price calculation logic
- Discount application
- Rush surcharge application
- Value object operations
- Rule resolution

## Configuration

All pricing values are stored in the database and configurable via the admin API. No hardcoded prices.

### Default Values

When no specific rule is found, the calculator uses default values:

- Material cost: $0
- Machine time: $0
- Electricity: $0
- Maintenance: $0
- Risk: 0%
- Post-processing: $0
- Profit margin: 20%
- Minimum price: $0

## Migration

Run the database migration:

```bash
psql -U postgres -d 3d_print_os -f infra/migrations/002_create_pricing_rules.sql
```

## Integration

The pricing module integrates with:

- **@3d-print-os/persistence**: Database connection and tenant session management
- **PostgreSQL**: Data persistence with RLS policies
- **Main API**: Via HTTP endpoints in the interface layer
