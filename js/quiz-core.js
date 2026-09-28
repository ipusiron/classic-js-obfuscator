/* Immutable quiz transitions; scores are derived, never incremented. */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory(require("./quiz-data.js"));
  else root.QuizCore = factory(root.QuizData);
})(typeof globalThis !== "undefined" ? globalThis : this, function (questions) {
  "use strict";

  function makeState(index, answers) {
    return Object.freeze({ index, answers: Object.freeze(answers) });
  }

  function create() {
    return makeState(0, {});
  }

  function select(state, choiceId) {
    const question = questions[state.index];
    if (!question.choices.some((choice) => choice.id === choiceId)) throw new RangeError("choice");
    if (state.answers[question.id]?.graded) return state;
    return makeState(state.index, {
      ...state.answers, [question.id]: Object.freeze({ choiceId, graded: false }),
    });
  }

  function grade(state) {
    const id = questions[state.index].id;
    if (!state.answers[id] || state.answers[id].graded) return state;
    return makeState(state.index, {
      ...state.answers, [id]: Object.freeze({ ...state.answers[id], graded: true }),
    });
  }

  function navigate(state, index) {
    if (!Number.isInteger(index) || index < 0 || index >= questions.length) throw new RangeError("index");
    return index === state.index ? state : makeState(index, state.answers);
  }

  function score(state) {
    let answered = 0;
    let correct = 0;
    for (const question of questions) {
      const answer = state.answers[question.id];
      if (answer?.graded) {
        answered++;
        if (answer.choiceId === question.answerId) correct++;
      }
    }
    return { answered, correct, total: questions.length };
  }

  return Object.freeze({ create, select, grade, navigate, score });
});
