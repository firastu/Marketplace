import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, In, Repository } from "typeorm";
import {
  Listing,
  PENDING_REVIEW,
  PUBLIC_STATUSES,
} from "../listings/listing.entity";
import { User } from "../users/user.entity";
import { toPublicUser } from "../users/user-views";
import { MessagesGateway } from "../messages/messages.gateway";
import { MailService } from "../mail/mail.service";
import { ConfigService } from "@nestjs/config";
import { paginate, PaginatedResult } from "../../common";
import { OPEN_REPORT_STATUSES, Report, ReportTarget } from "./report.entity";
import {
  ModerationAction,
  ModerationActionType,
} from "./moderation-action.entity";
import {
  CreateReportDto,
  ListReportsQueryDto,
  UpdateReportDto,
} from "./dto/moderation.dto";

export const STAFF_ROLES = ["admin", "moderator"];

export interface Actor {
  id: string;
  role: string;
}

const staffView = (user: User | null | undefined) =>
  user ? { ...toPublicUser(user), isActive: user.isActive } : null;

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Report) private readonly reports: Repository<Report>,
    @InjectRepository(ModerationAction)
    private readonly actions: Repository<ModerationAction>,
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly gateway: MessagesGateway,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  /* ── reports from users ───────────────────────────────────────────── */

  async createReport(reporter: Actor, dto: CreateReportDto) {
    if (dto.targetType === "listing") {
      const listing = await this.listings.findOne({
        where: { id: dto.targetId },
        relations: ["user"],
      });
      const visible =
        !!listing &&
        PUBLIC_STATUSES.includes(listing.status) &&
        !!listing.user?.isActive;
      if (!listing || !visible)
        throw new NotFoundException("Listing not found");
      if (listing.userId === reporter.id) {
        throw new BadRequestException("You can't report your own listing");
      }
    } else {
      const user = await this.users.findOne({ where: { id: dto.targetId } });
      if (!user || user.deletedAt)
        throw new NotFoundException("User not found");
      if (user.id === reporter.id) {
        throw new BadRequestException("You can't report yourself");
      }
    }

    const existing = await this.reports.findOne({
      where: {
        reporterId: reporter.id,
        targetType: dto.targetType,
        targetId: dto.targetId,
        status: In(OPEN_REPORT_STATUSES),
      },
    });
    if (existing) throw new ConflictException("You have already reported this");

    const saved = await this.reports.save(
      this.reports.create({
        reporterId: reporter.id,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        details: dto.details || null,
      }),
    );
    return {
      id: saved.id,
      targetType: saved.targetType,
      targetId: saved.targetId,
      reason: saved.reason,
      status: saved.status,
      createdAt: saved.createdAt,
    };
  }

  /* ── staff views ───────────────────────────────────────────────────── */

  async stats() {
    const [openReports, pendingListings] = await Promise.all([
      this.reports.count({ where: { status: In(OPEN_REPORT_STATUSES) } }),
      this.listings.count({ where: { status: PENDING_REVIEW } }),
    ]);
    return { openReports, pendingListings };
  }

  async listReports(
    query: ListReportsQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const { page = 1, limit = 20, status = "open" } = query;
    const [rows, total] = await this.reports.findAndCount({
      where: status === "all" ? {} : { status },
      relations: ["reporter"],
      order: { createdAt: status === "open" ? "ASC" : "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    const listingIds = rows
      .filter((r) => r.targetType === "listing")
      .map((r) => r.targetId);
    const listings = listingIds.length
      ? await this.listings.find({
          where: { id: In(listingIds) },
          relations: ["user"],
          withDeleted: true,
        })
      : [];
    const userIds = rows
      .filter((r) => r.targetType === "user")
      .map((r) => r.targetId);
    const users = userIds.length
      ? await this.users.find({ where: { id: In(userIds) } })
      : [];

    const targets = [
      ...new Set(rows.map((r) => `${r.targetType}:${r.targetId}`)),
    ];
    const openCounts = new Map<string, number>();
    if (targets.length) {
      const counts: { key: string; count: string }[] = await this.reports
        .createQueryBuilder("r")
        .select("r.target_type || ':' || r.target_id", "key")
        .addSelect("COUNT(*)", "count")
        .where("r.target_type || ':' || r.target_id IN (:...targets)", {
          targets,
        })
        .andWhere("r.status IN (:...open)", { open: OPEN_REPORT_STATUSES })
        .groupBy("r.target_type, r.target_id")
        .getRawMany();
      counts.forEach((c) => openCounts.set(c.key, Number(c.count)));
    }

    const data = rows.map((r) => {
      const listing =
        r.targetType === "listing"
          ? listings.find((l) => l.id === r.targetId)
          : null;
      const user =
        r.targetType === "listing"
          ? listing?.user
          : users.find((u) => u.id === r.targetId);
      return {
        id: r.id,
        targetType: r.targetType,
        targetId: r.targetId,
        reason: r.reason,
        details: r.details,
        status: r.status,
        createdAt: r.createdAt,
        reporter: r.reporter ? toPublicUser(r.reporter) : null,
        listing: listing
          ? {
              id: listing.id,
              title: listing.title,
              status: listing.status,
              userId: listing.userId,
              deletedAt: listing.deletedAt,
            }
          : null,
        user: staffView(user),
        openReportsOnTarget:
          openCounts.get(`${r.targetType}:${r.targetId}`) ?? 0,
        resolutionNote: r.resolutionNote,
        resolvedAt: r.resolvedAt,
      };
    });
    return paginate(data, total, page, limit);
  }

  async pendingListings(page = 1, limit = 20) {
    const [rows, total] = await this.listings.findAndCount({
      where: { status: PENDING_REVIEW },
      relations: ["user", "images", "category"],
      order: { createdAt: "ASC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    const data = rows.map((l) => ({
      id: l.id,
      title: l.title,
      description: l.description,
      price: l.price,
      currency: l.currency,
      status: l.status,
      moderationFlags: l.moderationFlags,
      category: l.category
        ? {
            id: l.category.id,
            name: l.category.name,
            nameAr: l.category.nameAr,
          }
        : null,
      images: (l.images ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
      user: staffView(l.user),
    }));
    return paginate(data, total, page, limit);
  }

  async listActions(page = 1, limit = 20) {
    const [rows, total] = await this.actions.findAndCount({
      relations: ["moderator"],
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    const data = rows.map((a) => ({
      id: a.id,
      action: a.action,
      targetType: a.targetType,
      targetId: a.targetId,
      reason: a.reason,
      reportId: a.reportId,
      createdAt: a.createdAt,
      moderator: a.moderator ? toPublicUser(a.moderator) : null,
    }));
    return paginate(data, total, page, limit);
  }

  /* ── decisions ─────────────────────────────────────────────────────── */

  async updateReport(actor: Actor, id: string, dto: UpdateReportDto) {
    const report = await this.reports.findOne({ where: { id } });
    if (!report) throw new NotFoundException("Report not found");
    const closing = dto.status === "resolved" || dto.status === "dismissed";

    await this.dataSource.transaction(async (em) => {
      await em.update(Report, id, {
        status: dto.status,
        resolutionNote: dto.note ?? report.resolutionNote,
        resolvedBy: closing ? actor.id : null,
        resolvedAt: closing ? new Date() : null,
      });
      if (closing) {
        await this.log(
          em,
          actor,
          dto.status === "resolved" ? "resolve_report" : "dismiss_report",
          "report",
          id,
          dto.note,
          id,
        );
      }
    });
    return this.reports.findOneOrFail({ where: { id } });
  }

  async approveListing(actor: Actor, id: string, note?: string) {
    const listing = await this.findListing(id);
    if (listing.status !== PENDING_REVIEW) {
      throw new BadRequestException(
        "Only listings held for review can be approved",
      );
    }
    await this.dataSource.transaction(async (em) => {
      await em.update(Listing, id, { status: "active" });
      await this.log(em, actor, "approve_listing", "listing", id, note);
    });
    return this.findListing(id);
  }

  async removeListing(actor: Actor, id: string, reason: string) {
    const listing = await this.findListing(id);
    await this.assertMayActOn(actor, listing.user);
    if (listing.status === "removed") {
      throw new BadRequestException("This listing is already removed");
    }
    await this.dataSource.transaction(async (em) => {
      await em.update(Listing, id, { status: "removed" });
      await this.log(em, actor, "remove_listing", "listing", id, reason);
      await this.closeOpenReports(em, actor, "listing", id, reason);
    });
    await this.notify(listing.user, "listing_removed", reason, listing.title);
    return this.findListing(id);
  }

  async restoreListing(actor: Actor, id: string, reason?: string) {
    const listing = await this.findListing(id);
    if (listing.status !== "removed") {
      throw new BadRequestException("Only removed listings can be restored");
    }
    await this.dataSource.transaction(async (em) => {
      await em.update(Listing, id, { status: "active" });
      await this.log(em, actor, "restore_listing", "listing", id, reason);
    });
    await this.notify(listing.user, "listing_restored", reason, listing.title);
    return this.findListing(id);
  }

  async suspendUser(actor: Actor, id: string, reason: string) {
    const user = await this.findUser(id);
    await this.assertMayActOn(actor, user);
    if (!user.isActive)
      throw new BadRequestException("This account is already suspended");
    await this.dataSource.transaction(async (em) => {
      await em.update(User, id, { isActive: false });
      await this.log(em, actor, "suspend_user", "user", id, reason);
      await this.closeOpenReports(em, actor, "user", id, reason);
    });
    this.gateway.disconnectUser(id);
    await this.notify(user, "account_suspended", reason);
    return staffView(await this.findUser(id));
  }

  async reactivateUser(actor: Actor, id: string, reason?: string) {
    const user = await this.findUser(id);
    await this.assertMayActOn(actor, user);
    if (user.isActive)
      throw new BadRequestException("This account is not suspended");
    await this.dataSource.transaction(async (em) => {
      await em.update(User, id, { isActive: true });
      await this.log(em, actor, "reactivate_user", "user", id, reason);
    });
    await this.notify(user, "account_reactivated", reason);
    return staffView(await this.findUser(id));
  }

  /* ── helpers ───────────────────────────────────────────────────────── */

  /**
   * Statement of reasons to the affected user (EU Digital Services Act,
   * Art. 17): what was decided, why, and how to contest it. Bilingual,
   * like the password-reset email.
   */
  private async notify(
    user: User | null | undefined,
    kind:
      | "listing_removed"
      | "listing_restored"
      | "account_suspended"
      | "account_reactivated",
    reason?: string | null,
    listingTitle?: string,
  ) {
    if (!user || user.deletedAt) return;
    const appUrl = (
      this.config.get<string>("APP_URL") || "http://localhost:3000"
    ).replace(/\/$/, "");
    const name = user.displayName || user.username;
    const title = listingTitle ? `«${listingTitle}»` : "";
    const texts = {
      listing_removed: {
        subject: "تمت إزالة إعلانك · Your listing was removed",
        ar: `أزال فريق الإشراف إعلانك ${title} لأنه يخالف قواعد المنصة.`,
        en: `Our moderators removed your listing ${title} because it breaks the site rules.`,
      },
      listing_restored: {
        subject: "أُعيد نشر إعلانك · Your listing is back online",
        ar: `أعاد فريق الإشراف نشر إعلانك ${title}.`,
        en: `Our moderators restored your listing ${title}.`,
      },
      account_suspended: {
        subject: "تم إيقاف حسابك · Your account was suspended",
        ar: "أوقف فريق الإشراف حسابك لأنه يخالف قواعد المنصة. لن تظهر إعلاناتك ولا يمكنك تسجيل الدخول.",
        en: "Our moderators suspended your account because it breaks the site rules. Your listings are hidden and you can't log in.",
      },
      account_reactivated: {
        subject: "أُعيد تفعيل حسابك · Your account was reactivated",
        ar: "أعاد فريق الإشراف تفعيل حسابك، ويمكنك تسجيل الدخول من جديد.",
        en: "Our moderators reactivated your account; you can log in again.",
      },
    }[kind];
    const negative = kind === "listing_removed" || kind === "account_suspended";
    const lines = [
      `مرحبًا ${name}،`,
      "",
      texts.ar,
      ...(reason ? ["", `السبب: ${reason}`] : []),
      ...(negative
        ? [
            "",
            `قواعد المنصة: ${appUrl}/rules`,
            "إذا كنت ترى أن هذا القرار خاطئ، يمكنك الاعتراض عليه بالرد على هذه الرسالة.",
          ]
        : []),
      "",
      "────────",
      "",
      `Hello ${name},`,
      "",
      texts.en,
      ...(reason ? ["", `Reason: ${reason}`] : []),
      ...(negative
        ? [
            "",
            `Site rules: ${appUrl}/en/rules`,
            "If you think this decision is wrong, you can contest it by replying to this email.",
          ]
        : []),
    ];
    await this.mail.send({
      to: user.email,
      subject: texts.subject,
      text: lines.join("\n"),
    });
  }

  private async findListing(id: string): Promise<Listing> {
    const listing = await this.listings.findOne({
      where: { id },
      relations: ["user"],
    });
    if (!listing) throw new NotFoundException("Listing not found");
    return listing;
  }

  private async findUser(id: string): Promise<User> {
    const user = await this.users.findOne({ where: { id } });
    if (!user || user.deletedAt) throw new NotFoundException("User not found");
    return user;
  }

  /** Nobody acts on themselves; moderators can't act on admins. */
  private async assertMayActOn(actor: Actor, target: User | null | undefined) {
    if (!target) return;
    if (target.id === actor.id) {
      throw new ForbiddenException(
        "You can't take moderation actions on yourself",
      );
    }
    if (target.role === "admin" && actor.role !== "admin") {
      throw new ForbiddenException("Moderators can't take actions on admins");
    }
  }

  private async closeOpenReports(
    em: EntityManager,
    actor: Actor,
    targetType: ReportTarget,
    targetId: string,
    note: string,
  ) {
    await em.update(
      Report,
      { targetType, targetId, status: In(OPEN_REPORT_STATUSES) },
      {
        status: "resolved",
        resolutionNote: note,
        resolvedBy: actor.id,
        resolvedAt: new Date(),
      },
    );
  }

  private async log(
    em: EntityManager,
    actor: Actor,
    action: ModerationActionType,
    targetType: "listing" | "user" | "report",
    targetId: string,
    reason?: string | null,
    reportId?: string,
  ) {
    await em.save(
      ModerationAction,
      em.create(ModerationAction, {
        moderatorId: actor.id,
        action,
        targetType,
        targetId,
        reason: reason || null,
        reportId: reportId ?? null,
      }),
    );
    this.logger.log(
      `${actor.role} ${actor.id}: ${action} ${targetType} ${targetId}`,
    );
  }
}
