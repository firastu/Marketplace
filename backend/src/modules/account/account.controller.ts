import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Res,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { CurrentUser } from "../auth/current-user.decorator";
import { AccountService } from "./account.service";
import {
  ChangePasswordDto,
  DeleteAccountDto,
  UpdateProfileDto,
} from "./dto/account.dto";

/** The logged-in user's own account (GDPR self-service). */
@ApiTags("Account")
@ApiBearerAuth()
@Controller("users/me")
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Patch()
  @ApiOperation({ summary: "Edit my profile (display name, bio, phone)" })
  update(@CurrentUser("id") userId: string, @Body() dto: UpdateProfileDto) {
    return this.account.updateProfile(userId, dto);
  }

  @Post("password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Change my password; signs out other sessions and returns a new token",
  })
  changePassword(
    @CurrentUser("id") userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.account.changePassword(userId, dto);
  }

  @Get("export")
  @ApiOperation({ summary: "Download all my data as JSON" })
  async export(
    @CurrentUser("id") userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="marketplace-data-${date}.json"`,
    );
    return this.account.exportData(userId);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete my account and erase my personal data" })
  async remove(
    @CurrentUser("id") userId: string,
    @Body() dto: DeleteAccountDto,
  ) {
    await this.account.deleteAccount(userId, dto);
    return { message: "Your account has been deleted." };
  }
}
