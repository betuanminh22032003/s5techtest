import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { AppDataSource } from '../database';
import { Resource, ResourceStatus } from '../entities';
import {
  CreateResourceDto,
  UpdateResourceDto,
  ResourceFilterOptions,
  PaginatedResponse,
} from '../models';
import { NotFoundError } from '../utils';

/**
 * Resource Service
 * Handles all business logic for resource operations using TypeORM
 */
export class ResourceService {
  private get repository(): Repository<Resource> {
    return AppDataSource.getRepository(Resource);
  }

  /**
   * Create a new resource
   */
  async create(dto: CreateResourceDto): Promise<Resource> {
    const resource = this.repository.create({
      name: dto.name,
      description: dto.description || null,
      category: dto.category || null,
      status: dto.status || ResourceStatus.ACTIVE,
      metadata: dto.metadata || null,
    });

    return this.repository.save(resource);
  }

  /**
   * Find a resource by ID
   */
  async findById(id: string): Promise<Resource | null> {
    return this.repository.findOneBy({ id });
  }

  /**
   * Get a resource by ID, throws if not found
   */
  async getById(id: string): Promise<Resource> {
    const resource = await this.findById(id);

    if (!resource) {
      throw new NotFoundError('Resource');
    }

    return resource;
  }

  /**
   * List resources with filters and pagination
   */
  async findAll(options: ResourceFilterOptions = {}): Promise<PaginatedResponse<Resource>> {
    const {
      name,
      category,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = options;

    // Build where conditions
    const where: FindOptionsWhere<Resource>[] = [];
    const baseConditions: FindOptionsWhere<Resource> = {};

    if (category) {
      baseConditions.category = category;
    }

    if (status) {
      baseConditions.status = status;
    }

    if (name) {
      baseConditions.name = Like(`%${name}%`);
    }

    if (search) {
      // Search in name OR description
      where.push(
        { ...baseConditions, name: Like(`%${search}%`) },
        { ...baseConditions, description: Like(`%${search}%`) }
      );
    } else {
      where.push(baseConditions);
    }

    // Map sortBy to proper column name
    const orderField = sortBy === 'createdAt' ? 'createdAt' : sortBy === 'updatedAt' ? 'updatedAt' : sortBy;

    // Get total count
    const total = await this.repository.count({ where });

    // Calculate pagination
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Get paginated results
    const data = await this.repository.find({
      where,
      order: { [orderField]: sortOrder.toUpperCase() as 'ASC' | 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Update a resource
   */
  async update(id: string, dto: UpdateResourceDto): Promise<Resource> {
    const resource = await this.getById(id);

    // Merge updates
    if (dto.name !== undefined) resource.name = dto.name;
    if (dto.description !== undefined) resource.description = dto.description;
    if (dto.category !== undefined) resource.category = dto.category;
    if (dto.status !== undefined) resource.status = dto.status;
    if (dto.metadata !== undefined) resource.metadata = dto.metadata;

    return this.repository.save(resource);
  }

  /**
   * Delete a resource
   */
  async delete(id: string): Promise<void> {
    const resource = await this.getById(id);
    await this.repository.remove(resource);
  }
}

// Export singleton instance
export const resourceService = new ResourceService();
