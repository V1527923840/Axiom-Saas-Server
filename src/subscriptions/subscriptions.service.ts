import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto';
import { NullableType } from '../utils/types/nullable.type';
import {
  FilterSubscriptionDto,
  SortSubscriptionDto,
} from './dto/query-subscription.dto';
import { SubscriptionRepository } from './infrastructure/persistence/subscription.repository';
import { Subscription } from './domain/subscription';
import { Plan } from '../plans/domain/plan';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { PlansService } from '../plans/plans.service';
import { UserRepository } from '../users/infrastructure/persistence/user.repository';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly subscriptionsRepository: SubscriptionRepository,
    private readonly plansService: PlansService,
    private readonly usersRepository: UserRepository,
  ) {}

  async create(
    createSubscriptionDto: CreateSubscriptionDto,
    userId: string,
  ): Promise<Subscription> {
    // Get plan details first
    const plan = await this.plansService.findById(createSubscriptionDto.planId);
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const now = new Date();
    const cycle = createSubscriptionDto.cycle || 'monthly';
    const months = cycle === 'yearly' ? 12 : 1;
    const expiredAt = new Date(now.setMonth(now.getMonth() + months));

    // Create the subscription
    const subscription = await this.subscriptionsRepository.create({
      userId: Number(userId),
      planId: createSubscriptionDto.planId,
      planName: plan.name,
      cycle: cycle,
      price: createSubscriptionDto.price ?? Number(plan.price),
      subscribedAt: new Date(),
      expiredAt: expiredAt,
      status: 'active',
    } as Omit<Subscription, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>);

    // Update user with new plan fields
    await this.usersRepository.update(userId, {
      currentPlanId: createSubscriptionDto.planId,
      tier: plan.tier,
      pointsBalance: plan.pointsQuota,
      chatQuotaTotal: plan.chatQuota,
      chatQuotaUsed: 0,
      subscriptionExpiredAt: expiredAt.toISOString(),
    });

    return subscription;
  }

  findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterSubscriptionDto | null;
    sortOptions?: SortSubscriptionDto[] | null;
    paginationOptions: IPaginationOptions;
  }) {
    return this.subscriptionsRepository.findManyWithPagination({
      filterOptions,
      sortOptions,
      paginationOptions,
    });
  }

  findById(id: Subscription['id']): Promise<NullableType<Subscription>> {
    return this.subscriptionsRepository.findById(id);
  }

  findByIds(ids: Subscription['id'][]): Promise<Subscription[]> {
    return this.subscriptionsRepository.findByIds(ids);
  }

  async findByUserId(userId: string) {
    return this.subscriptionsRepository.findByUserId(userId);
  }

  async getCurrentSubscription(userId: string): Promise<any> {
    const subscription = await this.subscriptionsRepository.findActiveByUserId(
      String(Number(userId)),
    );
    if (!subscription) {
      return {
        data: {
          subscriptionId: null,
          currentPlanId: null,
          currentPlanName: null,
          currentTier: null,
          pointsBalance: 0,
          pointsQuota: 0,
          chatQuotaUsed: 0,
          chatQuotaTotal: 0,
          subscriptionExpiredAt: null,
          status: 'no_subscription',
        },
      };
    }

    // Validate planId is a valid UUID format before querying
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let plan: Plan | null = null;
    if (subscription.planId && uuidRegex.test(subscription.planId)) {
      try {
        plan = await this.plansService.findById(subscription.planId);
      } catch {
        // Plan lookup failed, continue without plan details
        plan = null;
      }
    }

    // Get user details for balance and quota used
    const user = await this.usersRepository.findById(userId);

    return {
      data: {
        subscriptionId: subscription.id,
        currentPlanId: subscription.planId,
        currentPlanName: subscription.planName,
        currentTier: plan?.tier || null,
        pointsBalance: user?.pointsBalance || 0,
        pointsQuota: plan?.pointsQuota || 0,
        chatQuotaUsed: user?.chatQuotaUsed || 0,
        chatQuotaTotal: plan?.chatQuota || 0,
        subscriptionExpiredAt: subscription.expiredAt?.toISOString(),
        status: subscription.status,
      },
    };
  }

  async upgrade(
    upgradeSubscriptionDto: UpgradeSubscriptionDto,
    userId: string,
  ): Promise<any> {
    const currentSubscription =
      await this.subscriptionsRepository.findActiveByUserId(
        String(Number(userId)),
      );
    if (!currentSubscription) {
      throw new NotFoundException('No active subscription found');
    }

    // Validate planId is a valid UUID format before querying
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // Get current plan to compare tiers (if current planId is valid)
    let currentPlan: Plan | null = null;
    if (
      currentSubscription.planId &&
      uuidRegex.test(currentSubscription.planId)
    ) {
      try {
        currentPlan = await this.plansService.findById(
          currentSubscription.planId,
        );
      } catch {
        // Current plan lookup failed, continue without it
        currentPlan = null;
      }
    }

    // Get new plan
    const newPlan = await this.plansService.findById(
      upgradeSubscriptionDto.newPlanId,
    );

    if (!newPlan) {
      throw new NotFoundException('Plan not found');
    }

    // Parse tier levels for comparison (e.g., "Lv1", "Lv2")
    // If current plan not found, allow upgrade (assume Lv0)
    const currentTierNum = currentPlan ? this.parseTier(currentPlan.tier) : 0;
    const newTierNum = this.parseTier(newPlan.tier);

    // Prevent downgrade - new tier must be higher or equal
    if (newTierNum <= currentTierNum) {
      throw new BadRequestException(
        'Cannot downgrade to a lower or equal tier plan. Only upgrades are allowed.',
      );
    }

    const oldPlanId = currentSubscription.planId;
    const now = new Date();
    const months = currentSubscription.cycle === 'yearly' ? 12 : 1;
    const newExpiredAt = new Date(now.setMonth(now.getMonth() + months));

    // Terminate old subscription
    await this.subscriptionsRepository.update(currentSubscription.id, {
      status: 'terminated',
    });

    // Create new subscription
    const newSubscription = await this.subscriptionsRepository.create({
      userId: Number(userId),
      planId: upgradeSubscriptionDto.newPlanId,
      planName: newPlan.name,
      cycle: currentSubscription.cycle,
      price: upgradeSubscriptionDto.newPrice ?? Number(newPlan.price),
      subscribedAt: new Date(),
      expiredAt: newExpiredAt,
      status: 'active',
    } as Omit<Subscription, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>);

    // Update user with new plan info
    await this.usersRepository.update(userId, {
      currentPlanId: upgradeSubscriptionDto.newPlanId,
      tier: newPlan.tier,
      subscriptionExpiredAt: newExpiredAt.toISOString(),
      chatQuotaTotal: newPlan.chatQuota,
      pointsBalance: newPlan.pointsQuota,
    });

    return {
      data: {
        subscriptionId: newSubscription.id,
        oldPlanId: oldPlanId,
        newPlanId: upgradeSubscriptionDto.newPlanId,
        upgradedAt: new Date().toISOString(),
        newExpiredAt: newExpiredAt.toISOString(),
        status: 'active',
      },
    };
  }

  private parseTier(tier: string): number {
    // Parse tier string like "Lv0", "Lv1", "Lv2" to number
    const match = tier.match(/^Lv(\d+)$/i);
    return match ? parseInt(match[1], 10) : 0;
  }

  async remove(id: Subscription['id']): Promise<void> {
    await this.subscriptionsRepository.remove(id);
  }

  async deductPoints(userId: string, points: number): Promise<boolean> {
    if (points <= 0) {
      throw new BadRequestException('Points must be a positive number');
    }

    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if ((user.pointsBalance ?? 0) < points) {
      throw new BadRequestException('Insufficient points balance');
    }

    await this.usersRepository.update(userId, {
      pointsBalance: (user.pointsBalance ?? 0) - points,
    });
    return true;
  }

  async deductChatQuota(userId: string): Promise<boolean> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if ((user.chatQuotaUsed ?? 0) >= (user.chatQuotaTotal ?? 0)) {
      throw new BadRequestException('Chat quota exceeded');
    }

    await this.usersRepository.update(userId, {
      chatQuotaUsed: (user.chatQuotaUsed ?? 0) + 1,
    });
    return true;
  }

  async expireStaleSubscriptions(): Promise<number> {
    const now = new Date();

    // Find all active subscriptions that have expired
    const staleSubscriptionsResult =
      await this.subscriptionsRepository.findManyWithPagination({
        filterOptions: { status: 'active' },
        paginationOptions: { limit: 1000, page: 1 },
      });

    let expiredCount = 0;
    for (const subscription of staleSubscriptionsResult.data) {
      if (subscription.expiredAt && subscription.expiredAt < now) {
        await this.subscriptionsRepository.update(subscription.id, {
          status: 'expired',
        });
        expiredCount++;
      }
    }
    return expiredCount;
  }
}
