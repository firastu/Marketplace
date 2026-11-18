import { Body, Controller, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthUser } from "../auth/jwt.strategy";
import { WRITE_THROTTLE } from "../../common/throttle";
import { ModerationService } from "./moderation.service";
import { CreateReportDto } from "./dto/moderation.dto";

@ApiTags("Reports")
@ApiBearerAuth()
@Controller("reports")
export class ReportsController {
  constructor(private readonly moderation: ModerationService) {}

  @Throttle(WRITE_THROTTLE)
  @Post()
  @ApiOperation({ summary: "Report a listing or a user to the moderators" })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReportDto) {
    return this.moderation.createReport(user, dto);
  }
}
