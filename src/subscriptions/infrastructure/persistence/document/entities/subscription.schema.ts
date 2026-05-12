import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SubscriptionDocument = SubscriptionSchemaClass & Document;

@Schema({ timestamps: true, versionKey: false })
export class SubscriptionSchemaClass {
  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, required: true })
  planId: string;

  @Prop({ type: String, required: true })
  planName: string;

  @Prop({ type: String, required: true })
  cycle: string;

  @Prop({ type: Number, required: true })
  price: number;

  @Prop({ type: Date, required: true })
  subscribedAt: Date;

  @Prop({ type: Date, required: true })
  expiredAt: Date;

  @Prop({ type: String, default: 'active' })
  status: string;

  @Prop({ timestamps: true })
  createdAt: Date;

  @Prop({ timestamps: true })
  updatedAt: Date;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;
}

export const SubscriptionSchema = SchemaFactory.createForClass(
  SubscriptionSchemaClass,
);
