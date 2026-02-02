import { Router } from 'express';
import { resourceController } from '../controllers';
import { validateRequest } from '../middleware';
import {
  createResourceValidation,
  updateResourceValidation,
  getResourceValidation,
  deleteResourceValidation,
  listResourcesValidation,
} from '../validators';

const router = Router();

/**
 * @route   POST /resources
 * @desc    Create a new resource
 * @access  Public
 */
router.post(
  '/',
  createResourceValidation,
  validateRequest,
  resourceController.create.bind(resourceController)
);

/**
 * @route   GET /resources
 * @desc    Get all resources with filters
 * @access  Public
 */
router.get(
  '/',
  listResourcesValidation,
  validateRequest,
  resourceController.findAll.bind(resourceController)
);

/**
 * @route   GET /resources/:id
 * @desc    Get a resource by ID
 * @access  Public
 */
router.get(
  '/:id',
  getResourceValidation,
  validateRequest,
  resourceController.findById.bind(resourceController)
);

/**
 * @route   PUT /resources/:id
 * @desc    Update a resource
 * @access  Public
 */
router.put(
  '/:id',
  updateResourceValidation,
  validateRequest,
  resourceController.update.bind(resourceController)
);

/**
 * @route   DELETE /resources/:id
 * @desc    Delete a resource
 * @access  Public
 */
router.delete(
  '/:id',
  deleteResourceValidation,
  validateRequest,
  resourceController.delete.bind(resourceController)
);

export default router;
