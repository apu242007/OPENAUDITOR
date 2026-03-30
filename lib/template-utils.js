'use strict';

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function regenerateIds(template, createId) {
  const newTemplate = deepClone(template);
  const questionMap = {};
  newTemplate.id = createId();

  (newTemplate.pages || []).forEach(page => {
    page.id = createId();
    (page.sections || []).forEach(section => {
      section.id = createId();
      (section.questions || []).forEach(question => {
        const oldId = question.id;
        question.id = createId();
        questionMap[oldId] = question.id;
      });
    });
  });

  (newTemplate.pages || []).forEach(page => {
    (page.sections || []).forEach(section => {
      (section.questions || []).forEach(question => {
        if (question.conditionalLogic && question.conditionalLogic.dependsOn && questionMap[question.conditionalLogic.dependsOn]) {
          question.conditionalLogic.dependsOn = questionMap[question.conditionalLogic.dependsOn];
        }
      });
    });
  });

  return newTemplate;
}

function deepCloneWithNewIds(template, createId) {
  return regenerateIds(template, createId);
}

module.exports = {
  deepClone,
  regenerateIds,
  deepCloneWithNewIds
};
