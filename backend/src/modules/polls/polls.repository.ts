import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { pollInclude } from './poll.serializer';

/**
 * Data-access layer for polls. Keeps Prisma query construction in one place
 * so the service layer stays focused on business rules.
 */
export const pollsRepository = {
  findByIdOrSlug(idOrSlug: string) {
    return prisma.poll.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: pollInclude,
    });
  },

  findRaw(id: string) {
    return prisma.poll.findUnique({ where: { id } });
  },

  create(data: Prisma.PollCreateInput) {
    return prisma.poll.create({ data, include: pollInclude });
  },

  update(id: string, data: Prisma.PollUpdateInput) {
    return prisma.poll.update({ where: { id }, data, include: pollInclude });
  },

  delete(id: string) {
    return prisma.poll.delete({ where: { id } });
  },

  async list(where: Prisma.PollWhereInput, orderBy: Prisma.PollOrderByWithRelationInput[], skip: number, take: number) {
    const [items, total] = await Promise.all([
      prisma.poll.findMany({ where, orderBy, skip, take, include: pollInclude }),
      prisma.poll.count({ where }),
    ]);
    return { items, total };
  },
};
