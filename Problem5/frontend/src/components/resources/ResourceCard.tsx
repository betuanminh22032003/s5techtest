'use client';

import React from 'react';
import { Resource } from '@/types';
import { Button } from '@/components/ui';

interface ResourceCardProps {
  resource: Resource;
  onEdit: (resource: Resource) => void;
  onDelete: (resource: Resource) => void;
}

const statusColors = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-yellow-100 text-yellow-800',
  archived: 'bg-gray-100 text-gray-800',
};

export function ResourceCard({ resource, onEdit, onDelete }: ResourceCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {resource.name}
          </h3>
          
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            {resource.category && (
              <span className="flex items-center gap-1">
                📁 {resource.category}
              </span>
            )}
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                statusColors[resource.status]
              }`}
            >
              {resource.status}
            </span>
            <span>📅 {formatDate(resource.createdAt)}</span>
          </div>

          {resource.description && (
            <p className="mt-2 text-sm text-gray-600 line-clamp-2">
              {resource.description}
            </p>
          )}
        </div>

        <div className="flex gap-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(resource)}
          >
            ✏️ Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => onDelete(resource)}
          >
            🗑️ Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
