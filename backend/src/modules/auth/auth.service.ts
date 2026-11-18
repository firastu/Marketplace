import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, LessThan, MoreThan, Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { createHash, randomBytes } from "crypto";
import { UsersService } from "../users/users.service";
import { User } from "../users/user.entity";
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from "./dto/auth.dto";
import { toSelfUser } from "../users/user-views";
import { PasswordResetToken } from "./password-reset-token.entity";
import { MailService } from "../mail/mail.service";
import { TERMS_VERSION } from "../../common/terms";

export const RESET_TOKEN_TTL_MINUTES = 60;
export const BCRYPT_ROUNDS = 10;

export const FORGOT_PASSWORD_MESSAGE =
  "If an account exists for this email, a reset link has been sent.";

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokens: Repository<PasswordResetToken>,
  ) {}

  async register(dto: RegisterDto) {
    const existingEmail = await this.usersService.findByEmail(dto.email);
    if (existingEmail) {
      throw new ConflictException("Email already registered");
    }

    const existingUsername = await this.usersService.findByUsername(
      dto.username,
    );
    if (existingUsername) {
      throw new ConflictException("Username already taken");
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.usersService.create({
      email: dto.email,
      username: dto.username,
      passwordHash: hashedPassword,
      termsAcceptedAt: new Date(),
      termsVersion: TERMS_VERSION,
      ...(dto.displayName ? { displayName: dto.displayName } : {}),
    });

    return { user: toSelfUser(user), accessToken: this.generateToken(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user || user.deletedAt) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Checked after the password so this doesn't reveal which emails exist.
    if (!user.isActive) {
      throw new ForbiddenException("This account has been deactivated");
    }

    const updated = await this.usersService.update(user.id, {
      lastLoginAt: new Date(),
    });
    return {
      user: toSelfUser(updated),
      accessToken: this.generateToken(updated),
    };
  }

  /**
   * Always resolves the same way, whether or not the email belongs to an
   * account, so the endpoint can't be used to find out who is registered.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (user && user.isActive && !user.deletedAt) {
      const token = randomBytes(32).toString("base64url");
      // One valid link at a time per account.
      await this.resetTokens.delete({ userId: user.id, usedAt: IsNull() });
      await this.resetTokens.save(
        this.resetTokens.create({
          userId: user.id,
          tokenHash: sha256(token),
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000),
        }),
      );
      await this.mail.send(this.resetEmail(user, token, dto.locale ?? "ar"));
    }
    return { message: FORGOT_PASSWORD_MESSAGE };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const record = await this.resetTokens.findOne({
      where: {
        tokenHash: sha256(dto.token),
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });
    const user = record
      ? await this.usersService.findById(record.userId).catch(() => null)
      : null;
    if (!record || !user || !user.isActive || user.deletedAt) {
      throw new BadRequestException(
        "This reset link is invalid or has expired",
      );
    }

    await this.setPassword(user.id, dto.password);
    await this.resetTokens.update(record.id, { usedAt: new Date() });
    await this.resetTokens.delete({ userId: user.id, usedAt: IsNull() });
    this.logger.log(`Password reset for user ${user.id}`);
    return { message: "Password updated. You can now log in." };
  }

  /**
   * Stores a new password and signs out every existing session by bumping
   * the account's token version (see isTokenCurrent).
   */
  async setPassword(userId: string, password: string): Promise<User> {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await this.usersService.update(userId, {
      passwordHash,
      passwordChangedAt: new Date(),
    });
    return this.usersService.bumpTokenVersion(userId);
  }

  /** Removes expired and used reset tokens (called by the retention job). */
  async purgeResetTokens(): Promise<number> {
    const expired = await this.resetTokens.delete({
      expiresAt: LessThan(new Date()),
    });
    const used = await this.resetTokens
      .createQueryBuilder()
      .delete()
      .where("used_at IS NOT NULL")
      .execute();
    return (expired.affected ?? 0) + (used.affected ?? 0);
  }

  generateToken(user: {
    id: string;
    email: string;
    role: string;
    tokenVersion?: number;
  }): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      tv: user.tokenVersion ?? 0,
    });
  }

  private resetEmail(user: User, token: string, locale: "ar" | "en") {
    const appUrl = (
      this.config.get<string>("APP_URL") || "http://localhost:3000"
    ).replace(/\/$/, "");
    const link = `${appUrl}${locale === "en" ? "/en" : ""}/reset-password?token=${token}`;
    const name = user.displayName || user.username;
    const text = [
      `مرحبًا ${name}،`,
      "",
      "طلبت إعادة تعيين كلمة المرور لحسابك. افتح الرابط التالي لاختيار كلمة مرور جديدة:",
      link,
      "",
      `الرابط صالح لمدة ${RESET_TOKEN_TTL_MINUTES} دقيقة ولمرة واحدة فقط.`,
      "إذا لم تطلب ذلك، تجاهل هذه الرسالة ولن يتغير شيء.",
      "",
      "────────",
      "",
      `Hello ${name},`,
      "",
      "You asked to reset the password of your account. Open this link to choose a new one:",
      link,
      "",
      `The link works once and expires in ${RESET_TOKEN_TTL_MINUTES} minutes.`,
      "If you didn't ask for this, ignore this email; nothing will change.",
    ].join("\n");
    return {
      to: user.email,
      subject: "إعادة تعيين كلمة المرور · Reset your password",
      text,
    };
  }
}
