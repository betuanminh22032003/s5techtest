'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input, Textarea, Select } from '@/components/ui';
import { Resource, CreateResourceDto, UpdateResourceDto, ResourceStatus } from '@/types';

interface ResourceFormProps {
  resource?: Resource | null;
  onSubmit: (data: CreateResourceDto | UpdateResourceDto) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
];

export function ResourceForm({
  resource,
  onSubmit,
  onCancel,
  loading = false,
}: ResourceFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    status: 'active' as ResourceStatus,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (resource) {
      setFormData({
        name: resource.name,
        description: resource.description || '',
        category: resource.category || '',
        status: resource.status,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        category: '',
        status: 'active',
      });
    }
  }, [resource]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > 255) {
      newErrors.name = 'Name must be less than 255 characters';
    }

    if (formData.description && formData.description.length > 2000) {
      newErrors.description = 'Description must be less than 2000 characters';
    }

    if (formData.category && formData.category.length > 100) {
      newErrors.category = 'Category must be less than 100 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const data: CreateResourceDto | UpdateResourceDto = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      category: formData.category.trim() || undefined,
      status: formData.status,
    };

    await onSubmit(data);
  };

  const isEditing = !!resource;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Name *"
        name="name"
        value={formData.name}
        onChange={handleChange}
        placeholder="Enter resource name"
        error={errors.name}
        disabled={loading}
      />

      <Textarea
        label="Description"
        name="description"
        value={formData.description}
        onChange={handleChange}
        placeholder="Enter description"
        rows={3}
        error={errors.description}
        disabled={loading}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          placeholder="e.g., general, tech"
          error={errors.category}
          disabled={loading}
        />

        <Select
          label="Status"
          name="status"
          value={formData.status}
          onChange={handleChange}
          options={statusOptions}
          disabled={loading}
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : isEditing ? 'Update Resource' : 'Create Resource'}
        </Button>
        {isEditing && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
