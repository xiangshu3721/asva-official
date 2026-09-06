/**
 * 知人镜 · 线下推理引擎（规则 / 启发式 + 模板）
 *
 * ---------------------------------------------------------------------------
 * AI GATEWAY HOOK (plug later):
 *   Replace or augment `synthesize()` with a call to your trusted backend
 *   AI gateway. Keep ethics.check() as a mandatory pre-filter on the client
 *   AND re-validate on the server. Never put OpenAI/API keys in frontend.
 *   Example shape:
 *     // const remote = await fetch('/api/ask', { method:'POST', body: JSON.stringify({ person, intent, ethics }) });
 *     // if (remote.ok) return renderRemote(await remote.json());
 * ---------------------------------------------------------------------------
 */
(function (global) {
  "use strict";

  function tokenize(text) {
    var s = String(text || "").toLowerCase();
    var parts = s.split(/[\s,，。！？、；：:;!?./\\|()\[\]{}「」『』""''《》\n\r\t]+/);
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      if (parts[i] && parts[i].length >= 1) out.push(parts[i]);
    }
    var han = s.replace(/[^\u4e00-\u9fff]/g, " ");
    var chars = han.replace(/\s+/g, "");
    for (var j = 0; j < chars.length - 1; j++) {
      out.push(chars.substr(j, 2));
    }
    return out;
  }

  function scoreModule(mod, tokens, blob) {
    var score = 0;
    var why = [];
    var fields = [].concat(mod.tags || [], mod.askHints || [], [mod.name, mod.summary]);
    for (var i = 0; i < fields.length; i++) {
      var f = String(fields[i]).toLowerCase();
      if (!f) continue;
      if (blob.indexOf(f) !== -1) {
        score += 3;
        if (why.length < 3) why.push("命中「" + fields[i] + "」");
        continue;
      }
      for (var t = 0; t < tokens.length; t++) {
        if (tokens[t].length >= 2 && f.indexOf(tokens[t]) !== -1) {
          score += 1;
          break;
        }
      }
    }
    if (mod.tier === "A") score += 0.5;
    if (mod.tier === "C") score -= 0.3;
    return { id: mod.id, score: score, why: why, mod: mod };
  }

  function pickModules(person, intent, ethics) {
    var blob = (person + " " + intent).toLowerCase();
    var tokens = tokenize(blob);
    var modules = global.KB_MODULES || [];
    var scored = modules.map(function (m) {
      return scoreModule(m, tokens, blob);
    });
    scored.sort(function (a, b) {
      return b.score - a.score;
    });

    var chosen = [];
    var ids = {};

    function add(id, reason) {
      if (ids[id]) return;
      var m = global.KB_BY_ID[id];
      if (!m) return;
      ids[id] = true;
      chosen.push({ mod: m, reason: reason });
    }

    add("six-layer", "核心框架：建立可验证假设");
    add("hold-ethic", "伦理底座：看见为了抱持");

    if (/防骗|信任|合作|投资|借钱|骗子|靠谱|红旗|担保/.test(blob)) {
      add("anti-fraud", "诉求涉及信任 / 金钱 / 合作校准");
    }

    for (var i = 0; i < scored.length && chosen.length < 4; i++) {
      if (scored[i].score <= 0.5) continue;
      if (ids[scored[i].id]) continue;
      var reason = scored[i].why.length
        ? scored[i].why.join("；")
        : "与描述关键词相关";
      add(scored[i].id, reason);
    }

    if (chosen.length < 2) {
      add("attachment", "关系情境常用透镜");
      add("eight-motives", "理解驱动与底线");
    }
    return chosen.slice(0, 4);
  }

  function buildHypotheses(person, intent, chosen) {
    var blob = person + intent;
    var hyps = [];

    if (/冷淡|已读不回|疏远|不回消息|抽离/.test(blob)) {
      hyps.push({
        p: "中高",
        text: "对方可能正用「拉开距离」调节亲密压力（回避或暂时过载），而非单纯「不在乎」。需验证：独处后是否能温和重连。"
      });
    }
    if (/黏|不安|确认|分手|焦虑|怕被弃/.test(blob)) {
      hyps.push({
        p: "中",
        text: "关系里或许激活了焦虑依恋：对距离过度敏感，核心需要是可预期的回应与被珍视感。"
      });
    }
    if (/借钱|投资|合作|催|限时|回报|担保/.test(blob)) {
      hyps.push({
        p: "中高",
        text: "金钱/承诺/时间压力可能同时出现——需优先做信任校准，而非先解释人格动机。"
      });
    }
    if (/讨好|道歉|不敢拒绝|怕冲突/.test(blob)) {
      hyps.push({
        p: "中",
        text: "讨好可能是换取安全与关系的防御；表层顺从下或许是羞耻或被弃恐惧。验证：拒绝后是否有惩罚性反应。"
      });
    }
    if (/控制|发脾气|挑剔|完美/.test(blob)) {
      hyps.push({
        p: "中",
        text: "控制或完美要求，可能在对抗失控恐惧或羞耻；「过度即防御」。验证：在低利害情境是否仍同样用力。"
      });
    }
    if (/吵架|冲突|矛盾|冷战/.test(blob)) {
      hyps.push({
        p: "中",
        text: "冲突可能是未被满足的核心需要（被看见/自主/尊重）穿上了攻击或撤退的外衣。"
      });
    }
    if (/原生|爸|妈|家/.test(blob)) {
      hyps.push({
        p: "中低",
        text: "当下反应或带有原生脚本回声（移情）。需区分「对方是谁」与「TA 像旧客体的谁」。"
      });
    }

    if (hyps.length < 2) {
      hyps.push({
        p: "中",
        text: "对方当下行为服务于某个即时目的（求安全、求认可、保自主或避羞耻）。用「三问」探：怕什么、护什么、需要什么。"
      });
    }
    if (hyps.length < 3) {
      hyps.push({
        p: "中低",
        text: "反应强度若远超事件本身，可能触到早期脚本；此时宜放慢，先稳住关系安全再谈深层。"
      });
    }
    return hyps.slice(0, 3);
  }

  function buildClues(person, intent) {
    var clues = [
      "在至少两个不同情境下，观察对方言行是否一致（对你 / 对他人 / 对利益）。",
      "温和提问：「当你……的时候，你最担心的是什么？」听内容也听回避点。",
      "做一个小边界实验（温和说不或推迟决定），看对方修复方式：尊重、协商，还是惩罚、道德绑架。"
    ];
    var blob = person + intent;
    if (/借钱|投资|合作/.test(blob)) {
      clues.push("要求可核实信息与冷静期；异常催促本身即是信号。");
    }
    if (/恋爱|交往|伴侣|喜欢/.test(blob)) {
      clues.push("观察冲突后的修复：是否承认影响、是否有具体改变，而非只有甜言。");
    }
    if (/沟通|说话|表达/.test(blob)) {
      clues.push("尝试调整信息包装（先要点或先共情），看误解是否下降——区分「人不合」与「编码不合」。");
    }
    return clues.slice(0, 5);
  }

  function buildHoldTips(intent, chosen) {
    var tips = [
      "用「我注意到……我在想是不是……」代替定性标签；给对方否认与修正的空间。",
      "先回应可能的核心需要（安全、被看见、自主），再谈具体事项。",
      "守住你的边界：理解对方 ≠ 答应伤害自己的条件。"
    ];
    var ids = chosen.map(function (c) { return c.mod.id; });
    if (ids.indexOf("love-care") !== -1 || /支持|爱|关心|抱持/.test(intent)) {
      tips.push("问清对方「觉得被支持」的具体样子，小剂量给予并看反馈。");
    }
    if (ids.indexOf("disc") !== -1) {
      tips.push("按对方沟通偏好调整节奏与细节量，目标是被听懂，不是赢。");
    }
    if (ids.indexOf("anti-fraud") !== -1) {
      tips.push("自保时语气仍可尊重：暂缓、核实、书面化——保护自己不是审判。");
    }
    return tips.slice(0, 4);
  }

  function rightViewLine(ethics, intent) {
    if (ethics.status === "soft") {
      return "先校准意图：从「让对方按我的意愿行动」转向「看清匹配、真诚表达、彼此自由」。";
    }
    if (/防骗|信任|借钱|投资|合作/.test(intent)) {
      return "正见：保护自己是责任；清醒的慈悲包含说不的能力。";
    }
    if (/支持|帮|抱持|理解/.test(intent)) {
      return "正见：看见是为了抱持；帮助有边界，你不是对方的拯救者。";
    }
    return "正见：假设而非标签；概率而非定论；理解对方，也忠于自己的边界。";
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderResult(data) {
    var h = "";
    if (data.crisis) {
      h += '<div class="banner banner-crisis" role="alert">若你或对方处于危机（自伤、他伤、家暴等），请优先联系当地紧急服务或专业心理危机热线。本工具不能替代专业帮助。</div>';
    }
    if (data.softMessage) {
      h += '<div class="banner banner-soft" role="status">' + escapeHtml(data.softMessage) + "</div>";
    }

    h += '<section class="result-block"><h3>正见校准</h3><p class="lead">' + escapeHtml(data.rightView) + "</p></section>";

    h += '<section class="result-block"><h3>选用透镜</h3><ul class="lens-list">';
    data.lenses.forEach(function (L) {
      h +=
        "<li><a href=\"module.html?id=" +
        encodeURIComponent(L.mod.id) +
        '">' +
        escapeHtml(L.mod.name) +
        "</a><span class=\"muted\"> — " +
        escapeHtml(L.reason) +
        "</span></li>";
    });
    h += "</ul></section>";

    h += '<section class="result-block"><h3>六层假设</h3><p class="muted tiny">以下为待验证的概率假设，不是定论。</p><ol>';
    data.hypotheses.forEach(function (hp) {
      h +=
        "<li><span class=\"tag-prob\">概率 " +
        escapeHtml(hp.p) +
        "</span> " +
        escapeHtml(hp.text) +
        "</li>";
    });
    h += "</ol></section>";

    h += '<section class="result-block"><h3>可观察线索与验证问题</h3><ol>';
    data.clues.forEach(function (c) {
      h += "<li>" + escapeHtml(c) + "</li>";
    });
    h += "</ol></section>";

    h += '<section class="result-block"><h3>抱持 / 沟通建议</h3><ul>';
    data.hold.forEach(function (t) {
      h += "<li>" + escapeHtml(t) + "</li>";
    });
    h += "</ul></section>";

    h +=
      '<section class="result-block"><h3>边界与误判提醒</h3><ul>' +
      "<li>未经验证的假设不可当作指控或人格判决。</li>" +
      "<li>状态≠特质；糟糕的一天不能定义一个人。</li>" +
      "<li>文化/象征透镜（若选用）仅供启发，不作科学证据或宿命论断。</li>" +
      "<li>本结果由线下启发式引擎生成，非医疗或心理诊断。</li>" +
      "</ul></section>";

    return h;
  }

  function runAsk(personText, intentText) {
    var person = String(personText || "").trim();
    var intent = String(intentText || "").trim();

    if (person.length + intent.length < 12) {
      return {
        ok: false,
        kind: "empty",
        html:
          '<div class="banner banner-empty" role="status">再多写一点具体就好——例如对方近期的一句原话、一个场景，以及你真正想看清或守住的是什么。细节越多，透镜越准。</div>'
      };
    }

    var ethics = global.Ethics.check(person, intent);
    if (ethics.status === "reject") {
      return {
        ok: false,
        kind: "reject",
        html:
          '<div class="banner banner-reject" role="alert"><strong>未通过正见门禁</strong><p>' +
          escapeHtml(ethics.message) +
          "</p><p class=\"muted\">知人镜存在的意义是：避免被欺、理解关系、以慈悲抱持——而非操控与伤害。</p></div>"
      };
    }

    var effectiveIntent = ethics.reframedIntent || intent;
    var lenses = pickModules(person, effectiveIntent, ethics);
    var data = {
      rightView: rightViewLine(ethics, effectiveIntent),
      lenses: lenses,
      hypotheses: buildHypotheses(person, effectiveIntent, lenses),
      clues: buildClues(person, effectiveIntent),
      hold: buildHoldTips(effectiveIntent, lenses),
      softMessage: ethics.message || "",
      crisis: !!ethics.crisis
    };

    return { ok: true, kind: "result", html: renderResult(data), data: data };
  }

  global.AskEngine = {
    run: runAsk,
    pickModules: pickModules
  };
})(window);
