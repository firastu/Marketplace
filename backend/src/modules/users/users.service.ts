import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./user.entity";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  /** Case-insensitive, so "Ali@x.com" and "ali@x.com" are one account. */
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo
      .createQueryBuilder("user")
      .where("LOWER(user.email) = LOWER(:email)", { email })
      .getOne();
  }

  /** Only for credential checks: includes the normally hidden hash. */
  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepo
      .createQueryBuilder("user")
      .addSelect("user.passwordHash")
      .where("LOWER(user.email) = LOWER(:email)", { email })
      .getOne();
  }

  /** Only for password checks on the caller's own account. */
  async findByIdWithPassword(id: string): Promise<User> {
    const user = await this.usersRepo
      .createQueryBuilder("user")
      .addSelect("user.passwordHash")
      .where("user.id = :id", { id })
      .getOne();
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepo
      .createQueryBuilder("user")
      .where("LOWER(user.username) = LOWER(:username)", { username })
      .getOne();
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.usersRepo.create(data);
    const saved = await this.usersRepo.save(user);
    return this.findById(saved.id);
  }

  /** Invalidates every token issued so far for this account. */
  async bumpTokenVersion(id: string): Promise<User> {
    await this.usersRepo.increment({ id }, "tokenVersion", 1);
    return this.findById(id);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await this.findById(id); // throws if not found
    await this.usersRepo.update(id, data);
    return this.findById(id);
  }
}
