(() => {
  "use strict";

  const quizzes = Array.isArray(window.QUIZZES) ? window.QUIZZES : [];
  const app = document.getElementById("app");
  const toastEl = document.getElementById("toast");
  const HISTORY_KEY = "kto-ty-history-v1";
  const FAVORITES_KEY = "kto-ty-favorites-v1";
  const PROGRESS_KEY = "kto-ty-progress-v1";

  function readStored(key, fallback) {
    try {
      const data = JSON.parse(localStorage.getItem(key));
      return data === null ? fallback : data;
    } catch (_) {
      return fallback;
    }
  }
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {
      // Game still works in private mode or when localStorage is unavailable.
    }
  }
  function removeStored(key) {
    try { localStorage.removeItem(key); } catch (_) {}
  }

  let history = readStored(HISTORY_KEY, []);
  if (!Array.isArray(history)) history = [];
  let favorites = readStored(FAVORITES_KEY, []);
  if (!Array.isArray(favorites)) favorites = [];
  let progress = readStored(PROGRESS_KEY, null);
  const state = { category: "Все", query: "", screen: "home" };
  let toastTimer;

  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const findQuiz = id => quizzes.find(item => item.id === id);
  const findRun = id => history.find(item => item.id === id);
  const lastRun = id => history.find(item => item.quizId === id);
  const validProgress = test => progress && progress.testId === test.id &&
    Array.isArray(progress.answers) && progress.answers.length === test.questions.length &&
    Number.isInteger(progress.index) && progress.index >= 0 && progress.index < test.questions.length;

  function toast(message) {
    clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.classList.add("visible");
    toastTimer = setTimeout(() => toastEl.classList.remove("visible"), 2900);
  }

  function navigate(hash) {
    if (location.hash === "#" + hash) route();
    else location.hash = hash;
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function updateHeader() {
    document.getElementById("history-count").textContent = history.length;
    document.getElementById("nav-home").classList.toggle("active", state.screen === "home");
    document.getElementById("nav-history").classList.toggle("active", state.screen === "history");
  }

  function getCategories() {
    return ["Все", ...new Set(quizzes.map(quiz => quiz.category))];
  }

  function filteredQuizzes() {
    const query = state.query.trim().toLocaleLowerCase("ru");
    return quizzes.filter(quiz =>
      (state.category === "Все" || quiz.category === state.category) &&
      (!query || [quiz.title, quiz.description, quiz.category, quiz.format].some(
        value => value.toLocaleLowerCase("ru").includes(query)
      ))
    );
  }

  function cardHTML(quiz, index) {
    const isFavorite = favorites.includes(quiz.id);
    const hasProgress = validProgress(quiz);
    const alreadyPlayed = Boolean(lastRun(quiz.id));
    return `<article class="quiz-card theme-${quiz.theme}">
      <div class="card-art" aria-hidden="true">
        <span class="card-label">${escapeHTML(quiz.sticker)}</span>
        <span class="art-emoji">${quiz.emoji}</span>
        <span class="card-number">${String(index + 1).padStart(2, "0")}</span>
      </div>
      ${hasProgress ? '<span class="card-progress">⏳ Не закончен</span>' : ""}
      <div class="card-body">
        <div class="card-meta">${escapeHTML(quiz.category)} <span class="meta-dot">•</span> ${quiz.questions.length} вопросов <span class="meta-dot">•</span> ~2 мин</div>
        <h3 class="card-title">${escapeHTML(quiz.title)}</h3>
        <p class="card-description">${escapeHTML(quiz.description)}</p>
        <div class="card-footer">
          <button type="button" class="card-start" data-action="start" data-id="${quiz.id}">
            ${hasProgress ? "Продолжить" : alreadyPlayed ? "Пройти ещё раз" : "Пройти тест"} <span aria-hidden="true">↗</span>
          </button>
          <button type="button" class="card-favorite ${isFavorite ? "is-favorite" : ""}" data-action="favorite"
            data-id="${quiz.id}" aria-label="${isFavorite ? "Убрать из избранного" : "Добавить в избранное"}"
            aria-pressed="${isFavorite}" title="${isFavorite ? "Убрать из избранного" : "Добавить в избранное"}">
            ${isFavorite ? "♥" : "♡"}
          </button>
        </div>
      </div>
    </article>`;
  }

  function renderCards() {
    const grid = document.getElementById("quiz-grid");
    if (!grid) return;
    const items = filteredQuizzes();
    grid.innerHTML = items.length
      ? items.map(quiz => cardHTML(quiz, quizzes.indexOf(quiz))).join("")
      : `<div class="no-results"><span>🔎</span><h3>Ничего не нашлось</h3>
          <p>Попробуй другое слово или выбери другую категорию.</p>
          <button class="btn btn-outline" data-action="reset-filters">Сбросить фильтры</button></div>`;
    document.getElementById("grid-count").textContent = `Показано: ${items.length} из ${quizzes.length}`;
  }

  function renderHome() {
    state.screen = "home";
    document.title = "КТО ТЫ? — 10 необычных тестов";
    const uniquePlayed = new Set(history.map(entry => entry.quizId)).size;
    app.innerHTML = `
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <span class="eyebrow"><span class="dot"></span> ЛАБОРАТОРИЯ ТВОЕГО ВАЙБА</span>
          <h1 class="hero-title" id="hero-title">Так кто же <span class="gradient-word">ты</span><br>на самом <span class="underline-word">деле?</span></h1>
          <p class="hero-sub">Мультгерой? Кот с характером? Мем в понедельник? 10 тестов, в которых серьёзность встречается с полным абсурдом.</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="#catalog">Выбрать тест <span aria-hidden="true">↗</span></a>
            <button class="btn btn-light" data-action="random">✦ Случайный тест</button>
          </div>
        </div>
        <div class="hero-visual" aria-hidden="true">
          <span class="hero-orbit"></span>
          <span class="hero-main-emoji">🧠</span>
          <span class="hero-mini one">😎</span>
          <span class="hero-mini two">🐱</span>
          <span class="hero-mini three">🦄</span>
          <span class="hero-star">✳</span>
          <span class="hero-bubble">твой вайб: <span>100% уникальный ✨</span></span>
        </div>
      </section>
      <section class="stats-strip" aria-label="Статистика">
        <div class="stat"><div class="stat-icon">🎲</div><div><strong>${quizzes.length}</strong><span>необычных тестов</span></div></div>
        <div class="stat"><div class="stat-icon">🏆</div><div><strong>${history.length}</strong><span>прохождений</span></div></div>
        <div class="stat"><div class="stat-icon">💜</div><div><strong>${uniquePlayed}/${quizzes.length}</strong><span>тестов открыто</span></div></div>
      </section>
      <section id="catalog" aria-labelledby="catalog-title">
        <div class="catalog-head">
          <div>
            <span class="section-kicker">✳ ВЫБЕРИ СВОЮ ИСТОРИЮ</span>
            <h2 class="section-title" id="catalog-title">Тесты под любое настроение</h2>
            <p class="section-desc">От небольшого самопознания до абсолютного «что я сейчас прошёл?»</p>
          </div>
          <label class="filter-search">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
            <input id="search-input" type="search" aria-label="Поиск тестов" placeholder="Найти тест..." value="${escapeHTML(state.query)}">
          </label>
        </div>
        <div class="filter-bar">
          <div class="category-list" role="group" aria-label="Категории">
            ${getCategories().map(cat => `<button type="button" class="filter-chip ${cat === state.category ? "active" : ""}"
              aria-pressed="${cat === state.category}" data-action="category" data-category="${escapeHTML(cat)}">${escapeHTML(cat)}</button>`).join("")}
          </div>
          <span class="grid-count" id="grid-count"></span>
        </div>
        <div class="quiz-grid" id="quiz-grid"></div>
      </section>
      <div class="closing-banner">
        <div><strong>✦ Ты уже проходил тесты? Результаты не потеряются!</strong>
          <p>История сохраняется прямо в этом браузере — без регистрации и лишних вопросов.</p></div>
        <a class="btn btn-outline" href="#history">Моя история ↗</a>
      </div>`;
    renderCards();
    updateHeader();
  }

  // The same question always displays its choices in the same shuffled order.
  // The recorded result is an archetype ID, not a visible button number.
  function shuffledChoices(quiz, questionIndex) {
    const items = quiz.questions[questionIndex].options.map((label, index) => ({
      label, type: quiz.results[index].id
    }));
    let seed = 0;
    for (const char of quiz.id + ":" + questionIndex) {
      seed = (Math.imul(seed, 31) + char.charCodeAt(0)) >>> 0;
    }
    for (let i = items.length - 1; i > 0; i--) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const j = seed % (i + 1);
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  function beginQuiz(id, force = false) {
    const quiz = findQuiz(id);
    if (!quiz) return toast("Такого теста пока нет");
    if (force || !validProgress(quiz)) {
      progress = {
        testId: quiz.id,
        answers: Array(quiz.questions.length).fill(null),
        index: 0,
        startedAt: Date.now()
      };
      store(PROGRESS_KEY, progress);
    }
    navigate("quiz/" + quiz.id);
  }

  function renderQuiz(quiz) {
    state.screen = "quiz";
    document.title = quiz.title + " — КТО ТЫ?";
    const index = progress.index;
    const question = quiz.questions[index];
    const selected = progress.answers[index];
    const choices = shuffledChoices(quiz, index);
    const percent = Math.round(((index + 1) / quiz.questions.length) * 100);
    app.innerHTML = `
      <section class="quiz-view theme-${quiz.theme}" aria-labelledby="question-title">
        <button class="play-back" type="button" data-action="go-home">← Все тесты</button>
        <div class="quiz-topline">
          <span class="play-kicker">${quiz.emoji} <span>${escapeHTML(quiz.title)}</span></span>
          <span class="play-step">Вопрос ${index + 1} из ${quiz.questions.length}</span>
        </div>
        <div class="progress-track" role="progressbar" aria-label="Прогресс теста" aria-valuenow="${index + 1}" aria-valuemin="0" aria-valuemax="${quiz.questions.length}">
          <div class="progress-fill" style="width:${percent}%"></div>
        </div>
        <div class="quiz-board">
          <div class="question-head">
            <div class="question-art" aria-hidden="true">${quiz.emoji}</div>
            <div><span class="question-type">${escapeHTML(quiz.format)} · ${index + 1}/${quiz.questions.length}</span>
              <h1 class="question-prompt" id="question-title">${escapeHTML(question.prompt)}</h1>
              <p class="question-hint">${escapeHTML(question.hint)}</p>
            </div>
          </div>
          <div class="options-grid" role="group" aria-label="Варианты ответа">
            ${choices.map((choice, choiceIndex) => {
              const isSelected = selected === choice.type;
              return `<button type="button" class="option-card ${isSelected ? "selected" : ""}"
                data-action="choose" data-type="${choice.type}" aria-pressed="${isSelected}">
                <span class="option-key">${choiceIndex + 1}</span>
                <span class="option-text">${escapeHTML(choice.label)}</span>
                <span class="option-check" aria-hidden="true">✓</span>
              </button>`;
            }).join("")}
          </div>
          <div class="quiz-controls">
            <button type="button" class="btn btn-outline" data-action="previous" ${index === 0 ? "disabled" : ""}>← Назад</button>
            <button type="button" class="btn btn-purple" data-action="next" ${selected === null ? "disabled" : ""}>
              ${index === quiz.questions.length - 1 ? "Узнать результат ✨" : "Дальше →"}
            </button>
          </div>
        </div>
        <p class="keyboard-note">Подсказка: можно выбирать цифрами 1–4 и переходить дальше через Enter.</p>
      </section>`;
    updateHeader();
  }

  function pickAnswer(type) {
    const quiz = findQuiz(progress?.testId);
    if (!quiz || !quiz.results.some(item => item.id === type)) return;
    progress.answers[progress.index] = type;
    store(PROGRESS_KEY, progress);
    renderQuiz(quiz);
  }

  function previousQuestion() {
    const quiz = findQuiz(progress?.testId);
    if (!quiz || progress.index <= 0) return;
    progress.index--;
    store(PROGRESS_KEY, progress);
    renderQuiz(quiz);
  }

  function nextQuestion() {
    const quiz = findQuiz(progress?.testId);
    if (!quiz || !progress.answers[progress.index]) return;
    if (progress.index < quiz.questions.length - 1) {
      progress.index++;
      store(PROGRESS_KEY, progress);
      renderQuiz(quiz);
    } else {
      finishQuiz(quiz);
    }
  }

  function finishQuiz(quiz) {
    const scores = Object.fromEntries(quiz.results.map(result => [result.id, 0]));
    progress.answers.forEach(type => { if (Object.hasOwn(scores, type)) scores[type]++; });
    const highest = Math.max(...Object.values(scores));
    const candidates = quiz.results.filter(result => scores[result.id] === highest).map(result => result.id);
    // A tie goes to the most recently chosen among the tied types.
    const winnerId = [...progress.answers].reverse().find(type => candidates.includes(type)) || candidates[0];
    const run = {
      id: Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9),
      quizId: quiz.id,
      resultId: winnerId,
      scores,
      completedAt: new Date().toISOString(),
      durationSeconds: Math.max(1, Math.round((Date.now() - progress.startedAt) / 1000))
    };
    history.unshift(run);
    history = history.slice(0, 200);
    store(HISTORY_KEY, history);
    progress = null;
    removeStored(PROGRESS_KEY);
    navigate("result/" + run.id);
  }

  function renderResult(run) {
    const quiz = findQuiz(run.quizId);
    const result = quiz?.results.find(item => item.id === run.resultId);
    if (!quiz || !result) return navigate("history");
    state.screen = "result";
    document.title = result.title + " — твой результат";
    const total = Math.max(1, Object.values(run.scores || {}).reduce((sum, value) => sum + (Number(value) || 0), 0));
    app.innerHTML = `
      <section class="result-view theme-${quiz.theme}" aria-labelledby="result-title">
        <button class="play-back" data-action="go-home">← К другим тестам</button>
        <div class="result-hero">
          <span class="result-pill">✨ ТЕСТ ПРОЙДЕН · ${escapeHTML(quiz.category)}</span>
          <div class="result-art" aria-hidden="true">${result.emoji}</div>
          <p class="result-prefix">Твой результат:</p>
          <h1 class="result-title" id="result-title">${escapeHTML(result.title)}</h1>
          <p class="result-tagline">${escapeHTML(result.tagline)}</p>
          <p class="result-description">${escapeHTML(result.description)}</p>
          <div class="result-actions">
            <button class="btn btn-primary" data-action="share" data-id="${run.id}">↗ Поделиться</button>
            <button class="btn btn-light" data-action="restart" data-id="${quiz.id}">↻ Пройти заново</button>
          </div>
        </div>
        <div class="result-details">
          <div class="detail-card">
            <h3>💎 Твои суперкачества</h3>
            <div class="trait-pills">${result.traits.map(trait => `<span class="trait-pill">${escapeHTML(trait)}</span>`).join("")}</div>
          </div>
          <div class="detail-card tip-card">
            <h3>💌 Послание от лаборатории</h3>
            <p>${escapeHTML(result.tip)}</p>
          </div>
        </div>
        <div class="score-card">
          <h3>🎯 Как сложился результат</h3>
          <p>Каждый ответ добавляет один балл одному образу. Это развлекательный тест, а не психологическая диагностика.</p>
          ${[...quiz.results].sort((a, b) => (run.scores[b.id] || 0) - (run.scores[a.id] || 0)).map(item => {
            const score = Number(run.scores[item.id] || 0);
            const percentage = Math.round((score / total) * 100);
            return `<div class="score-row">
              <span class="score-name" title="${escapeHTML(item.title)}">${item.emoji} ${escapeHTML(item.title)}</span>
              <div class="score-meter" role="meter" aria-label="${escapeHTML(item.title)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percentage}"><span style="width:${percentage}%"></span></div>
              <span class="score-value">${percentage}%</span>
            </div>`;
          }).join("")}
        </div>
        <div class="result-bottom"><a href="#history" class="btn btn-outline">📚 Посмотреть историю прохождений</a></div>
      </section>`;
    updateHeader();
  }

  function dateLabel(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "Дата неизвестна";
    return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(date);
  }

  function renderHistory() {
    state.screen = "history";
    document.title = "История прохождений — КТО ТЫ?";
    const validRuns = history.filter(run => findQuiz(run.quizId)?.results.some(r => r.id === run.resultId));
    app.innerHTML = `
      <section class="history-view" aria-labelledby="history-title">
        <button class="play-back" data-action="go-home">← Все тесты</button>
        <div class="history-head">
          <div>
            <span class="section-kicker">✳ ТВОЯ ЛИЧНАЯ ХРОНИКА</span>
            <h1 class="section-title" id="history-title">История прохождений</h1>
            <p class="section-desc">Ты проходил тесты ${validRuns.length} раз. Все записи хранятся только в этом браузере.</p>
          </div>
          ${validRuns.length ? '<button class="danger-link" data-action="clear-history">Очистить историю</button>' : ""}
        </div>
        ${validRuns.length ? `<div class="history-list">${validRuns.map(run => {
          const quiz = findQuiz(run.quizId);
          const result = quiz.results.find(item => item.id === run.resultId);
          return `<article class="history-item theme-${quiz.theme}">
              <div class="history-art" aria-hidden="true">${result.emoji}</div>
              <div class="history-info">
                <span class="history-test">${escapeHTML(quiz.title)}</span>
                <h3>${escapeHTML(result.title)}</h3>
                <div class="history-meta">🗓 ${dateLabel(run.completedAt)} · ${quiz.questions.length} вопросов</div>
              </div>
              <div class="history-actions">
                <button class="btn btn-outline" data-action="open-result" data-id="${run.id}">Результат ↗</button>
                <button class="small-icon-btn" data-action="delete-run" data-id="${run.id}" title="Удалить запись" aria-label="Удалить запись">🗑</button>
              </div>
            </article>`;
        }).join("")}</div>` : `<div class="empty-state">
          <span class="empty-emoji">🗃️</span><h2>Пока ни одной истории</h2>
          <p>Пройди свой первый тест — и здесь появится твой результат со всеми подробностями.</p>
          <button class="btn btn-purple" data-action="go-home">Выбрать первый тест →</button>
        </div>`}
        ${validRuns.length ? '<p class="end-note">История привязана к этому браузеру и может исчезнуть, если очистить данные сайта.</p>' : ""}
      </section>`;
    updateHeader();
  }

  function route() {
    const path = (location.hash || "#home").slice(1);
    if (path.startsWith("quiz/")) {
      const quiz = findQuiz(path.slice(5));
      if (quiz) {
        if (!validProgress(quiz)) {
          progress = { testId: quiz.id, answers: Array(quiz.questions.length).fill(null), index: 0, startedAt: Date.now() };
          store(PROGRESS_KEY, progress);
        }
        renderQuiz(quiz);
        return;
      }
    } else if (path.startsWith("result/")) {
      const run = findRun(path.slice(7));
      if (run) return renderResult(run);
    } else if (path === "history") {
      return renderHistory();
    }
    renderHome();
    if (path === "catalog") {
      requestAnimationFrame(() => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" }));
    }
  }

  function toggleFavorite(id) {
    if (!findQuiz(id)) return;
    if (favorites.includes(id)) favorites = favorites.filter(item => item !== id);
    else favorites.push(id);
    store(FAVORITES_KEY, favorites);
    renderHome();
    toast(favorites.includes(id) ? "В избранном 💜" : "Убрано из избранного");
  }

  async function shareResult(id) {
    const run = findRun(id);
    const quiz = findQuiz(run?.quizId);
    const result = quiz?.results.find(r => r.id === run.resultId);
    if (!result) return;
    const url = location.href.split("#")[0] + "#quiz/" + quiz.id;
    const text = `Я прошёл тест «${quiz.title}» и оказался «${result.title}» ${result.emoji}\nА кто ты?`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "КТО ТЫ? — " + quiz.title, text, url });
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
      }
    }
    const fullText = text + "\n" + url;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(fullText);
      toast("Твой результат скопирован 📋");
    } catch (_) {
      const field = document.createElement("textarea");
      field.value = fullText;
      field.style.position = "fixed";
      field.style.left = "-9999px";
      document.body.appendChild(field);
      field.select();
      const succeeded = document.execCommand("copy");
      field.remove();
      toast(succeeded ? "Твой результат скопирован 📋" : "Не получилось скопировать — попробуй другой браузер");
    }
  }

  document.addEventListener("click", event => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    const id = target.dataset.id;
    switch (action) {
      case "random": {
        const quiz = quizzes[Math.floor(Math.random() * quizzes.length)];
        if (quiz) beginQuiz(quiz.id, true);
        break;
      }
      case "start": beginQuiz(id); break;
      case "restart": beginQuiz(id, true); break;
      case "go-home": navigate("home"); break;
      case "favorite": toggleFavorite(id); break;
      case "category":
        state.category = target.dataset.category;
        renderHome();
        break;
      case "reset-filters":
        state.category = "Все";
        state.query = "";
        renderHome();
        break;
      case "choose": pickAnswer(target.dataset.type); break;
      case "previous": previousQuestion(); break;
      case "next": nextQuestion(); break;
      case "open-result": navigate("result/" + id); break;
      case "share": shareResult(id); break;
      case "delete-run":
        if (!confirm("Удалить эту запись из истории?")) return;
        history = history.filter(run => run.id !== id);
        store(HISTORY_KEY, history);
        renderHistory();
        toast("Запись удалена");
        break;
      case "clear-history":
        if (!confirm("Точно удалить всю историю прохождений? Это действие нельзя отменить.")) return;
        history = [];
        store(HISTORY_KEY, history);
        renderHistory();
        toast("История очищена");
        break;
    }
  });

  document.addEventListener("input", event => {
    if (event.target.id === "search-input") {
      state.query = event.target.value;
      renderCards();
    }
  });

  document.addEventListener("keydown", event => {
    if (state.screen !== "quiz" || !progress) return;
    if (event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "")) return;
    const quiz = findQuiz(progress.testId);
    if (!quiz) return;
    if (/^[1-4]$/.test(event.key)) {
      event.preventDefault();
      const choice = shuffledChoices(quiz, progress.index)[Number(event.key) - 1];
      if (choice) pickAnswer(choice.type);
    } else if (event.key === "Enter") {
      // Preserve the default behavior when Enter is activating an on-screen button.
      if (document.activeElement?.matches("button, a")) return;
      event.preventDefault();
      nextQuestion();
    } else if (event.key === "ArrowLeft") {
      previousQuestion();
    }
  });

  window.addEventListener("hashchange", () => {
    route();
    if (location.hash !== "#catalog") window.scrollTo({ top: 0, behavior: "auto" });
  });
  route();
})();
