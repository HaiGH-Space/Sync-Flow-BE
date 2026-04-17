import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";
import cookieParser from "cookie-parser";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppConfigService } from "./config/config.service";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(AppConfigService);
  app.useGlobalPipes(
    new ValidationPipe({
      stopAtFirstError: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor());
  const config = new DocumentBuilder()
    .setTitle("Sync Flow API")
    .setDescription("The Sync Flow API")
    .setVersion("1.0")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  app.use(cookieParser());
  app.enableCors({
    origin: configService.corsOrigins,
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    allowedHeaders: "Content-Type, Accept, Authorization",
  });
  app.use(
    "/docs",
    apiReference({
      content: document,
    }),
  );
  if (process.env.NODE_ENV === "production") {
    console.log("Running in production mode, binding to all interfaces");
    await app.listen(configService.port || 3000, "0.0.0.0");
  } else {
    await app.listen(configService.port || 3000);
  }
}
void bootstrap();
