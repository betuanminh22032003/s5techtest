import { Resource, ResourceStatus } from '../entities';

// Re-export from entities
export { Resource, ResourceStatus };

/**
 * DTO for creating a resource
 */
export interface CreateResourceDto {
  name: string;
  description?: string;
  category?: string;
  status?: ResourceStatus;
  metadata?: Record<string, unknown>;
}

/**
 * DTO for updating a resource
 */
export interface UpdateResourceDto {
  name?: string;
  description?: string;
  category?: string;
  status?: ResourceStatus;
  metadata?: Record<string, unknown>;
}

/**
 * Filter options for listing resources
 */
export interface ResourceFilterOptions {
  name?: string;
  category?: string;
  status?: ResourceStatus;
  search?: string;
  sortBy?: keyof Resource;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
