import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Category } from "./category.entity";

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepo: Repository<Category>,
  ) {}

  async findAll(): Promise<Category[]> {
    return this.categoriesRepo.find({
      where: { isActive: true },
      order: { sortOrder: "ASC" },
      relations: ["children"],
    });
  }

  async findRoots(): Promise<Category[]> {
    // Deactivated subcategories must not be offered either; the plain
    // `relations: ["children"]` loaded all of them, in no particular order.
    return this.categoriesRepo
      .createQueryBuilder("category")
      .leftJoinAndSelect("category.children", "child", "child.isActive = true")
      .where("category.parentId IS NULL")
      .andWhere("category.isActive = true")
      .orderBy("category.sortOrder", "ASC")
      .addOrderBy("category.name", "ASC")
      .addOrderBy("child.sortOrder", "ASC")
      .addOrderBy("child.name", "ASC")
      .getMany();
  }

  async findBySlug(slug: string): Promise<Category> {
    const category = await this.categoriesRepo
      .createQueryBuilder("category")
      .leftJoinAndSelect("category.children", "child", "child.isActive = true")
      .leftJoinAndSelect("category.parent", "parent")
      .where("category.slug = :slug", { slug })
      .andWhere("category.isActive = true")
      .orderBy("child.sortOrder", "ASC")
      .addOrderBy("child.name", "ASC")
      .getOne();
    // Returning null made Nest answer 200 with an empty body.
    if (!category) throw new NotFoundException("Category not found");
    return category;
  }
}
