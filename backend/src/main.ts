import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  app.setGlobalPrefix("api");
  // whitelist + forbidNonWhitelisted: field ngoài hợp đồng (ví dụ trang_thai gửi vào PATCH hồ sơ) bị từ chối.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableCors({ origin: config.get<string>("WEB_ORIGIN", "http://localhost:3000") });
  const port = Number(config.get<string>("API_PORT", "3001"));
  await app.listen(port, "127.0.0.1");
}

void bootstrap();
