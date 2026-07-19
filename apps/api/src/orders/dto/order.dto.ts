import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
  IsObject,
} from 'class-validator';

export enum OrderStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  PRODUCTION = 'production',
  PRINTING = 'printing',
  QUALITY_CHECK = 'quality_check',
  COMPLETED = 'completed',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PARTIAL = 'partial',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

export enum ProductionStatus {
  NOT_STARTED = 'not_started',
  QUEUED = 'queued',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum QualityCheckStatus {
  PENDING = 'pending',
  PASSED = 'passed',
  FAILED = 'failed',
  NEEDS_REWORK = 'needs_rework',
}

export enum DeliveryStatus {
  NOT_SHIPPED = 'not_shipped',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  RETURNED = 'returned',
}

export class CreateOrderFromQuoteDto {
  @IsString()
  @IsNotEmpty()
  quoteId!: string;

  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @IsOptional()
  @IsObject()
  shippingAddress?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  customerNotes?: string;
}

export class UpdateOrderDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  paidAmountCents?: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  paymentReference?: string;

  @IsOptional()
  @IsEnum(ProductionStatus)
  productionStatus?: ProductionStatus;

  @IsOptional()
  @IsString()
  printerId?: string;

  @IsOptional()
  @IsEnum(QualityCheckStatus)
  qualityCheckStatus?: QualityCheckStatus;

  @IsOptional()
  @IsString()
  qualityCheckNotes?: string;

  @IsOptional()
  @IsEnum(DeliveryStatus)
  deliveryStatus?: DeliveryStatus;

  @IsOptional()
  @IsObject()
  shippingAddress?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsString()
  cancellationReason?: string;
}

export class OrderListQueryDto {
  @IsOptional()
  @IsString()
  shopId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsEnum(ProductionStatus)
  productionStatus?: ProductionStatus;

  @IsOptional()
  @IsEnum(DeliveryStatus)
  deliveryStatus?: DeliveryStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  perPage?: number = 20;
}

export class CreateOrderHistoryDto {
  @IsString()
  @IsNotEmpty()
  newStatus!: string;

  @IsString()
  @IsNotEmpty()
  statusType!: string;

  @IsOptional()
  @IsString()
  oldStatus?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty()
  itemName!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number = 1;

  @IsInt()
  @Min(0)
  unitPriceCents!: number;

  @IsOptional()
  @IsString()
  printerId?: string;
}

export class UpdateOrderItemDto {
  @IsOptional()
  @IsString()
  itemName?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  unitPriceCents?: number;

  @IsOptional()
  @IsEnum(ProductionStatus)
  productionStatus?: ProductionStatus;

  @IsOptional()
  @IsString()
  printerId?: string;
}
