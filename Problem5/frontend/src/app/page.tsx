'use client';

import React, { useState } from 'react';
import {
  ResourceForm,
  ResourceList,
  ResourceFiltersComponent,
  PaginationComponent,
  ConfirmModal,
  NotificationProvider,
  useNotification,
} from '@/components';
import { useResources } from '@/hooks';
import { Resource, ResourceFilters, CreateResourceDto, UpdateResourceDto } from '@/types';

function ResourceManagerContent() {
  const {
    resources,
    pagination,
    loading,
    error,
    fetchResources,
    createResource,
    updateResource,
    deleteResource,
  } = useResources();

  const { showNotification } = useNotification();

  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<ResourceFilters>({});

  const handleSubmit = async (data: CreateResourceDto | UpdateResourceDto) => {
    setFormLoading(true);
    try {
      if (editingResource) {
        await updateResource(editingResource.id, data as UpdateResourceDto);
        showNotification('Resource updated successfully!', 'success');
        setEditingResource(null);
      } else {
        await createResource(data as CreateResourceDto);
        showNotification('Resource created successfully!', 'success');
      }
    } catch (err) {
      showNotification(
        err instanceof Error ? err.message : 'Operation failed',
        'error'
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (resource: Resource) => {
    setEditingResource(resource);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingResource(null);
  };

  const handleDeleteClick = (resource: Resource) => {
    setDeleteTarget(resource);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleteLoading(true);
    try {
      await deleteResource(deleteTarget.id);
      showNotification('Resource deleted successfully!', 'success');
      setDeleteTarget(null);
    } catch (err) {
      showNotification(
        err instanceof Error ? err.message : 'Delete failed',
        'error'
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleApplyFilters = (filters: ResourceFilters) => {
    const newFilters = { ...filters, page: 1 };
    setCurrentFilters(newFilters);
    fetchResources(newFilters);
  };

  const handleClearFilters = () => {
    setCurrentFilters({});
    fetchResources({});
  };

  const handlePageChange = (page: number) => {
    const newFilters = { ...currentFilters, page };
    setCurrentFilters(newFilters);
    fetchResources(newFilters);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-600">📦 Resource Manager</h1>
          <p className="text-gray-500 mt-1">Next.js + TypeScript + Express CRUD Application</p>
        </header>

        {/* Create/Edit Form */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {editingResource ? '✏️ Edit Resource' : '➕ Create New Resource'}
          </h2>
          <ResourceForm
            resource={editingResource}
            onSubmit={handleSubmit}
            onCancel={handleCancelEdit}
            loading={formLoading}
          />
        </section>

        {/* Filters */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">🔍 Filter Resources</h2>
          <ResourceFiltersComponent
            onApply={handleApplyFilters}
            onClear={handleClearFilters}
          />
        </section>

        {/* Resources List */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">📋 Resources</h2>
            {pagination && (
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {pagination.total} item{pagination.total !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          
          <ResourceList
            resources={resources}
            loading={loading}
            error={error}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
          />

          {pagination && (
            <PaginationComponent
              pagination={pagination}
              onPageChange={handlePageChange}
            />
          )}
        </section>

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
          title="⚠️ Confirm Delete"
          message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          confirmVariant="danger"
          loading={deleteLoading}
        />
      </div>
    </div>
  );
}

export default function ResourceManager() {
  return (
    <NotificationProvider>
      <ResourceManagerContent />
    </NotificationProvider>
  );
}
