import { Router } from 'express';
import { apiReference } from '@scalar/express-api-reference';
import openapi from './openapi.js';

const router = Router();

router.get('/', apiReference({
  spec: {
    content: openapi,
  },
  pageTitle: 'Auth Service — API Documentation',
  theme: 'kepler',
  layout: 'modern',
  hideModels: false,
  hideDownloadButton: false,
  defaultHttpClient: {
    targetKey: 'javascript',
    clientKey: 'fetch',
  },
}));

router.get('/openapi.json', (req, res) => {
  res.json(openapi);
});

export default router;
