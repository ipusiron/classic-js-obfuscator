/* The quiz only displays fixed data and requests an explicit sample load. */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./quiz-data.js"), require("./quiz-core.js"));
  } else root.QuizUI = factory(root.QuizData, root.QuizCore);
})(typeof globalThis !== "undefined" ? globalThis : this, function (questions, core) {
  "use strict";

  function create({ document, t, getLanguage, onLoadSample }) {
    const node = (id) => document.getElementById(id);
    let state = core.create();

    function render() {
      const question = questions[state.index];
      const answer = state.answers[question.id];
      const language = getLanguage();
      const score = core.score(state);
      node("quiz-question").textContent = question.prompt[language];
      node("quiz-position").textContent = t("quizPosition", { index: state.index + 1, total: questions.length });
      node("quiz-progress").textContent = t("quizProgress", score);
      node("quiz-progress").setAttribute("data-answered", String(score.answered));
      node("quiz-progress").setAttribute("data-correct", String(score.correct));
      for (const choice of question.choices) {
        node(`quiz-choice-${choice.id}`).checked = answer?.choiceId === choice.id;
        node(`quiz-choice-${choice.id}`).disabled = !!answer?.graded;
        node(`quiz-label-${choice.id}`).textContent = choice.text[language];
      }
      node("btn-quiz-grade").disabled = !answer || answer.graded;
      node("btn-quiz-prev").disabled = state.index === 0;
      node("btn-quiz-next").disabled = state.index === questions.length - 1;
      node("quiz-result").textContent = answer?.graded ?
        t(answer.choiceId === question.answerId ? "quizCorrect" : "quizWrong") : "";
      node("quiz-explanation").textContent = answer?.graded ? question.explanation[language] : "";
      node("quiz-explanation").hidden = !answer?.graded;
      node("quiz-panel").setAttribute("data-question", question.id);
    }

    for (const choiceId of ["a", "b", "c"]) {
      node(`quiz-choice-${choiceId}`).addEventListener("change", () => {
        if (!node(`quiz-choice-${choiceId}`).checked) return;
        state = core.select(state, choiceId);
        render();
      });
    }
    node("btn-quiz-grade").addEventListener("click", () => { state = core.grade(state); render(); });
    for (const [id, step] of [["btn-quiz-prev", -1], ["btn-quiz-next", 1]]) {
      node(id).addEventListener("click", () => {
        const next = state.index + step;
        if (next >= 0 && next < questions.length) state = core.navigate(state, next);
        render();
      });
    }
    node("btn-quiz-reset").addEventListener("click", () => { state = core.create(); render(); });
    node("btn-quiz-load").addEventListener("click", () => onLoadSample(questions[state.index].sampleId));
    render();
    return Object.freeze({ refreshLanguage: render });
  }

  return Object.freeze({ create });
});
