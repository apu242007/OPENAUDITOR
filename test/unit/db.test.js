'use strict';

const { expect } = require('chai');
const db = require('../../lib/db');

describe('Database Module', function() {
  describe('Config Management', function() {
    it('should save and retrieve config', function() {
      const config = {
        dataPath: '/test/path',
        branding: {
          appName: 'Test App',
          primaryColor: '#4f46e5'
        },
        security: {
          enabled: true,
          pinHash: 'test_hash'
        }
      };

      db.saveConfig(config);
      const retrieved = db.getConfig();

      expect(retrieved).to.deep.equal(config);
    });

    it('should return fallback for missing config', function() {
      const fallback = { default: true };
      const retrieved = db.getConfig(fallback);

      expect(retrieved).to.deep.equal(fallback);
    });

    it('should update existing config', function() {
      const config1 = { setting: 'value1' };
      const config2 = { setting: 'value2' };

      db.saveConfig(config1);
      db.saveConfig(config2);

      const retrieved = db.getConfig();
      expect(retrieved.setting).to.equal('value2');
    });
  });

  describe('Template Management', function() {
    it('should save and retrieve template', function() {
      const template = {
        id: 'tpl-001',
        name: 'Test Template',
        status: 'draft',
        pages: [],
        updatedAt: new Date().toISOString()
      };

      db.saveTemplate(template.id, template);
      const templates = db.getAllTemplates();

      expect(templates).to.have.length(1);
      expect(templates[0].id).to.equal('tpl-001');
      expect(templates[0].name).to.equal('Test Template');
    });

    it('should update existing template', function() {
      const template = {
        id: 'tpl-001',
        name: 'Original Name',
        status: 'draft',
        updatedAt: new Date().toISOString()
      };

      db.saveTemplate(template.id, template);

      template.name = 'Updated Name';
      template.updatedAt = new Date().toISOString();
      db.saveTemplate(template.id, template);

      const templates = db.getAllTemplates();
      expect(templates).to.have.length(1);
      expect(templates[0].name).to.equal('Updated Name');
    });

    it('should delete template', function() {
      const template = {
        id: 'tpl-001',
        name: 'Test Template',
        status: 'draft',
        updatedAt: new Date().toISOString()
      };

      db.saveTemplate(template.id, template);
      db.deleteTemplate(template.id);

      const templates = db.getAllTemplates();
      expect(templates).to.have.length(0);
    });

    it('should retrieve templates ordered by updated_at DESC', function() {
      const template1 = {
        id: 'tpl-001',
        name: 'Template 1',
        status: 'draft',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const template2 = {
        id: 'tpl-002',
        name: 'Template 2',
        status: 'published',
        updatedAt: '2024-01-02T00:00:00.000Z'
      };

      db.saveTemplate(template1.id, template1);
      db.saveTemplate(template2.id, template2);

      const templates = db.getAllTemplates();
      expect(templates[0].id).to.equal('tpl-002'); // Most recent first
      expect(templates[1].id).to.equal('tpl-001');
    });
  });

  describe('Inspection Management', function() {
    it('should save and retrieve inspection', function() {
      const inspection = {
        id: 'ins-001',
        templateId: 'tpl-001',
        templateName: 'Test Template',
        status: 'in_progress',
        answers: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.saveInspection(inspection.id, inspection.templateId, inspection);
      const retrieved = db.getInspection(inspection.id);

      expect(retrieved).to.not.be.null;
      expect(retrieved.id).to.equal('ins-001');
      expect(retrieved.status).to.equal('in_progress');
    });

    it('should set completed_at when status is completed', function() {
      const inspection = {
        id: 'ins-001',
        templateId: 'tpl-001',
        status: 'completed',
        completedAt: '2024-01-01T12:00:00.000Z',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.saveInspection(inspection.id, inspection.templateId, inspection);

      const row = db.getDb().prepare(
        'SELECT completed_at FROM inspections WHERE id = ?'
      ).get(inspection.id);

      expect(row.completed_at).to.not.be.null;
      expect(row.completed_at).to.equal('2024-01-01T12:00:00.000Z');
    });

    it('should delete inspection', function() {
      const inspection = {
        id: 'ins-001',
        templateId: 'tpl-001',
        status: 'in_progress',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.saveInspection(inspection.id, inspection.templateId, inspection);
      db.deleteInspection(inspection.id);

      const retrieved = db.getInspection(inspection.id);
      expect(retrieved).to.be.null;
    });
  });

  describe('Action Management', function() {
    beforeEach(function() {
      db.saveInspection('ins-001', 'tpl-001', {
        id: 'ins-001',
        templateId: 'tpl-001',
        templateName: 'Template for Actions',
        status: 'in_progress',
        answers: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    it('should save and retrieve action', function() {
      const action = {
        questionText: 'Test Question',
        description: 'Fix this issue',
        status: 'open',
        assignedTo: 'John Doe',
        deadline: '2024-12-31',
        flagged: true
      };

      db.saveAction('action-001', 'ins-001', 'q-001', action);
      const actions = db.getAllActions();

      expect(actions).to.have.length(1);
      expect(actions[0].id).to.equal('action-001');
      expect(actions[0].description).to.equal('Fix this issue');
      expect(actions[0].flagged).to.be.true;
    });

    it('should filter actions by status', function() {
      db.saveAction('action-001', 'ins-001', 'q-001', {
        description: 'Action 1',
        status: 'open'
      });

      db.saveAction('action-002', 'ins-001', 'q-002', {
        description: 'Action 2',
        status: 'resolved'
      });

      const openActions = db.getAllActions({ status: 'open' });
      expect(openActions).to.have.length(1);
      expect(openActions[0].id).to.equal('action-001');
    });

    it('should update action', function() {
      db.saveAction('action-001', 'ins-001', 'q-001', {
        description: 'Original',
        status: 'open'
      });

      db.updateAction('action-001', {
        description: 'Updated',
        status: 'in_progress'
      });

      const actions = db.getAllActions();
      expect(actions[0].description).to.equal('Updated');
      expect(actions[0].status).to.equal('in_progress');
    });

    it('should delete action', function() {
      db.saveAction('action-001', 'ins-001', 'q-001', {
        description: 'Test Action',
        status: 'open'
      });

      db.deleteAction('action-001');

      const actions = db.getAllActions();
      expect(actions).to.have.length(0);
    });

    it('should cascade delete actions when inspection is deleted', function() {
      db.saveAction('action-001', 'ins-001', 'q-001', {
        description: 'Test Action',
        status: 'open'
      });

      db.deleteActionsByInspection('ins-001');

      const actions = db.getActionsByInspection('ins-001');
      expect(actions).to.have.length(0);
    });
  });

  describe('Library Management', function() {
    it('should save and retrieve library items', function() {
      const item = {
        id: 'lib-001',
        text: 'Test Question',
        responseType: 'text',
        savedAt: new Date().toISOString()
      };

      db.saveLibraryItem(item.id, item);
      const library = db.getLibrary();

      expect(library).to.have.length(1);
      expect(library[0].id).to.equal('lib-001');
      expect(library[0].text).to.equal('Test Question');
    });

    it('should delete library item', function() {
      const item = {
        id: 'lib-001',
        text: 'Test Question',
        savedAt: new Date().toISOString()
      };

      db.saveLibraryItem(item.id, item);
      db.deleteLibraryItem(item.id);

      const library = db.getLibrary();
      expect(library).to.have.length(0);
    });
  });
});
