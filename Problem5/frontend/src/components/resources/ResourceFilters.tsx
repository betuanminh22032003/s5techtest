'use client';

import React, { useState } from 'react';
import { Button, Input, Select } from '@/components/ui';
import { ResourceFilters, ResourceStatus } from '@/types';

interface ResourceFiltersProps {
  onApply: (filters: ResourceFilters) => void;
  onClear: () => void;
}

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
];

export function ResourceFiltersComponent({ onApply, onClear }: ResourceFiltersProps) {
  const [filters, setFilters] = useState<ResourceFilters>({
    search: '',
    status: undefined,
    category: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value || undefined }));
  };

  const handleApply = () => {
    onApply(filters);
  };

  const handleClear = () => {
    setFilters({ search: '', status: undefined, category: '' });
    onClear();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApply();
    }
  };

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-[200px]">
        <Input
          name="search"
          value={filters.search || ''}
          onChange={handleChange}
          onKeyDown={handleKeyPress}
          placeholder="Search by name or description..."
        />
      </div>
      
      <div className="w-40">
        <Select
          name="status"
          value={filters.status || ''}
          onChange={handleChange}
          options={statusOptions}
        />
      </div>
      
      <div className="w-40">
        <Input
          name="category"
          value={filters.category || ''}
          onChange={handleChange}
          onKeyDown={handleKeyPress}
          placeholder="Category"
        />
      </div>

      <Button onClick={handleApply}>Apply Filters</Button>
      <Button variant="outline" onClick={handleClear}>Clear</Button>
    </div>
  );
}
