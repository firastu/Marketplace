import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthUser } from "../auth/jwt.strategy";
import { Roles, RolesGuard } from "../auth/roles.guard";
import { PaginationDto } from "../../common";
import { ModerationService } from "./moderation.service";
import {
  ListReportsQueryDto,
  OptionalReasonDto,
  RequiredReasonDto,
  UpdateReportDto,
} from "./dto/moderation.dto";

/** Moderation area: admins and moderators only. */
@ApiTags("Moderation")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles("admin", "moderator")
@Controller("admin")
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Get("stats")
  @ApiOperation({ summary: "Counts for the moderation dashboard" })
  stats() {
    return this.moderation.stats();
  }

  @Get("reports")
  @ApiOperation({ summary: "Reports queue" })
  reports(@Query() query: ListReportsQueryDto) {
    return this.moderation.listReports(query);
  }

  @Patch("reports/:id")
  @ApiOperation({
    summary: "Mark a report under review, resolved or dismissed",
  })
  updateReport(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateReportDto,
  ) {
    return this.moderation.updateReport(actor, id, dto);
  }

  @Get("listings/pending")
  @ApiOperation({
    summary: "Listings held for review (matched prohibited terms)",
  })
  pending(@Query() query: PaginationDto) {
    return this.moderation.pendingListings(query.page, query.limit);
  }

  @Post("listings/:id/approve")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Publish a listing that was held for review" })
  approve(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: OptionalReasonDto,
  ) {
    return this.moderation.approveListing(actor, id, dto.reason ?? dto.note);
  }

  @Post("listings/:id/remove")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Remove a listing (resolves its open reports)" })
  remove(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RequiredReasonDto,
  ) {
    return this.moderation.removeListing(actor, id, dto.reason);
  }

  @Post("listings/:id/restore")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Restore a removed listing" })
  restore(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: OptionalReasonDto,
  ) {
    return this.moderation.restoreListing(actor, id, dto.reason ?? dto.note);
  }

  @Post("users/:id/suspend")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Suspend an account (hides its listings, signs it out)",
  })
  suspend(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RequiredReasonDto,
  ) {
    return this.moderation.suspendUser(actor, id, dto.reason);
  }

  @Post("users/:id/reactivate")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reactivate a suspended account" })
  reactivate(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: OptionalReasonDto,
  ) {
    return this.moderation.reactivateUser(actor, id, dto.reason ?? dto.note);
  }

  @Get("actions")
  @ApiOperation({ summary: "Moderation log, newest first" })
  actions(@Query() query: PaginationDto) {
    return this.moderation.listActions(query.page, query.limit);
  }
}
