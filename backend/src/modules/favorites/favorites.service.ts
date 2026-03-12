import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './favorite.entity';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoritesRepo: Repository<Favorite>,
  ) {}

  async addFavorite(userId: string, listingId: string): Promise<Favorite> {
    const existing = await this.favoritesRepo.findOne({
      where: { userId, listingId },
    });
    if (existing) throw new ConflictException('Already in favorites');
    const fav = this.favoritesRepo.create({ userId, listingId });
    return this.favoritesRepo.save(fav);
  }

  async removeFavorite(userId: string, listingId: string): Promise<void> {
    await this.favoritesRepo.delete({ userId, listingId });
  }

  async getUserFavorites(userId: string): Promise<Favorite[]> {
    return this.favoritesRepo.find({
      where: { userId },
      relations: ['listing', 'listing.images'],
      order: { createdAt: 'DESC' },
    });
  }
}
