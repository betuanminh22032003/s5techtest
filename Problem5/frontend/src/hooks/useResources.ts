'use client';

import { useState, useEffect, useCallback } from 'react';
import { resourceApi } from '@/lib/api';
import {
  Resource,
  CreateResourceDto,
  UpdateResourceDto,
  ResourceFilters,
  PaginatedResponse,
  Pagination,
} from '@/types';

interface UseResourcesState {
  resources: Resource[];
  pagination: Pagination | null;
  loading: boolean;
  error: string | null;
}

interface UseResourcesReturn extends UseResourcesState {
  fetchResources: (filters?: ResourceFilters) => Promise<void>;
  createResource: (data: CreateResourceDto) => Promise<Resource>;
  updateResource: (id: string, data: UpdateResourceDto) => Promise<Resource>;
  deleteResource: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for managing resources
 */
export function useResources(initialFilters: ResourceFilters = {}): UseResourcesReturn {
  const [state, setState] = useState<UseResourcesState>({
    resources: [],
    pagination: null,
    loading: true,
    error: null,
  });
  
  const [filters, setFilters] = useState<ResourceFilters>(initialFilters);

  const fetchResources = useCallback(async (newFilters?: ResourceFilters) => {
    const activeFilters = newFilters ?? filters;
    if (newFilters) {
      setFilters(newFilters);
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await resourceApi.getAll(activeFilters);
      setState({
        resources: response.data,
        pagination: response.pagination,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch resources',
      }));
    }
  }, [filters]);

  const createResource = async (data: CreateResourceDto): Promise<Resource> => {
    const resource = await resourceApi.create(data);
    await fetchResources();
    return resource;
  };

  const updateResource = async (id: string, data: UpdateResourceDto): Promise<Resource> => {
    const resource = await resourceApi.update(id, data);
    await fetchResources();
    return resource;
  };

  const deleteResource = async (id: string): Promise<void> => {
    await resourceApi.delete(id);
    await fetchResources();
  };

  const refetch = useCallback(() => fetchResources(), [fetchResources]);

  useEffect(() => {
    fetchResources();
  }, []);

  return {
    ...state,
    fetchResources,
    createResource,
    updateResource,
    deleteResource,
    refetch,
  };
}
