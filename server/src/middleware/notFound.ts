import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

export const notFound = (req: Request, _res: Response, next: NextFunction): void => {
  const error = new AppError(`Not found - ${req.originalUrl}`, 404);
  next(error);
};
