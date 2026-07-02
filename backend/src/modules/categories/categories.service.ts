import { prisma } from '../../config/prisma';
import { cacheWrap, cacheDel } from '../../config/redis';
import { AppError } from '../../utils/http';
import { slugify } from '../../utils/slug';
import { CreateCategoryInput } from './categories.schema';

const CATEGORIES_CACHE_KEY = 'categories:all';
const CATEGORIES_CACHE_TTL = 120; // seconds

function serializeCategory(c: any) {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    icon: c.icon ?? null,
    color: c.color ?? null,
    createdAt: c.createdAt,
    pollCount: c._count?.polls ?? 0,
  };
}

/** List all categories (name-ordered) with poll counts, cached in Redis. */
export async function listCategories() {
  return cacheWrap(CATEGORIES_CACHE_KEY, CATEGORIES_CACHE_TTL, async () => {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { polls: true } } },
    });
    return categories.map(serializeCategory);
  });
}

/** Create a custom category; slug must be unique. Invalidates the list cache. */
export async function createCategory(input: CreateCategoryInput) {
  const slug = slugify(input.name);

  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) throw AppError.conflict('A category with this name already exists');

  const category = await prisma.category.create({
    data: { name: input.name, slug, icon: input.icon ?? null, color: input.color ?? null },
    include: { _count: { select: { polls: true } } },
  });

  await cacheDel(CATEGORIES_CACHE_KEY);
  return serializeCategory(category);
}
