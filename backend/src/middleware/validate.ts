import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodTypeAny } from 'zod';

type Source = 'body' | 'query' | 'params';

/**
 * Validate a request segment against a Zod schema, replacing it with the
 * parsed (and coerced) value so downstream handlers get typed, clean input.
 * Accepts plain objects and refined schemas (ZodEffects) alike.
 */
export function validate(schema: ZodTypeAny, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source]);
      // query/params are read-only getters in Express 5-ish setups; assign safely
      Object.assign(req[source] as object, parsed);
      next();
    } catch (err) {
      if (err instanceof ZodError) return next(err);
      next(err);
    }
  };
}
