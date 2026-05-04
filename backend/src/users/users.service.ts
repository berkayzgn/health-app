import { ConflictException, Injectable } from '@nestjs/common';
import { normalizeSubscriptionPlan } from '../subscription/plan-limits';
import { PrismaService } from '../prisma/prisma.service';
import {
  userProfileInclude,
  userToProfileResponse,
  type ProfileResponseBody,
  type UserWithProfileRelations,
} from './profile-mapper';

function splitConditionPayload(conditionTypes: string[]): {
  catalogCodes: string[];
} {
  const catalogCodes: string[] = [];
  for (const raw of conditionTypes) {
    if (!raw || raw === 'none') continue;
    if (raw.startsWith('other:')) continue;
    catalogCodes.push(raw);
  }
  return {
    catalogCodes: [...new Set(catalogCodes)],
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findById(id: string): Promise<UserWithProfileRelations | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: userProfileInclude,
    });
  }

  async create(data: {
    email: string;
    password: string;
    name: string;
  }) {
    return this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        password: data.password,
        name: data.name,
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      email: string;
      conditionTypes: string[];
      subscriptionPlan: string;
    }>,
  ): Promise<ProfileResponseBody | null> {
    const { conditionTypes, subscriptionPlan, ...scalarFields } = data;
    const trimmedName =
      scalarFields.name !== undefined ? scalarFields.name.trim() : undefined;
    const normalizedEmail =
      scalarFields.email !== undefined
        ? scalarFields.email.toLowerCase().trim()
        : undefined;

    if (normalizedEmail !== undefined) {
      const taken = await this.prisma.user.findFirst({
        where: { email: normalizedEmail, NOT: { id } },
      });
      if (taken) {
        throw new ConflictException(
          'This email address is already in use.',
        );
      }
    }

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const userPatch: {
          name?: string;
          email?: string;
          subscriptionPlan?: string;
        } = {};
        if (trimmedName !== undefined) userPatch.name = trimmedName;
        if (normalizedEmail !== undefined) userPatch.email = normalizedEmail;
        if (subscriptionPlan !== undefined) {
          userPatch.subscriptionPlan = normalizeSubscriptionPlan(subscriptionPlan);
        }
        if (Object.keys(userPatch).length > 0) {
          await tx.user.update({
            where: { id },
            data: userPatch,
          });
        }

        if (conditionTypes !== undefined) {
          await tx.userMedicalCondition.deleteMany({
            where: { userId: id },
          });

          const { catalogCodes } = splitConditionPayload(conditionTypes);

          for (const code of catalogCodes) {
            const cond = await tx.medicalCondition.findUnique({
              where: { code },
            });
            if (cond) {
              await tx.userMedicalCondition.create({
                data: {
                  userId: id,
                  conditionId: cond.id,
                },
              });
            }
          }
        }

        return tx.user.findUnique({
          where: { id },
          include: userProfileInclude,
        });
      });

      if (!updated) return null;
      return userToProfileResponse(updated);
    } catch {
      return null;
    }
  }

  async removeAccount(userId: string): Promise<void> {
    await this.prisma.user.delete({ where: { id: userId } });
  }
}
