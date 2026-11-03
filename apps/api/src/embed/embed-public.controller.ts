import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { GeometryDomainError } from '@3d-print-os/geometry';

import { Public } from '../identity/auth.decorators';
import { AppError } from '../shared/errors/app.error';
import {
  CompleteEmbedUploadDto,
  CreateEmbedQuoteDto,
  EmbedQuoteChoicesDto,
  PlaceEmbedOrderDto,
  StartEmbedSessionDto,
  StartEmbedUploadDto,
} from './dto/embed.dto';
import { CurrentEmbedSession, EmbedSessionGuard } from './embed-session.guard';
import type { EmbedSession } from './embed.repository';
import { EmbedService } from './embed.service';

/** Per client IP, per minute. Slicing is the expensive part; ordering should be rare. */
const CONFIG_THROTTLE = { default: { limit: 60, ttl: 60_000 } };
const SESSION_THROTTLE = { default: { limit: 10, ttl: 60_000 } };
const UPLOAD_THROTTLE = { default: { limit: 10, ttl: 60_000 } };
const PRICING_THROTTLE = { default: { limit: 20, ttl: 60_000 } };
const ORDER_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

function mapError(error: unknown): never {
  if (error instanceof GeometryDomainError) {
    throw new AppError({ code: error.code, message: error.message, statusCode: error.statusCode });
  }
  throw error;
}

/**
 * The public API behind the website quoter. Nothing here takes a staff token: the shop is
 * named by its publishable key, then a visitor session scopes every model and quote.
 */
@Controller('public/embed')
@Public()
export class EmbedPublicController {
  constructor(private readonly embed: EmbedService) {}

  @Get(':key/config')
  @Throttle(CONFIG_THROTTLE)
  async config(@Param('key') key: string, @Headers('origin') origin: string | undefined) {
    return { data: await this.embed.getConfig(key, origin) };
  }

  @Post(':key/sessions')
  @Throttle(SESSION_THROTTLE)
  async startSession(
    @Param('key') key: string,
    @Headers('origin') origin: string | undefined,
    @Body() body: StartEmbedSessionDto,
  ) {
    return { data: await this.embed.startSession(key, origin, body.parentOrigin) };
  }

  @Post('models/uploads')
  @UseGuards(EmbedSessionGuard)
  @Throttle(UPLOAD_THROTTLE)
  async startUpload(
    @CurrentEmbedSession() session: EmbedSession,
    @Body() body: StartEmbedUploadDto,
  ) {
    try {
      return { data: await this.embed.startUpload(session, body) };
    } catch (error) {
      mapError(error);
    }
  }

  @Post('models/:id/complete')
  @UseGuards(EmbedSessionGuard)
  @Throttle(UPLOAD_THROTTLE)
  async completeUpload(
    @CurrentEmbedSession() session: EmbedSession,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CompleteEmbedUploadDto,
  ) {
    try {
      return { data: await this.embed.completeUpload(session, id, body.checksumSha256) };
    } catch (error) {
      mapError(error);
    }
  }

  /** Create a quote for an uploaded model and price it with the slicer. */
  @Post('quotes')
  @UseGuards(EmbedSessionGuard)
  @Throttle(PRICING_THROTTLE)
  async createQuote(
    @CurrentEmbedSession() session: EmbedSession,
    @Body() body: CreateEmbedQuoteDto,
  ) {
    const quote = await this.embed.createQuote(session, {
      modelFileId: body.modelFileId,
      printerId: body.printerId,
      materialId: body.materialId,
      quality: body.quality,
      quantity: body.quantity,
    });
    return { data: quote };
  }

  /** Change printer, material, quality or quantity and get the new price. */
  @Post('quotes/:id/price')
  @UseGuards(EmbedSessionGuard)
  @Throttle(PRICING_THROTTLE)
  async repriceQuote(
    @CurrentEmbedSession() session: EmbedSession,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: EmbedQuoteChoicesDto,
  ) {
    const quote = await this.embed.repriceQuote(session, id, {
      printerId: body.printerId,
      materialId: body.materialId,
      quality: body.quality,
      quantity: body.quantity,
    });
    return { data: quote };
  }

  /** Order at the price shown: creates the visitor's customer record and the shop's order. */
  @Post('quotes/:id/order')
  @UseGuards(EmbedSessionGuard)
  @Throttle(ORDER_THROTTLE)
  async placeOrder(
    @CurrentEmbedSession() session: EmbedSession,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: PlaceEmbedOrderDto,
  ) {
    const quote = await this.embed.placeOrder(session, id, body.expectedTotalCents, {
      name: body.name,
      ...(body.email !== undefined ? { email: body.email } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    });
    return { data: quote };
  }
}
