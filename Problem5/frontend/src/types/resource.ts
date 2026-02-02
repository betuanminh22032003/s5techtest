/**
 * Resource types for the application
 */

export type ResourceStatus = 'active' | 'inactive' | 'archived';

export interface Resource {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  status: ResourceStatus;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateResourceDto {
  name: string;
  description?: string;
  category?: string;
  status?: ResourceStatus;
  metadata?: Record<string, unknown>;
}

export interface UpdateResourceDto {
  name?: string;
  description?: string;
  category?: string;
  status?: ResourceStatus;
  metadata?: Record<string, unknown>;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ResourceFilters {
  search?: string;
  status?: ResourceStatus;
  category?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
