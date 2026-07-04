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

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module';

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
