/**
 * 知人镜 · 伦理门禁
 * 先于引擎合成运行；拒绝操控/伤害意图，软提示边界诉求，允许自保与理解。
 */
(function (global) {
  "use strict";

  var REJECT_PATTERNS = [
    /控制\s*(他|她|对方|人)/,
    /操纵|操控/,
    /欺骗|骗(他|她|人|钱)|诈骗|传销套路/,
    /套路|话术操控|情感操控/,
    /报复|报仇|整(他|她)|搞垮/,
    /挖墙脚|撬(走|了)?(他|她)/,
    /PUA|pua|煤气灯|精神控制/,
    /下药|迷药|春药/,
    /威胁|恐吓|勒索|敲诈/,
    /窃听|偷听|跟踪|监视器|定位不告知/,
    /如何让对方离不开我/,
    /让(他|她)离不开/,
    /强迫(爱|发生|发生关系)|迷奸/,
    /怎么骗|如何骗钱|杀猪盘|钓鱼欺诈/,
    /使人上瘾式依赖|制造依赖好控制/,
    /毁(掉|了)(他|她)的(名声|人生|家庭)/,
    /人肉|网暴|曝光隐私报复/
  ];

  var SOFT_WARN_PATTERNS = [
    { re: /说服成交|逼单|洗脑式销售|让客户无法拒绝/, tip: "成交可以谈，但请转向「真诚匹配与清晰边界」：适合的人留下，不适合的人被尊重地离开，而不是被话术困住。" },
    { re: /让(他|她)听我的|改变(他|她)的想法强硬|洗脑/, tip: "影响他人可以基于坦诚表达与共同利益；请避免把对方当客体。下方将按「真诚沟通」重新框定。" },
    { re: /考验(他|她)|故意冷暴力看反应/, tip: "「考验」易伤信任。更稳妥的是直接观察一致性与边界，而非设局。" },
    { re: /拿捏|吊着(他|她)|若即若离套路/, tip: "吸引力若建立在不安全感上，关系难长久。建议转向清晰表达需要与看匹配度。" }
  ];

  var ALLOW_HINTS = [
    /防骗|骗子|信任|靠谱|红旗/,
    /理解|冲突|沟通|吵架|矛盾/,
    /合作|恋爱|相亲|交往|适不适合|匹配/,
    /支持|抱持|陪伴|如何帮|关心/,
    /看见|需要|动机|依恋|防御/,
    /自保|边界|借钱|投资风险/,
    /原生家庭|情绪|为什么这样/
  ];

  var CRISIS_PATTERNS = [
    /自杀|自伤|结束生命|不想活/,
    /家暴|虐待|性侵/,
    /精神分裂|幻觉.*命令|重度抑郁/
  ];

  function normalize(text) {
    return String(text || "").trim().toLowerCase();
  }

  /**
   * @returns {{ status: 'reject'|'soft'|'allow', message: string, reframedIntent?: string, crisis?: boolean }}
   */
  function checkEthics(personText, intentText) {
    var combined = normalize(personText + "\n" + intentText);
    var intent = normalize(intentText);

    if (!intent && !normalize(personText)) {
      return { status: "allow", message: "", empty: true };
    }

    var crisis = CRISIS_PATTERNS.some(function (re) { return re.test(combined); });

    for (var i = 0; i < REJECT_PATTERNS.length; i++) {
      if (REJECT_PATTERNS[i].test(combined)) {
        return {
          status: "reject",
          message: "此诉求触及操控、伤害或违法伤害他人的意图。知人镜拒绝协助。若你正在受伤，请转向自保、边界与可信支持；若有危机，请联系当地紧急援助或专业热线。",
          crisis: crisis
        };
      }
    }

    for (var j = 0; j < SOFT_WARN_PATTERNS.length; j++) {
      var sw = SOFT_WARN_PATTERNS[j];
      if (sw.re.test(combined)) {
        return {
          status: "soft",
          message: sw.tip,
          reframedIntent: intent
            .replace(/说服成交|逼单|洗脑式销售|让客户无法拒绝/g, "判断是否真诚匹配并清晰沟通")
            .replace(/拿捏|吊着|若即若离套路/g, "清晰表达需要并观察匹配")
            .replace(/考验|故意冷暴力看反应/g, "观察一致性与边界"),
          crisis: crisis
        };
      }
    }

    return {
      status: "allow",
      message: crisis
        ? "侦测到可能需要专业支持的议题。以下内容仅作关系理解参考，不能替代医疗或心理危机干预。"
        : "",
      crisis: crisis
    };
  }

  global.Ethics = {
    check: checkEthics,
    ALLOW_HINTS: ALLOW_HINTS
  };
})(window);
