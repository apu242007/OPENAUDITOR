'use strict';

/**
 * Application constants and configuration values
 * Centralizes magic numbers and strings for better maintainability
 */

module.exports = {
  SERVER: {
    PORT: process.env.PORT || 3001,
    HOST: process.env.HOST || 'localhost',
    ENV: process.env.NODE_ENV || 'development'
  },

  UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 MB
    MAX_IMPORT_SIZE: 50 * 1024 * 1024, // 50 MB
    MAX_BRANDING_SIZE: 2 * 1024 * 1024, // 2 MB
    MAX_FILES_PER_UPLOAD: 10,
    ALLOWED_IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'],
    ALLOWED_VIDEO_EXTENSIONS: ['.mp4', '.mov'],
    ALLOWED_DOCUMENT_EXTENSIONS: ['.pdf'],
    ALLOWED_IMPORT_EXTENSIONS: ['.json', '.oapack', '.zip']
  },

  VALIDATION: {
    TEMPLATE_NAME_MAX_LENGTH: 200,
    TEMPLATE_DESCRIPTION_MAX_LENGTH: 5000,
    MAX_TAGS: 20,
    TAG_MAX_LENGTH: 50,
    MAX_PAGES: 100,
    MAX_SECTIONS_PER_PAGE: 50,
    MAX_QUESTIONS_PER_SECTION: 200,
    MAX_ACTIVITY_LOG_ENTRIES: 500,
    ANSWER_NOTE_MAX_LENGTH: 5000,
    ACTION_DESCRIPTION_MAX_LENGTH: 2000,
    WEBHOOK_URL_MAX_LENGTH: 2000,
    WEBHOOK_SECRET_MAX_LENGTH: 500,
    BRANDING_FOOTER_MAX_LENGTH: 200,
    CONFIG_DATAPATH_MAX_LENGTH: 500
  },

  SESSION: {
    COOKIE_NAME: 'oa_session',
    MAX_AGE: parseInt(process.env.SESSION_MAX_AGE, 10) || (24 * 60 * 60 * 1000), // 24 hours
    CLEANUP_INTERVAL: 60 * 60 * 1000, // 1 hour
    TOKEN_LENGTH: 32
  },

  RATE_LIMIT: {
    GENERAL: {
      WINDOW_MS: 60 * 1000, // 1 minute
      MAX_REQUESTS: 120
    },
    EXPORT: {
      WINDOW_MS: 60 * 1000,
      MAX_REQUESTS: 10
    },
    LOGIN: {
      WINDOW_MS: 15 * 60 * 1000, // 15 minutes
      MAX_REQUESTS: 10
    }
  },

  SECURITY: {
    PBKDF2_ITERATIONS: 100000,
    PBKDF2_KEY_LENGTH: 64,
    PBKDF2_DIGEST: 'sha512',
    SALT_LENGTH: 16,
    TRUSTED_HOSTS: [
      'raw.githubusercontent.com',
      'gist.githubusercontent.com',
      'gitlab.com',
      'raw.gitlab.com'
    ]
  },

  CACHE: {
    TEMPLATE_TTL: 300, // 5 minutes
    CONFIG_TTL: 60, // 1 minute
    I18N_TTL: 3600, // 1 hour
    STATIC_TTL: 86400, // 24 hours
    CHECK_PERIOD: 60 // 1 minute
  },

  WEBHOOK: {
    TIMEOUT_MS: 5000,
    RETRY_DELAY_MS: 30000,
    VALID_EVENTS: [
      'inspection.created',
      'inspection.completed',
      'inspection.autosaved',
      'action.status_changed',
      'template.published'
    ]
  },

  PDF: {
    DEFAULT_PAGE_SIZE: 'A4',
    DEFAULT_TIMEOUT_MS: 30000,
    PUPPETEER_TIMEOUT_MS: 30000
  },

  DATABASE: {
    JOURNAL_MODE: 'WAL',
    SYNCHRONOUS: 'NORMAL',
    BUSY_TIMEOUT: 5000
  },

  LOGGING: {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    MAX_FILES: 5,
    LEVEL: process.env.LOG_LEVEL || 'info'
  }
};
