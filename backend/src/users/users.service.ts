import { Injectable } from '@nestjs/common';
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
      conditionTypes: string[];
    }>,
  ): Promise<ProfileResponseBody | null> {
    const { conditionTypes, ...scalarFields } = data;

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (scalarFields.name !== undefined) {
          await tx.user.update({
            where: { id },
            data: { name: scalarFields.name },
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
