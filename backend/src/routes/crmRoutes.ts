import { Router } from 'express';
import {
  ingestCustomers,
  ingestOrders,
  getAllSegments,
  createSegment,
  previewSegment,
  getAllCampaigns,
  getCampaignDetails,
  createCampaign,
  launchCampaign,
  getDashboardAnalytics
} from '../controllers/crmController';

const router = Router();

// Ingestion APIs
router.post('/ingest/customers', ingestCustomers);
router.post('/ingest/orders', ingestOrders);

// Segment APIs
router.get('/segments', getAllSegments);
router.post('/segments', createSegment);
router.post('/segments/preview', previewSegment);

// Campaign APIs
router.get('/campaigns', getAllCampaigns);
router.get('/campaigns/:id', getCampaignDetails);
router.post('/campaigns', createCampaign);
router.post('/campaigns/:id/launch', launchCampaign);

// Analytics API
router.get('/analytics', getDashboardAnalytics);

export default router;
