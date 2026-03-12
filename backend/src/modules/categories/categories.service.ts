import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Category } from './category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepo: Repository<Category>,
  ) {}

  async findAll(): Promise<Category[]> {
    return this.categoriesRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
      relations: ['children'],
    });
  }

  async findRoots(): Promise<Category[]> {
    return this.categoriesRepo.find({
      where: { parentId: IsNull(), isActive: true },
      order: { sortOrder: 'ASC' },
      relations: ['children'],
    });
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return this.categoriesRepo.findOne({
      where: { slug, isActive: true },
      relations: ['children', 'parent'],
    });
  }
}
