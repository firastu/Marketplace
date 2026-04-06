import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from "typeorm";
import { User } from "../users/user.entity";
import { Listing } from "../listings/listing.entity";
import { Message } from "./message.entity";

@Entity("conversations")
@Unique(["listingId", "buyerId", "sellerId"])
export class Conversation {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "listing_id" })
  listingId: string;

  @ManyToOne(() => Listing)
  @JoinColumn({ name: "listing_id" })
  listing: Listing;

  @Column({ name: "buyer_id" })
  buyerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "buyer_id" })
  buyer: User;

  @Column({ name: "seller_id" })
  sellerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "seller_id" })
  seller: User;

  @Column({ name: "last_message_at", type: "timestamptz", nullable: true })
  lastMessageAt: Date;

  @OneToMany(() => Message, (msg) => msg.conversation)
  messages: Message[];

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
