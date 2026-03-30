'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { regenerateIds } = require('../lib/template-utils');

let seq = 0;
function nextId() {
  seq += 1;
  return 'id-' + seq;
}

test('regenerateIds remapea IDs y lógica condicional', () => {
  seq = 0;
  const template = {
    id: 't1',
    pages: [{
      id: 'p1',
      sections: [{
        id: 's1',
        questions: [
          { id: 'q1', text: 'A' },
          { id: 'q2', text: 'B', conditionalLogic: { dependsOn: 'q1', condition: 'equals', value: 'yes' } }
        ]
      }]
    }]
  };

  const cloned = regenerateIds(template, nextId);
  assert.notEqual(cloned.id, template.id);
  assert.equal(cloned.pages[0].sections[0].questions[1].conditionalLogic.dependsOn, cloned.pages[0].sections[0].questions[0].id);
});
