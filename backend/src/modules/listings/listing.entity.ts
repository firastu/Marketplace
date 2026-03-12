import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Category } from '../categories/category.entity';
import { ListingImage } from './listing-image.entity';

@Entity('listings')
export class Listing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'category_id' })
  categoryId: string;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ length: 200 })
  title: string;

  @Column({ length: 250 })
  slug: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  price: number;

  @Column({ length: 3, default: 'EUR' })
  currency: string;

  @Column({ length: 20, default: 'used' })
  condition: string;

  @Column({ length: 20, default: 'active' })
  status: string;

  @Column({ name: 'location_city', length: 100, nullable: true })
  locationCity: string;

  @Column({ name: 'location_zip', length: 20, nullable: true })
  locationZip: string;

  @Column({ name: 'location_lat', type: 'double precision', nullable: true })
  locationLat: number;

  @Column({ name: 'location_lng', type: 'double precision', nullable: true })
  locationLng: number;

  @Column({ name: 'views_count', default: 0 })
  viewsCount: number;

  @Column({ name: 'is_negotiable', default: true })
  isNegotiable: boolean;

  @Column({ name: 'is_shipping_available', default: false })
  isShippingAvailable: boolean;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date;

  @OneToMany(() => ListingImage, (img) => img.listing, { cascade: true })
  images: ListingImage[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
