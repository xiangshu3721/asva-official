(function () {
  "use strict";

  var STORAGE_KEY = "healing-hotel-mvp";
  var VIEW_LANDING = "landing";
  var VIEW_ASSESSMENT = "assessment";
  var VIEW_RESULTS = "results";
  var VIEW_LIBRARY = "library";

  var LIKERT = [
    { value: 1, label: "几乎没有" },
    { value: 2, label: "较少" },
    { value: 3, label: "有时" },
    { value: 4, label: "经常" },
    { value: 5, label: "几乎总是" }
  ];

  var QUESTIONS = [
    {
      id: "s1",
      dim: "stress",
      tag: "压力",
      invert: false,
      text: "近一周，你感到紧绷、焦虑或被事情追着走的频率？"
    },
    {
      id: "s2",
      dim: "stress",
      tag: "压力",
      invert: false,
      text: "面对待办与人际时，你是否容易感到不堪重负？"
    },
    {
      id: "s3",
      dim: "stress",
      tag: "压力",
      invert: false,
      text: "身体是否常有肩颈僵硬、胸口发闷或呼吸变浅？"
    },
    {
      id: "e1",
      dim: "emotion",
      tag: "情绪",
      invert: true,
      text: "情绪起伏来临时，你是否难以慢慢平复？"
    },
    {
      id: "e2",
      dim: "emotion",
      tag: "情绪",
      invert: false,
      text: "你能觉察并温和地命名当下的情绪吗？"
    },
    {
      id: "e3",
      dim: "emotion",
      tag: "情绪",
      invert: true,
      text: "是否容易被小事激怒，或突然陷入低落？"
    },
    {
      id: "sl1",
      dim: "sleep",
      tag: "睡眠",
      invert: true,
      text: "夜里入睡是否需要很久？"
    },
    {
      id: "sl2",
      dim: "sleep",
      tag: "睡眠",
      invert: true,
      text: "夜间醒来后，是否很难再次安然入睡？"
    },
    {
      id: "sl3",
      dim: "sleep",
      tag: "睡眠",
      invert: false,
      text: "早晨醒来，身体与头脑是否感到恢复与清明？"
    },
    {
      id: "r1",
      dim: "relax",
      tag: "安顿",
      invert: false,
      text: "此刻，你有多愿意给自己一段不被打扰的安静时间？"
    }
  ];

  var TRACKS = [
    {
      id: "relax-sleep",
      src: "audio/relax-sleep.mp3",
      title: "安睡引导",
      desc: "低缓音色，帮助身体放下白日残留。",
      tags: ["sleep", "relax"]
    },
    {
      id: "stress-breath",
      src: "audio/stress-breath.mp3",
      title: "减压呼吸",
      desc: "跟随柔和起伏，让呼吸重新变深。",
      tags: ["stress", "breath"]
    },
    {
      id: "body-scan",
      src: "audio/body-scan.mp3",
      title: "身体扫描",
      desc: "由头到足轻轻巡视，安住当下感受。",
      tags: ["stress", "body"]
    },
    {
      id: "morning-clarity",
      src: "audio/morning-clarity.mp3",
      title: "晨间清明",
      desc: "清亮而温和，适合醒来后的片刻对齐。",
      tags: ["morning", "clarity"]
    },
    {
      id: "emotion-soothe",
      src: "audio/emotion-soothe.mp3",
      title: "情绪安抚",
      desc: "柔软音色陪伴起伏的心情慢慢落地。",
      tags: ["emotion"]
    },
    {
      id: "body-mind",
      src: "audio/body-mind.mp3",
      title: "身心合一",
      desc: "让身体与心意重新同频，回到完整。",
      tags: ["emotion", "body"]
    }
  ];

  var els = {
    views: {
      landing: document.getElementById("view-landing"),
      assessment: document.getElementById("view-assessment"),
      results: document.getElementById("view-results"),
      library: document.getElementById("view-library")
    },
    progressFill: document.getElementById("progress-fill"),
    progressLabel: document.getElementById("progress-label"),
    progressBar: document.querySelector(".progress-bar"),
    questionTag: document.getElementById("question-tag"),
    questionText: document.getElementById("question-text"),
    choices: document.getElementById("choices"),
    btnPrev: document.getElementById("btn-prev"),
    btnNext: document.getElementById("btn-next"),
    resultsIntro: document.getElementById("results-intro"),
    meters: document.getElementById("meters"),
    summaryCard: document.getElementById("summary-card"),
    suggestBlock: document.getElementById("suggest-block"),
    trackList: document.getElementById("track-list"),
    player: document.getElementById("player"),
    playerTitle: document.getElementById("player-title"),
    playerStatus: document.getElementById("player-status"),
    btnPlay: document.getElementById("btn-play"),
    seek: document.getElementById("seek"),
    timeCur: document.getElementById("time-cur"),
    timeDur: document.getElementById("time-dur"),
    audio: document.getElementById("audio-el")
  };

  var state = {
    view: VIEW_LANDING,
    index: 0,
    answers: {},
    scores: null,
    suggested: [],
    libFrom: VIEW_LANDING,
    currentTrackId: null,
    seeking: false
  };

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function toHundred(avg15) {
    return Math.round(clamp(((avg15 - 1) / 4) * 100, 0, 100));
  }

  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) return "0:00";
    var s = Math.floor(sec);
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ":" + (r < 10 ? "0" : "") + r;
  }

  function loadStore() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  }

  function saveStore() {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          view: state.view,
          index: state.index,
          answers: state.answers,
          scores: state.scores,
          suggested: state.suggested,
          libFrom: state.libFrom
        })
      );
    } catch (err) {
      /* private mode / quota — keep running in memory */
    }
  }

  function clearStore() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      /* ignore */
    }
  }

  function showView(name) {
    state.view = name;
    Object.keys(els.views).forEach(function (key) {
      var node = els.views[key];
      var on = key === name;
      node.hidden = !on;
      node.classList.toggle("view--active", on);
    });
    saveStore();
    window.scrollTo(0, 0);
  }

  function currentQuestion() {
    return QUESTIONS[state.index];
  }

  function answeredCount() {
    return Object.keys(state.answers).length;
  }

  function renderProgress() {
    var total = QUESTIONS.length;
    var now = state.index + 1;
    var pct = Math.round((now / total) * 100);
    els.progressFill.style.width = pct + "%";
    els.progressLabel.textContent = now + " / " + total;
    if (els.progressBar) {
      els.progressBar.setAttribute("aria-valuenow", String(pct));
    }
  }

  function renderQuestion() {
    var q = currentQuestion();
    els.questionTag.textContent = q.tag;
    els.questionText.textContent = q.text;
    els.choices.innerHTML = "";
    var selected = state.answers[q.id];
    LIKERT.forEach(function (opt) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice" + (selected === opt.value ? " is-selected" : "");
      btn.setAttribute("aria-pressed", selected === opt.value ? "true" : "false");
      btn.innerHTML =
        '<span class="choice__n">' +
        opt.value +
        "</span><span>" +
        opt.label +
        "</span>";
      btn.addEventListener("click", function () {
        choose(opt.value);
      });
      els.choices.appendChild(btn);
    });
    els.btnPrev.disabled = state.index === 0;
    var isLast = state.index === QUESTIONS.length - 1;
    els.btnNext.disabled = selected == null;
    els.btnNext.textContent = isLast ? "查看结果" : "下一题";
    renderProgress();
  }

  function choose(value) {
    var q = currentQuestion();
    state.answers[q.id] = value;
    saveStore();
    renderQuestion();
  }

  function normalized(q) {
    var raw = state.answers[q.id];
    if (raw == null) return null;
    return q.invert ? 6 - raw : raw;
  }

  function dimAverage(dim) {
    var list = QUESTIONS.filter(function (q) {
      return q.dim === dim;
    });
    var sum = 0;
    var n = 0;
    list.forEach(function (q) {
      var v = normalized(q);
      if (v != null) {
        sum += v;
        n += 1;
      }
    });
    if (!n) return null;
    return sum / n;
  }

  function computeScores() {
    var stress = toHundred(dimAverage("stress"));
    var emotion = toHundred(dimAverage("emotion"));
    var sleep = toHundred(dimAverage("sleep"));
    var relax = toHundred(dimAverage("relax"));
    return {
      stress: stress,
      emotion: emotion,
      sleep: sleep,
      relax: relax
    };
  }

  function pickSuggestions(scores) {
    var picked = [];
    function add(id) {
      if (picked.indexOf(id) === -1) picked.push(id);
    }
    if (scores.stress >= 60) {
      add("stress-breath");
      add("body-scan");
    }
    if (scores.emotion < 55) {
      add("emotion-soothe");
      add("body-mind");
    }
    if (scores.sleep < 55) {
      add("relax-sleep");
    }
    if (scores.relax >= 60) {
      add("morning-clarity");
      add("body-mind");
    }
    if (scores.stress < 45 && scores.emotion >= 60 && scores.sleep >= 60) {
      add("morning-clarity");
      add("body-mind");
    }
    if (!picked.length) {
      add("stress-breath");
      add("relax-sleep");
      add("emotion-soothe");
    }
    return picked
      .map(function (id) {
        return TRACKS.filter(function (t) {
          return t.id === id;
        })[0];
      })
      .filter(Boolean);
  }

  function toneForLoad(n) {
    if (n >= 70) return "此刻压力偏高，适合先慢下来，用呼吸把身体从警戒里接回来。";
    if (n >= 45) return "压力中等，可以给自己一小段不被打断的停顿。";
    return "压力负荷较轻，保持这份松弛即可。";
  }

  function toneForHigh(n, good, mid, low) {
    if (n >= 70) return good;
    if (n >= 45) return mid;
    return low;
  }

  function renderMeters(scores) {
    var rows = [
      {
        key: "stress",
        name: "压力负荷",
        value: scores.stress,
        kind: "load",
        better: "越低越好",
        hint: toneForLoad(scores.stress)
      },
      {
        key: "emotion",
        name: "情绪稳定",
        value: scores.emotion,
        kind: "good",
        better: "越高越好",
        hint: toneForHigh(
          scores.emotion,
          "情绪较为安稳，觉察本身已在起作用。",
          "情绪有起伏，温柔陪伴即可，不必急着修好。",
          "心情偏敏感，适合先被安抚，而不是立刻分析。"
        )
      },
      {
        key: "sleep",
        name: "睡眠质量",
        value: scores.sleep,
        kind: "good",
        better: "越高越好",
        hint: toneForHigh(
          scores.sleep,
          "睡眠恢复尚可，可继续用睡前仪式巩固。",
          "睡眠一般，晚间减少刺激会有帮助。",
          "睡眠偏碎，适合用安睡音频把神经系统慢慢下调。"
        )
      }
    ];
    els.meters.innerHTML = rows
      .map(function (row) {
        return (
          '<article class="meter meter--' +
          row.kind +
          '">' +
          '<div class="meter__head"><span class="meter__name">' +
          row.name +
          '</span><span class="meter__val">' +
          row.value +
          " · " +
          row.better +
          "</span></div>" +
          '<div class="meter__track"><div class="meter__fill" data-w="' +
          row.value +
          '"></div></div>' +
          '<p class="meter__hint">' +
          row.hint +
          "</p></article>"
        );
      })
      .join("");
    requestAnimationFrame(function () {
      Array.prototype.forEach.call(
        els.meters.querySelectorAll(".meter__fill"),
        function (bar) {
          bar.style.width = bar.getAttribute("data-w") + "%";
        }
      );
    });
  }

  function buildSummary(scores) {
    var cares = [];
    if (scores.stress >= 60) cares.push("压力");
    if (scores.emotion < 55) cares.push("情绪");
    if (scores.sleep < 55) cares.push("睡眠");
    var focus = cares.length ? cares.join("、") : "整体节律";
    var hour = new Date().getHours();
    var greeting =
      hour < 11 ? "清晨好。" : hour < 18 ? "日安。" : "夜深了，请对自己温柔一些。";
    return {
      intro: greeting + "以下是此刻的身心快照，仅供自我觉察。",
      body:
        "今天最值得被看见的是「" +
        focus +
        "」。分数不是诊断，只是一面小镜子：压力负荷越低越轻盈，情绪稳定与睡眠质量则越高越安稳。答案只留在这台手机的浏览器里。"
    };
  }

  function renderResults() {
    state.scores = computeScores();
    state.suggested = pickSuggestions(state.scores).map(function (t) {
      return t.id;
    });
    var copy = buildSummary(state.scores);
    els.resultsIntro.textContent = copy.intro;
    renderMeters(state.scores);
    els.summaryCard.innerHTML =
      "<h3>觉察摘要</h3><p>" + copy.body + "</p>";
    var tracks = state.suggested
      .map(function (id) {
        return findTrack(id);
      })
      .filter(Boolean);
    els.suggestBlock.innerHTML =
      "<h3>为你推荐</h3><p>根据今日三项指标，可先从这些官方冥想开始。</p><ul class=\"suggest-list\">" +
      tracks
        .map(function (t) {
          return (
            "<li><button type=\"button\" data-play=\"" +
            t.id +
            "\">" +
            t.title +
            " · " +
            t.desc +
            "</button></li>"
          );
        })
        .join("") +
      "</ul>";
    saveStore();
  }

  function findTrack(id) {
    for (var i = 0; i < TRACKS.length; i += 1) {
      if (TRACKS[i].id === id) return TRACKS[i];
    }
    return null;
  }

  function renderLibrary() {
    els.trackList.innerHTML = "";
    TRACKS.forEach(function (t) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "track" + (state.currentTrackId === t.id ? " is-current" : "");
      btn.innerHTML =
        '<span class="track__glyph" aria-hidden="true">♪</span>' +
        '<span class="track__meta"><p class="track__title">' +
        t.title +
        '</p><p class="track__desc">' +
        t.desc +
        "</p></span>";
      btn.addEventListener("click", function () {
        loadTrack(t.id, true);
      });
      li.appendChild(btn);
      els.trackList.appendChild(li);
    });
  }

  function setStatus(text) {
    els.playerStatus.textContent = text;
  }

  function loadTrack(id, autoplay) {
    var track = findTrack(id);
    if (!track) return;
    state.currentTrackId = id;
    els.player.hidden = false;
    els.playerTitle.textContent = track.title;
    els.audio.src = track.src;
    els.seek.value = "0";
    els.timeCur.textContent = "0:00";
    els.timeDur.textContent = "0:00";
    setStatus(autoplay ? "正在加载…" : "准备就绪");
    els.btnPlay.textContent = "▶";
    els.btnPlay.setAttribute("aria-label", "播放");
    renderLibrary();
    if (autoplay) {
      var playPromise = els.audio.play();
      if (playPromise && typeof playPromise.then === "function") {
        playPromise
          .then(function () {
            setStatus("播放中");
            els.btnPlay.textContent = "❚❚";
            els.btnPlay.setAttribute("aria-label", "暂停");
          })
          .catch(function () {
            setStatus("点按播放（浏览器需用户手势）");
          });
      }
    }
  }

  function togglePlay() {
    if (!state.currentTrackId) {
      loadTrack(TRACKS[0].id, true);
      return;
    }
    if (els.audio.paused) {
      els.audio.play().then(
        function () {
          setStatus("播放中");
          els.btnPlay.textContent = "❚❚";
          els.btnPlay.setAttribute("aria-label", "暂停");
        },
        function () {
          setStatus("无法播放，请检查音频文件");
        }
      );
    } else {
      els.audio.pause();
      setStatus("已暂停");
      els.btnPlay.textContent = "▶";
      els.btnPlay.setAttribute("aria-label", "播放");
    }
  }

  function syncSeekFromAudio() {
    if (state.seeking) return;
    var dur = els.audio.duration;
    if (!isFinite(dur) || dur <= 0) return;
    var pct = (els.audio.currentTime / dur) * 100;
    els.seek.value = String(Math.round(pct));
    els.timeCur.textContent = formatTime(els.audio.currentTime);
    els.timeDur.textContent = formatTime(dur);
  }

  function seekTo(pct) {
    var dur = els.audio.duration;
    if (!isFinite(dur) || dur <= 0) return;
    els.audio.currentTime = (clamp(Number(pct), 0, 100) / 100) * dur;
    els.timeCur.textContent = formatTime(els.audio.currentTime);
  }

  function goLibrary(from) {
    state.libFrom = from || state.view || VIEW_LANDING;
    renderLibrary();
    showView(VIEW_LIBRARY);
  }

  function startAssessment(fresh) {
    if (fresh) {
      state.index = 0;
      state.answers = {};
      state.scores = null;
      state.suggested = [];
    }
    showView(VIEW_ASSESSMENT);
    renderQuestion();
  }

  function finishAssessment() {
    if (answeredCount() < QUESTIONS.length) return;
    renderResults();
    showView(VIEW_RESULTS);
  }

  function restart() {
    clearStore();
    state.index = 0;
    state.answers = {};
    state.scores = null;
    state.suggested = [];
    state.view = VIEW_LANDING;
    startAssessment(true);
  }

  function restore() {
    var saved = loadStore();
    if (!saved) return;
    state.index = typeof saved.index === "number" ? saved.index : 0;
    state.answers = saved.answers || {};
    state.scores = saved.scores || null;
    state.suggested = saved.suggested || [];
    state.libFrom = saved.libFrom || VIEW_LANDING;
    if (saved.view === VIEW_ASSESSMENT && answeredCount()) {
      showView(VIEW_ASSESSMENT);
      renderQuestion();
    } else if (saved.view === VIEW_RESULTS && saved.scores) {
      renderResults();
      showView(VIEW_RESULTS);
    }
  }

  function onAction(action, source) {
    if (action === "start") startAssessment(true);
    if (action === "library") goLibrary(source);
    if (action === "restart") restart();
  }

  document.addEventListener("click", function (ev) {
    var t = ev.target.closest("[data-action]");
    if (t) {
      onAction(t.getAttribute("data-action"), state.view);
      return;
    }
    var play = ev.target.closest("[data-play]");
    if (play) {
      goLibrary(VIEW_RESULTS);
      loadTrack(play.getAttribute("data-play"), true);
    }
  });

  document.getElementById("btn-back-landing").addEventListener("click", function () {
    showView(VIEW_LANDING);
  });

  document.getElementById("btn-back-from-lib").addEventListener("click", function () {
    if (els.audio && !els.audio.paused) {
      els.audio.pause();
      setStatus("已暂停");
      els.btnPlay.textContent = "▶";
    }
    var back = state.libFrom || VIEW_LANDING;
    if (back === VIEW_RESULTS && state.scores) {
      renderResults();
      showView(VIEW_RESULTS);
    } else if (back === VIEW_ASSESSMENT) {
      showView(VIEW_ASSESSMENT);
      renderQuestion();
    } else {
      showView(VIEW_LANDING);
    }
  });

  els.btnPrev.addEventListener("click", function () {
    if (state.index > 0) {
      state.index -= 1;
      saveStore();
      renderQuestion();
    }
  });

  els.btnNext.addEventListener("click", function () {
    var q = currentQuestion();
    if (state.answers[q.id] == null) return;
    if (state.index < QUESTIONS.length - 1) {
      state.index += 1;
      saveStore();
      renderQuestion();
    } else {
      finishAssessment();
    }
  });

  els.btnPlay.addEventListener("click", togglePlay);

  els.seek.addEventListener("pointerdown", function () {
    state.seeking = true;
  });
  els.seek.addEventListener("pointerup", function () {
    state.seeking = false;
    seekTo(els.seek.value);
  });
  els.seek.addEventListener("input", function () {
    seekTo(els.seek.value);
  });
  els.seek.addEventListener("change", function () {
    state.seeking = false;
    seekTo(els.seek.value);
  });

  els.audio.addEventListener("timeupdate", syncSeekFromAudio);
  els.audio.addEventListener("loadedmetadata", function () {
    els.timeDur.textContent = formatTime(els.audio.duration);
    setStatus(els.audio.paused ? "准备就绪" : "播放中");
  });
  els.audio.addEventListener("play", function () {
    setStatus("播放中");
    els.btnPlay.textContent = "❚❚";
    els.btnPlay.setAttribute("aria-label", "暂停");
  });
  els.audio.addEventListener("pause", function () {
    if (els.audio.ended) return;
    setStatus("已暂停");
    els.btnPlay.textContent = "▶";
    els.btnPlay.setAttribute("aria-label", "播放");
  });
  els.audio.addEventListener("ended", function () {
    setStatus("已结束");
    els.btnPlay.textContent = "▶";
    els.btnPlay.setAttribute("aria-label", "播放");
    els.seek.value = "100";
    els.timeCur.textContent = formatTime(els.audio.duration);
  });
  els.audio.addEventListener("error", function () {
    setStatus("音频无法加载");
  });

  renderLibrary();
  restore();
})();
