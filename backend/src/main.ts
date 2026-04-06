import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Global prefix for all routes
  app.setGlobalPrefix("api");

  // Serve uploaded files statically
  app.useStaticAssets(join(process.cwd(), "uploads"), { prefix: "/uploads" });

  // Enable CORS for frontend
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger API docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Marketplace API")
    .setDescription(
      "REST + WebSocket API for the Marketplace application.\n\n" +
        "## Authentication\n" +
        "Most endpoints require a Bearer JWT token obtained via `POST /api/auth/login`.\n\n" +
        "## Real-time Messaging\n" +
        "Connect to the WebSocket namespace `/chat` (Socket.IO) with `{ auth: { token } }` for live message delivery.\n\n" +
        "**Socket events emitted by server:**\n" +
        "- `newMessage` — new message in a joined conversation room\n" +
        "- `conversationUpdated` — a conversation received a new message (for inbox)\n" +
        "- `unreadCountChanged` — unread badge should be refreshed\n\n" +
        "**Socket events the client can emit:**\n" +
        "- `joinConversation { conversationId }` — subscribe to live messages\n" +
        "- `leaveConversation { conversationId }` — unsubscribe",
    )
    .setVersion("0.2.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT", 3001);

  await app.listen(port);
  console.log(`🚀 Backend running on http://localhost:${port}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
}
bootstrap();
