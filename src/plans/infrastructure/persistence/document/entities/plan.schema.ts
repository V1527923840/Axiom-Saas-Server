import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PlanDocument = PlanSchemaClass & Document;

@Schema({ timestamps: true, versionKey: false })
export class PlanSchemaClass {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, default: 'Lv0' })
  tier: string;

  @Prop({ type: String, required: true })
  cycle: string;

  @Prop({ type: Number, default: 0 })
  pointsQuota: number;

  @Prop({ type: Number, default: 0 })
  chatQuota: number;

  @Prop({ type: Number, required: true })
  price: number;

  @Prop({ type: Number, default: null })
  promotionalPrice: number | null;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({ type: String, default: 'active' })
  status: string;

  @Prop({ timestamps: true })
  createdAt: Date;

  @Prop({ timestamps: true })
  updatedAt: Date;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;
}

export const PlanSchema = SchemaFactory.createForClass(PlanSchemaClass);
