import type { Prisma } from '@prisma/client';

export type ProfileResponseBody = {
  id: string;
  email: string;
  name: string;
  conditionTypes: string[];
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
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
