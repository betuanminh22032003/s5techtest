import { Request, Response, NextFunction } from 'express';
import { resourceService } from '../services';
import { ResourceFilterOptions, ResourceStatus, Resource } from '../models';
import { successResponse } from '../utils';

/**
 * Resource Controller
 * Handles HTTP request/response for resource operations
 */
export class ResourceController {
  /**
   * Create a new resource
   * POST /resources
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resource = await resourceService.create(req.body);
      res.status(201).json(successResponse(resource, 'Resource created successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all resources with filters
   * GET /resources
   */
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters: ResourceFilterOptions = {
        name: req.query.name as string,
        category: req.query.category as string,
        status: req.query.status as ResourceStatus,
        search: req.query.search as string,
        sortBy: req.query.sortBy as keyof Resource,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      };

      // Remove undefined values
      Object.keys(filters).forEach((key) => {
        if (filters[key as keyof ResourceFilterOptions] === undefined) {
          delete filters[key as keyof ResourceFilterOptions];
        }
      });

      const result = await resourceService.findAll(filters);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a resource by ID
   * GET /resources/:id
   */
  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resource = await resourceService.getById(req.params.id);
      res.json(successResponse(resource));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a resource
   * PUT /resources/:id
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resource = await resourceService.update(req.params.id, req.body);
      res.json(successResponse(resource, 'Resource updated successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a resource
   * DELETE /resources/:id
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await resourceService.delete(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export const resourceController = new ResourceController();
