import 'reflect-metadata';

// OpenTelemetry auto-instrumentation (dev/prod via OTLP)
/* eslint-disable @typescript-eslint/no-var-requires */
if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  const { NodeSDK } = require('@opentelemetry/sdk-node');
  const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
  const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

  const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({ url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT }),
    instrumentations: [getNodeAutoInstrumentations()]
  });
  sdk.start();
  console.log('[OTel] Tracing enabled ->', process.env.OTEL_EXPORTER_OTLP_ENDPOINT);
}
/* eslint-enable @typescript-eslint/no-var-requires */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module';

// Filet de sécurité : depuis Node 15, un rejet de promesse non géré termine le process.
// Les opérations secondaires (persistance, publication d'événements) sont lancées sans await
// et ne doivent jamais pouvoir provoquer une interruption de service.
const processLogger = new Logger('Process');

process.on('unhandledRejection', (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  processLogger.error(`Rejet de promesse non géré : ${err.message}`, err.stack);
});

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: ['http://localhost:3001', 'http://127.0.0.1:3001'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true
    }
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
