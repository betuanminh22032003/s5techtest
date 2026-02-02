'use client';

import React from 'react';
import { Resource } from '@/types';
import { ResourceCard } from './ResourceCard';

interface ResourceListProps {
  resources: Resource[];
  loading: boolean;
  error: string | null;
  onEdit: (resource: Resource) => void;
  onDelete: (resource: Resource) => void;
}

export function ResourceList({
  resources,
  loading,
  error,
  onEdit,
  onDelete,
}: ResourceListProps) {
  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div>
        <p>Loading resources...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        <p className="text-lg">❌ {error}</p>
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-4xl mb-4">📭</p>
        <p className="text-lg">No resources found</p>
        <p className="text-sm">Create your first resource above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {resources.map((resource) => (
        <ResourceCard
          key={resource.id}
          resource={resource}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
