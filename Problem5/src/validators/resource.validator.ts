import { body, query, param } from 'express-validator';
import { ResourceStatus } from '../models';

/**
 * Validation rules for creating a resource
 */
export const createResourceValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters'),
  
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category must not exceed 100 characters'),
  
  body('status')
    .optional()
    .isIn(Object.values(ResourceStatus))
    .withMessage(`Status must be one of: ${Object.values(ResourceStatus).join(', ')}`),
  
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be a valid JSON object'),
];

/**
 * Validation rules for updating a resource
 */
export const updateResourceValidation = [
  param('id')
    .notEmpty()
    .withMessage('Resource ID is required')
    .isUUID()
    .withMessage('Resource ID must be a valid UUID'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters'),
  
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category must not exceed 100 characters'),
  
  body('status')
    .optional()
    .isIn(Object.values(ResourceStatus))
    .withMessage(`Status must be one of: ${Object.values(ResourceStatus).join(', ')}`),
  
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be a valid JSON object'),
];

/**
 * Validation rules for getting a resource by ID
 */
export const getResourceValidation = [
  param('id')
    .notEmpty()
    .withMessage('Resource ID is required')
    .isUUID()
    .withMessage('Resource ID must be a valid UUID'),
];

/**
 * Validation rules for deleting a resource
 */
export const deleteResourceValidation = [
  param('id')
    .notEmpty()
    .withMessage('Resource ID is required')
    .isUUID()
    .withMessage('Resource ID must be a valid UUID'),
];

/**
 * Validation rules for listing resources with filters
 */
export const listResourcesValidation = [
  query('name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Name filter must not exceed 255 characters'),
  
  query('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category filter must not exceed 100 characters'),
  
  query('status')
    .optional()
    .isIn(Object.values(ResourceStatus))
    .withMessage(`Status must be one of: ${Object.values(ResourceStatus).join(', ')}`),
  
  query('search')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Search query must not exceed 255 characters'),
  
  query('sortBy')
    .optional()
    .isIn(['id', 'name', 'category', 'status', 'createdAt', 'updatedAt'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be "asc" or "desc"'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
];
