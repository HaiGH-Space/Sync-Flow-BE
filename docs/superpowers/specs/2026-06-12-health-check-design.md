# Design Specification: Terminus-based Health Check Endpoint

This specification outlines the integration of a `/health` endpoint to monitor application liveness and database readiness.

## Background & Objective
For container orchestrators and load balancers to correctly probe the liveness and readiness of the `sync-flow` backend, the service needs to expose a standardized `/health` endpoint.
We use NestJS Terminus (`@nestjs/terminus`) to aggregate health indicators, specifically verifying database connectivity.

## Design Details

### 1. Custom Health Indicator (`src/modules/health/prisma.health.ts`)
Since Terminus does not have a built-in health check for Prisma, we implement a custom health indicator using the `PrismaService` which runs a query verification.

```typescript
import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        'Database connection failed',
        this.getStatus(key, false, { message: error.message }),
      );
    }
  }
}
```

### 2. Health Controller (`src/modules/health/health.controller.ts`)
Exposes the GET `/health` endpoint decorated with Swagger `@ApiTags('health')`.

```typescript
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check the health status of the application and database' })
  check() {
    return this.health.check([
      () => this.prismaHealth.isHealthy('database'),
    ]);
  }
}
```

### 3. Health Module (`src/modules/health/health.module.ts`)
Wires Terminus and the Prisma database module together.

```typescript
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './prisma.health';

@Module({
  imports: [TerminusModule, PrismaModule],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator],
})
export class HealthModule {}
```

### 4. Root Module (`src/app.module.ts`)
Import the `HealthModule` in `src/app.module.ts`.

---

## Verification Plan
1. **Compilation Check**: Run `pnpm.cmd build` to verify no compilation errors.
2. **E2E/Manual Check**: Start the app and query `GET http://localhost:3000/health`. Verify that it returns `200 OK` with:
   ```json
   {
     "status": "ok",
     "info": {
       "database": {
         "status": "up"
       }
     },
     "error": {},
     "details": {
       "database": {
         "status": "up"
       }
     }
   }
   ```
