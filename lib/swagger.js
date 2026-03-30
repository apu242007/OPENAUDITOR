'use strict';

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const packageVersion = require('../package.json').version;

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Auditor Libre API',
      version: packageVersion,
      description: 'Local-first inspection and audit management system. This API allows you to create templates, manage inspections, track actions, and generate reports.',
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      },
      contact: {
        name: 'Auditor Libre',
        url: 'https://github.com/yourusername/auditor-libre'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001/api',
        description: 'Development server'
      },
      {
        url: 'http://localhost:3001',
        description: 'Development server (full)'
      }
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'oa_session',
          description: 'Session cookie for authentication'
        }
      },
      schemas: {
        Template: {
          type: 'object',
          required: ['id', 'name', 'status'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique template identifier'
            },
            name: {
              type: 'string',
              description: 'Template name',
              maxLength: 200
            },
            description: {
              type: 'string',
              description: 'Template description',
              maxLength: 5000
            },
            status: {
              type: 'string',
              enum: ['draft', 'published', 'archived'],
              description: 'Template status'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              maxItems: 20,
              description: 'Template tags for categorization'
            },
            pages: {
              type: 'array',
              description: 'Template pages with sections and questions'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          }
        },
        Inspection: {
          type: 'object',
          required: ['id', 'templateId', 'status'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique inspection identifier'
            },
            templateId: {
              type: 'string',
              description: 'ID of the template used'
            },
            templateName: {
              type: 'string',
              description: 'Name of the template'
            },
            status: {
              type: 'string',
              enum: ['in_progress', 'completed', 'draft'],
              description: 'Inspection status'
            },
            code: {
              type: 'string',
              description: 'Optional correlative code'
            },
            answers: {
              type: 'object',
              description: 'Question answers keyed by question ID'
            },
            score: {
              type: 'number',
              description: 'Calculated score'
            },
            maxScore: {
              type: 'number',
              description: 'Maximum possible score'
            },
            startedAt: {
              type: 'string',
              format: 'date-time'
            },
            completedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Action: {
          type: 'object',
          required: ['id', 'inspectionId', 'questionId'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique action identifier'
            },
            inspectionId: {
              type: 'string',
              description: 'Associated inspection ID'
            },
            questionId: {
              type: 'string',
              description: 'Associated question ID'
            },
            questionText: {
              type: 'string',
              description: 'Text of the question'
            },
            description: {
              type: 'string',
              description: 'Action description',
              maxLength: 2000
            },
            status: {
              type: 'string',
              enum: ['open', 'in_progress', 'resolved'],
              description: 'Action status'
            },
            assignedTo: {
              type: 'string',
              description: 'Person assigned to the action',
              maxLength: 200
            },
            deadline: {
              type: 'string',
              format: 'date',
              description: 'Action deadline'
            },
            flagged: {
              type: 'boolean',
              description: 'Whether the item is flagged'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            code: {
              type: 'string',
              description: 'Error code'
            },
            requestId: {
              type: 'string',
              description: 'Request ID for tracking'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Resource not found',
                code: 'NOT_FOUND'
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Validation failed',
                code: 'VALIDATION_ERROR'
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Authentication and session management'
      },
      {
        name: 'Templates',
        description: 'Template creation and management'
      },
      {
        name: 'Inspections',
        description: 'Inspection execution and management'
      },
      {
        name: 'Actions',
        description: 'Action tracking and management'
      },
      {
        name: 'Library',
        description: 'Question library management'
      },
      {
        name: 'Analytics',
        description: 'Analytics and statistics'
      },
      {
        name: 'Configuration',
        description: 'Application configuration'
      },
      {
        name: 'Health',
        description: 'Health check endpoints'
      }
    ]
  },
  apis: [
    './routes/*.js',
    './server.js',
    './lib/swagger.js'
  ]
};

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the application including database connectivity and disk space
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded, unhealthy]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 *                 version:
 *                   type: string
 *                 database:
 *                   type: string
 *                   enum: [connected, disconnected]
 *                 diskSpace:
 *                   type: string
 *                   enum: [ok, low, unknown]
 *       503:
 *         description: Application is unhealthy
 */

/**
 * @openapi
 * /api/actions:
 *   get:
 *     summary: List all actions
 *     description: Retrieve all actions across inspections with optional filtering
 *     tags: [Actions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, in_progress, resolved]
 *         description: Filter by action status
 *       - in: query
 *         name: inspectionId
 *         schema:
 *           type: string
 *         description: Filter by inspection ID
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *         description: Filter by assigned person
 *     responses:
 *       200:
 *         description: List of actions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Action'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @openapi
 * /api/library:
 *   get:
 *     summary: Get question library
 *     description: Retrieve all saved questions in the library
 *     tags: [Library]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of library questions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *   post:
 *     summary: Add question to library
 *     description: Save a new question to the library
 *     tags: [Library]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text, responseType]
 *             properties:
 *               text:
 *                 type: string
 *               responseType:
 *                 type: string
 *               options:
 *                 type: array
 *     responses:
 *       201:
 *         description: Question created successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @openapi
 * /api/analytics/stats:
 *   get:
 *     summary: Get analytics statistics
 *     description: Retrieve overall statistics about inspections and findings
 *     tags: [Analytics]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Analytics statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: number
 *                   description: Total number of inspections
 *                 completedCount:
 *                   type: number
 *                   description: Number of completed inspections
 *                 avgScore:
 *                   type: number
 *                   description: Average score percentage
 *                 severities:
 *                   type: object
 *                   properties:
 *                     critical:
 *                       type: number
 *                     major:
 *                       type: number
 *                     minor:
 *                       type: number
 *                     observation:
 *                       type: number
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

const swaggerSpec = swaggerJsdoc(swaggerOptions);

function setupSwagger(app) {
  // Serve Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Auditor Libre API Documentation'
  }));

  // Serve raw swagger spec as JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

module.exports = {
  setupSwagger,
  swaggerSpec
};
