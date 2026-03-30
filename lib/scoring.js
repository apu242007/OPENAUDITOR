'use strict';

function calculateInspectionScore(template, answers, repeatableAnswers) {
  let totalScore = 0;
  let maxScore = 0;

  function scoreQuestion(question, answer) {
    if (question.score === null || question.score === undefined || question.score === '') return;
    const points = Number(question.score);

    if (!answer) {
      maxScore += points;
      return;
    }

    if (question.responseType === 'multiple_choice' || question.responseType === 'yesno') {
      if (answer.value === 'yes') {
        totalScore += points;
        maxScore += points;
        return;
      }
      if (answer.value === 'no') {
        maxScore += points;
        return;
      }
      if (answer.value === 'na') return;

      const option = (question.options || []).find(opt => String(opt.id) === String(answer.value) || String(opt.label) === String(answer.value));
      if (!option) {
        maxScore += points;
        return;
      }
      if (option.scoreValue === 1) {
        totalScore += points;
        maxScore += points;
      } else if (option.scoreValue === 0) {
        maxScore += points;
      }
      return;
    }

    if (question.responseType === 'checkbox') {
      maxScore += points;
      if (answer.value === true || answer.value === 'true') totalScore += points;
      return;
    }

    maxScore += points;
    if (answer.value) totalScore += points;
  }

  (template.pages || []).forEach(page => {
    (page.sections || []).forEach(section => {
      if (section.repeatable) {
        const instances = (repeatableAnswers && repeatableAnswers[section.id]) || [];
        instances.forEach(instance => {
          (section.questions || []).forEach(question => scoreQuestion(question, instance[question.id]));
        });
        return;
      }

      (section.questions || []).forEach(question => scoreQuestion(question, answers && answers[question.id]));
    });
  });

  return { totalScore, maxScore };
}

module.exports = { calculateInspectionScore };
