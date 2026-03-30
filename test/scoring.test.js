'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateInspectionScore } = require('../lib/scoring');

test('calcula scoring con respuestas simples y repetibles', () => {
  const template = {
    pages: [{
      sections: [
        {
          repeatable: false,
          questions: [
            { id: 'q1', responseType: 'checkbox', score: 10 },
            { id: 'q2', responseType: 'text', score: 5 }
          ]
        },
        {
          id: 'srep',
          repeatable: true,
          questions: [
            { id: 'rq1', responseType: 'multiple_choice', score: 4, options: [{ id: 'ok', scoreValue: 1 }, { id: 'bad', scoreValue: 0 }] }
          ]
        }
      ]
    }]
  };

  const result = calculateInspectionScore(
    template,
    { q1: { value: true }, q2: { value: 'texto' } },
    { srep: [{ rq1: { value: 'ok' } }, { rq1: { value: 'bad' } }] }
  );

  assert.equal(result.totalScore, 19);
  assert.equal(result.maxScore, 23);
});
