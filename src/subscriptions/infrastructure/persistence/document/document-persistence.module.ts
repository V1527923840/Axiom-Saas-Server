import { Module } from '@nestjs/common';
import { SubscriptionRepository } from '../subscription.repository';
import { SubscriptionsDocumentRepository } from './repositories/subscription.repository';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SubscriptionSchema,
  SubscriptionSchemaClass,
} from './entities/subscription.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SubscriptionSchemaClass.name, schema: SubscriptionSchema },
    ]),
  ],
  providers: [
    {
      provide: SubscriptionRepository,
      useClass: SubscriptionsDocumentRepository,
    },
  ],
  exports: [SubscriptionRepository],
})
export class DocumentSubscriptionPersistenceModule {}
