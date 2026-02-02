import {
  Resource,
  CreateResourceDto,
  UpdateResourceDto,
  ResourceFilters,
  ApiResponse,
  PaginatedResponse,
} from '@/types';

const API_BASE = '/api/v1';

/**
 * Generic API fetch function
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  };

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Something went wrong');
  }

  return data;
}

/**
 * Resource API functions
 */
export const resourceApi = {
  /**
   * Get all resources with filters
   */
  async getAll(filters: ResourceFilters = {}): Promise<PaginatedResponse<Resource>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, String(value));
      }
    });

    const queryString = params.toString();
    const endpoint = `/resources${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetchApi<ApiResponse<PaginatedResponse<Resource>>>(endpoint);
    return response.data!;
  },

  /**
   * Get a single resource by ID
   */
  async getById(id: string): Promise<Resource> {
    const response = await fetchApi<ApiResponse<Resource>>(`/resources/${id}`);
    return response.data!;
  },

  /**
   * Create a new resource
   */
  async create(data: CreateResourceDto): Promise<Resource> {
    const response = await fetchApi<ApiResponse<Resource>>('/resources', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data!;
  },

  /**
   * Update a resource
   */
  async update(id: string, data: UpdateResourceDto): Promise<Resource> {
    const response = await fetchApi<ApiResponse<Resource>>(`/resources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data!;
  },

  /**
   * Delete a resource
   */
  async delete(id: string): Promise<void> {
    await fetch(`${API_BASE}/resources/${id}`, {
      method: 'DELETE',
    });
  },
};
