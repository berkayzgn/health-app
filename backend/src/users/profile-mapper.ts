import type { Prisma } from '@prisma/client';
import { normalizeSubscriptionPlan } from '../subscription/plan-limits';

export type ProfileResponseBody = {
  id: string;
  email: string;
  name: string;
  conditionTypes: string[];
  subscriptionPlan: string;
  createdAt: Date;
  updatedAt: Date;
};

export const userProfileInclude = {
  medicalConditions: { include: { condition: true } },
} satisfies Prisma.UserInclude;

export type UserWithProfileRelations = Prisma.UserGetPayload<{
  include: typeof userProfileInclude;
}>;

export function userToProfileResponse(
  user: UserWithProfileRelations,
): ProfileResponseBody {
  const conditionTypes: string[] = user.medicalConditions.map(
    (m) => m.condition.code,
  );

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    conditionTypes,
    subscriptionPlan: normalizeSubscriptionPlan(user.subscriptionPlan),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
