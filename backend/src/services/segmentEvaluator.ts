import { prisma } from '../config/config';
import { SegmentRules } from '@xeno/shared';

/**
 * Evaluates SegmentRules against the Customer database and returns matching Customer records.
 */
export async function evaluateSegment(rules: SegmentRules): Promise<any[]> {
  const whereClause: any = {};

  // 1. City Filter (Case-insensitive check mapped across the array)
  if (rules.cities && rules.cities.length > 0) {
    // We map to search case-insensitively. Since SQLite handles IN matches,
    // we fetch matching cities, or just filter in Prisma:
    whereClause.city = {
      in: rules.cities,
    };
  }

  // 2. Spend Filter
  if (rules.minSpend !== undefined || rules.maxSpend !== undefined) {
    whereClause.totalSpend = {};
    if (rules.minSpend !== undefined) {
      whereClause.totalSpend.gte = rules.minSpend;
    }
    if (rules.maxSpend !== undefined) {
      whereClause.totalSpend.lte = rules.maxSpend;
    }
  }

  // 3. Order Count Filter
  if (rules.minOrders !== undefined) {
    whereClause.totalOrders = {
      gte: rules.minOrders,
    };
  }

  // 4. Last Order Within Days Filter
  if (rules.lastOrderWithinDays !== undefined) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - rules.lastOrderWithinDays);
    whereClause.lastOrderDate = {
      gte: cutoffDate,
    };
  }

  // Fetch candidate customers from Prisma
  const candidates = await prisma.customer.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
  });

  // 5. In-Memory Filter for Tags (guarantees SQLite and Postgres cross-compatibility)
  if (rules.tagsInclude && rules.tagsInclude.length > 0) {
    return candidates.filter((customer) => {
      try {
        const customerTags = JSON.parse(customer.tags) as string[];
        // Check if all rules.tagsInclude exist in customerTags
        return rules.tagsInclude!.every((reqTag) =>
          customerTags.some((cTag) => cTag.toLowerCase() === reqTag.toLowerCase())
        );
      } catch (err) {
        // Fallback for comma-separated string tags
        const customerTags = customer.tags.split(',').map((t) => t.trim().toLowerCase());
        return rules.tagsInclude!.every((reqTag) =>
          customerTags.includes(reqTag.toLowerCase())
        );
      }
    });
  }

  return candidates;
}
