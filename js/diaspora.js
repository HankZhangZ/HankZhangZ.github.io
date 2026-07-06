(function () {
  var body = document.body;
  var root = document.documentElement;

  function showToast(message) {
    var toast = document.querySelector(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("is-visible");

    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 1800);
  }

  function setupReveal() {
    var items = document.querySelectorAll(".reveal");

    if (!items.length) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      items.forEach(function (item) {
        item.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.2,
      }
    );

    items.forEach(function (item) {
      observer.observe(item);
    });
  }

  function setupNav() {
    var toggle = document.querySelector("[data-nav-toggle]");
    var nav = document.querySelector("[data-site-nav]");

    if (!toggle || !nav) {
      return;
    }

    toggle.addEventListener("click", function () {
      var expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      body.classList.toggle("menu-open", !expanded);
    });

    nav.addEventListener("click", function (event) {
      if (event.target instanceof HTMLElement && event.target.tagName === "A") {
        toggle.setAttribute("aria-expanded", "false");
        body.classList.remove("menu-open");
      }
    });
  }

  function setupScrollButtons() {
    document.querySelectorAll("[data-scroll-target]").forEach(function (button) {
      button.addEventListener("click", function () {
        var selector = button.getAttribute("data-scroll-target");
        var target = selector ? document.querySelector(selector) : null;

        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  }

  function setupCopyButtons() {
    document.querySelectorAll("[data-copy-link]").forEach(function (button) {
      button.addEventListener("click", function () {
        var url = button.getAttribute("data-copy-link") || window.location.href;

        if (!navigator.clipboard) {
          showToast("当前浏览器不支持复制");
          return;
        }

        navigator.clipboard
          .writeText(url)
          .then(function () {
            showToast("链接已复制");
          })
          .catch(function () {
            showToast("复制失败，请手动复制");
          });
      });
    });
  }

  function setupReadingProgress() {
    var progress = document.querySelector(".reading-progress");
    var article = document.querySelector("[data-reading-root]");

    if (!progress || !article) {
      return;
    }

    function updateProgress() {
      var rect = article.getBoundingClientRect();
      var scrollTop = window.scrollY || window.pageYOffset;
      var start = scrollTop + rect.top - 120;
      var total = Math.max(article.offsetHeight - window.innerHeight * 0.55, 1);
      var ratio = Math.min(Math.max((scrollTop - start) / total, 0), 1);
      progress.style.transform = "scaleX(" + ratio + ")";
    }

    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    updateProgress();
  }

  function setupAudio() {
    var audio = document.querySelector("[data-audio-player]");
    var panel = document.querySelector("[data-audio-panel]");
    var button = document.querySelector("[data-audio-toggle]");
    var label = document.querySelector("[data-audio-label]");

    if (!audio || !panel || !button) {
      return;
    }

    var tracks = Array.prototype.slice.call(
      document.querySelectorAll(".audio-playlist li")
    )
      .map(function (item) {
        return item.getAttribute("data-url");
      })
      .filter(Boolean);

    if (!tracks.length) {
      return;
    }

    var current = 0;
    audio.src = tracks[current];
    panel.classList.add("is-ready");
    button.hidden = false;

    function setState(playing) {
      button.textContent = playing ? "暂停随文音乐" : "播放随文音乐";
      if (label) {
        label.textContent = playing ? "正在播放精选曲目" : "点击按钮播放精选曲目";
      }
    }

    button.addEventListener("click", function () {
      if (audio.paused) {
        audio.play()
          .then(function () {
            setState(true);
          })
          .catch(function () {
            showToast("浏览器阻止了自动播放，请再试一次");
          });
      } else {
        audio.pause();
        setState(false);
      }
    });

    audio.addEventListener("pause", function () {
      setState(false);
    });

    audio.addEventListener("play", function () {
      setState(true);
    });

    audio.addEventListener("ended", function () {
      current = (current + 1) % tracks.length;
      audio.src = tracks[current];
      audio.play().catch(function () {
        setState(false);
      });
    });

    setState(false);
  }

  function setupDailyOracle() {
    var rootPanel = document.querySelector("[data-oracle-daily]");
    var button = document.querySelector("[data-daily-draw]");
    var result = document.querySelector("[data-daily-result]");

    if (!rootPanel || !button || !result) {
      return;
    }

    var fortunes = [
      {
        title: "上上签",
        tag: "势头顺",
        summary: "今天适合把已经想清楚的事情往前推进，不必再反复观望。",
        career: "事务面：适合确认方案、发起沟通、推进定稿。",
        action: "行动面：先做最关键的一步，而不是把精力分散出去。 "
      },
      {
        title: "上签",
        tag: "可求进",
        summary: "有进展空间，但更适合稳步发力，不适合一下压得太满。",
        career: "事务面：适合处理协作、汇总信息、推动中段任务。",
        action: "行动面：先解决一个真实阻塞点，比盲目加速更有效。 "
      },
      {
        title: "中上签",
        tag: "先整合",
        summary: "资源并不差，关键是别急着扩张，先把手头东西梳理顺。",
        career: "事务面：适合复盘、整理接口、补齐前置条件。",
        action: "行动面：把模糊问题写下来，答案往往会自己浮出来。 "
      },
      {
        title: "中签",
        tag: "守中平衡",
        summary: "今天不是靠运气出结果的一天，稳定节奏比追求惊喜更重要。",
        career: "事务面：适合维持现有推进，不宜临时大改方向。",
        action: "行动面：减少情绪化判断，按已验证路径执行。 "
      },
      {
        title: "中下签",
        tag: "先缓一步",
        summary: "事情未必不能做，但现在更适合多看一层背景，不宜硬推。",
        career: "事务面：适合核对边界、重新确认依赖和假设。",
        action: "行动面：今天的保守，不一定是退缩，可能是在避坑。 "
      },
      {
        title: "下签",
        tag: "避躁求稳",
        summary: "容易因为急于求成而放大波动，今天更该把心收回来。",
        career: "事务面：适合处理遗留问题，不适合拍板高风险决定。",
        action: "行动面：先停三分钟，再决定是否继续往前冲。 "
      },
      {
        title: "转机签",
        tag: "变中见路",
        summary: "表面上有变数，但变化本身可能就是新出口，不必过早下结论。",
        career: "事务面：适合把旧方案拆开看，可能会得到更轻的路径。",
        action: "行动面：今天适合问一句“有没有第三种做法”。 "
      }
    ];

    function hashDay(seed) {
      var hash = 0;
      for (var index = 0; index < seed.length; index += 1) {
        hash = (hash * 33 + seed.charCodeAt(index)) % 2147483647;
      }
      return hash;
    }

    function resolveTodayFortune() {
      var now = new Date();
      var dayKey = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0")
      ].join("-");
      var fortune = fortunes[hashDay(dayKey) % fortunes.length];
      return {
        dayKey: dayKey,
        fortune: fortune
      };
    }

    function renderTodayFortune() {
      var payload = resolveTodayFortune();
      result.hidden = false;
      result.querySelector("[data-fortune-title]").textContent = payload.fortune.title;
      result.querySelector("[data-fortune-tag]").textContent = payload.fortune.tag;
      result.querySelector("[data-fortune-date]").textContent = "日期： " + payload.dayKey;
      result.querySelector("[data-fortune-summary]").textContent = payload.fortune.summary;
      result.querySelector("[data-fortune-career]").textContent = payload.fortune.career;
      result.querySelector("[data-fortune-action]").textContent = payload.fortune.action;
    }

    button.addEventListener("click", renderTodayFortune);
  }

  function setupYaoOracle() {
    var result = document.querySelector("[data-yao-result]");
    var questionInput = document.querySelector("#oracle-question");
    var modeButtons = Array.prototype.slice.call(document.querySelectorAll("[data-yao-mode]"));
    var modePanels = Array.prototype.slice.call(document.querySelectorAll("[data-yao-panel]"));
    var coinButton = document.querySelector("[data-coin-toss]");
    var coinReset = document.querySelector("[data-coin-reset]");
    var timeButton = document.querySelector("[data-time-generate]");
    var coinStatus = document.querySelector("[data-coin-status]");
    var coinLog = document.querySelector("[data-coin-log]");
    var coinFaces = Array.prototype.slice.call(document.querySelectorAll("[data-coin-face]"));

    if (!result || !questionInput || !modeButtons.length) {
      return;
    }

    var lineMap = {
      6: { text: "老阴", yin: true, changing: true },
      7: { text: "少阳", yin: false, changing: false },
      8: { text: "少阴", yin: true, changing: false },
      9: { text: "老阳", yin: false, changing: true }
    };
    var trigrams = {
      "111": {
        name: "乾",
        label: "天",
        theme: "刚健、主动、开创",
        career: "适合定方向、立规矩、扛主责，但忌刚猛过头。",
        wealth: "财路偏主动获取，适合争取资源，不宜赌短期侥幸。",
        relationship: "表达直接，宜真诚但别压迫对方节奏。",
        health: "火气和精神消耗偏重，需留意休息与节律。",
        advice: "先立骨架，再谈扩张。",
        risk: "过强则折，最怕硬顶到底。"
      },
      "110": {
        name: "兑",
        label: "泽",
        theme: "交流、悦纳、协商",
        career: "利沟通、谈判、共识形成，适合拉齐外部关系。",
        wealth: "财务机会多来自合作、人脉、信息交换。",
        relationship: "感情重互动与回应，适合把话说明白。",
        health: "注意情绪透支、作息失衡与口腔咽喉类小问题。",
        advice: "把气氛放软，事情反而更好推。",
        risk: "只顾和气，容易避开真正矛盾。"
      },
      "101": {
        name: "离",
        label: "火",
        theme: "显化、判断、看清",
        career: "适合做判断、做展示、做梳理，但要防结论下得太快。",
        wealth: "财务重可见度与判断力，适合清理账目和识别真伪。",
        relationship: "容易因为期待被看见而敏感，需要更稳定的回应。",
        health: "心火偏旺，注意睡眠、眼疲劳和精神内耗。",
        advice: "把模糊处照亮，再决定下一步。",
        risk: "看见表象很容易，穿透表象更难。"
      },
      "100": {
        name: "震",
        label: "雷",
        theme: "启动、变化、突破",
        career: "利启动和破局，适合把卡住的事项先撬开。",
        wealth: "财务上可能有突发波动，先求反应快，再求布局稳。",
        relationship: "情绪来得快，宜先稳住自己，再讨论问题。",
        health: "注意压力下的紧绷、惊扰和作息突然失衡。",
        advice: "先动起来，但别一路猛冲。",
        risk: "只追求破局，容易忽略后续承接。"
      },
      "011": {
        name: "巽",
        label: "风",
        theme: "渗透、调整、循序",
        career: "适合慢慢推进、做协调、做细部渗透，不宜强压。",
        wealth: "财务更适合长期积累和稳健渗透，不利冒进。",
        relationship: "利柔和沟通，靠耐心和信任逐步打开局面。",
        health: "注意神经紧张、气血不畅与久坐带来的疲态。",
        advice: "不必硬碰硬，绕开正面阻力也能前进。",
        risk: "过于委婉，会把决定拖得过久。"
      },
      "010": {
        name: "坎",
        label: "水",
        theme: "险中求稳、反复校验",
        career: "过程多波折，适合边走边校验，不适合想当然。",
        wealth: "财务上宜保守，重风控、留余地、少做冲动判断。",
        relationship: "情感上容易有不安感，宜先给彼此明确边界。",
        health: "留意疲劳积累、肾水不足和情绪性消耗。",
        advice: "先过险，再谈快进。",
        risk: "如果忽略细节，问题会重复出现。"
      },
      "001": {
        name: "艮",
        label: "山",
        theme: "止、守、界限",
        career: "适合止损、收口、立边界，不一定适合继续铺开。",
        wealth: "财务宜守成，先稳现金流，再看后续动作。",
        relationship: "感情里要分清什么该坚持，什么该放下。",
        health: "关注脾胃、肩颈和长期积压形成的僵滞感。",
        advice: "知道何时停，比一直往前更难也更重要。",
        risk: "守得太死，容易错过真正该开的口子。"
      },
      "000": {
        name: "坤",
        label: "地",
        theme: "承载、配合、厚积",
        career: "适合打底、承接、补细节，利于长期稳定推进。",
        wealth: "财务以积累和守成为主，不宜贪快。",
        relationship: "适合多给支持和耐心，重长期可靠感。",
        health: "注意体能恢复、脾胃和湿滞带来的拖累。",
        advice: "先把土壤养厚，成果会慢慢长出来。",
        risk: "过度承接，会让自己变得被动。"
      }
    };
    var activeMode = "coins";
    var coinLines = [];
    var isCoinAnimating = false;

    function throwCoins() {
      var total = 0;
      var flips = [];
      for (var index = 0; index < 3; index += 1) {
        var value = Math.random() < 0.5 ? 2 : 3;
        total += value;
        flips.push(value === 2 ? "字" : "背");
      }
      return {
        total: total,
        flips: flips
      };
    }

    function hashText(seed) {
      var hash = 0;
      for (var index = 0; index < seed.length; index += 1) {
        hash = (hash * 33 + seed.charCodeAt(index)) % 2147483647;
      }
      return hash;
    }

    function getTrigram(lines) {
      var key = lines
        .map(function (line) {
          return line.yin ? "0" : "1";
        })
        .join("");
      return trigrams[key];
    }

    function buildHexagramProfile(rawLines) {
      var lower = getTrigram(rawLines.slice(0, 3));
      var upper = getTrigram(rawLines.slice(3, 6));
      var movingCount = rawLines.filter(function (line) {
        return line.changing;
      }).length;
      var yinCount = rawLines.filter(function (line) {
        return line.yin;
      }).length;
      var yangCount = rawLines.length - yinCount;
      var dominant = yinCount > yangCount ? "阴势更重" : yangCount > yinCount ? "阳势更重" : "阴阳均衡";
      var pace =
        movingCount === 0
          ? "局势偏静，宜观察和蓄势。"
          : movingCount <= 2
            ? "变化集中在局部，适合定点处理。"
            : movingCount <= 4
              ? "变化正在扩大，宜边修正边推进。"
              : "整体转向明显，宜重新看全局。";
      return {
        lower: lower,
        upper: upper,
        movingCount: movingCount,
        yinCount: yinCount,
        yangCount: yangCount,
        primaryName: "上" + upper.name + "下" + lower.name,
        changedName: "",
        dynamicSummary: dominant + "，" + pace,
        trigramPair: upper.label + "在上，" + lower.label + "在下"
      };
    }

    function buildInterpretation(profile, changedProfile, sourceLabel) {
      var movementTone =
        profile.movingCount === 0
          ? "眼下最重要的是看清结构，不要急于大动作。"
          : profile.movingCount <= 2
            ? "局势可调，关键在找准那个真正牵动全局的小点。"
            : profile.movingCount <= 4
              ? "事情已经在变，继续僵持不如主动调整策略。"
              : "大势转向明显，旧方法大概率已经不够用了。";
      var sourceTone =
        sourceLabel === "时间起卦"
          ? "这卦更像是借当前时机看气象，适合拿来判断节奏和时机。"
          : "这卦来自逐次投钱，信息更偏向你当下心念与问题重心的投射。";

      return {
        overview:
          "本卦呈现的是“" + profile.upper.theme + "”与“" + profile.lower.theme + "”叠加出来的局势。外部环境更像 " +
          profile.upper.label + "，内部驱动力更像 " + profile.lower.label + "。" + movementTone + sourceTone,
        career:
          "事业上看，外部更强调" + profile.upper.career + "，内部则提示你" + profile.lower.advice +
          "。如果现在要推进项目，优先处理结构和主次，不要同时开太多战线。" +
          (profile.movingCount >= 4 ? " 这不是修补局部就能解决的阶段，必要时要改方案或改节奏。" : " 先把最核心的节点打通，后续会顺很多。"),
        wealth:
          "财务上，本卦上层信息偏向“" + profile.upper.wealth + "”，下层则提醒“" + profile.lower.wealth +
          "”。如果近期涉及投资、采购、换工作或高额支出，更适合先看现金流和回撤承受力，再决定要不要出手。",
        relationship:
          "感情与人际上，表层关系更受“" + profile.upper.relationship + "”影响，内在真正的课题是“" +
          profile.lower.relationship + "”。这说明问题不一定出在表面事件本身，而往往出在节奏、回应方式和边界感。",
        health:
          "健康层面，上卦提示“" + profile.upper.health + "”，下卦提示“" + profile.lower.health +
          "”。如果最近本来就在熬夜、赶工或精神紧绷，这卦更偏向提醒你先把恢复力找回来，不然判断力也会跟着下降。",
        action:
          "行动建议是：先按本卦看现状，再按变卦看去向。当前宜抓“" + profile.lower.advice + "”，对外则用“" +
          profile.upper.advice + "”的方式推进。若一时拿不准，优先做低风险、可回收、能验证方向的小动作。",
        risk:
          "风险提醒在于：上层最怕“" + profile.upper.risk + "”，下层最怕“" + profile.lower.risk +
          "”。如果你明知道某件事已经不顺，却还想靠加码、硬扛或拖延去解决，那通常会把原本可控的问题放大。"
      };
    }

    function buildLineNode(line, changed) {
      var row = document.createElement("div");
      row.className = "yao-line-row";

      var visual = document.createElement("div");
      visual.className = "yao-line" + (changed ? " is-changed" : "") + (line.yin ? " is-yin" : " is-yang");

      if (line.yin) {
        visual.innerHTML = "<span></span><span></span>";
      } else {
        visual.innerHTML = "<span></span>";
      }

      var label = document.createElement("span");
      label.className = "yao-line-label";
      label.textContent = changed ? (line.changing ? "变" : "静") + " · " + line.text : line.text;

      row.appendChild(visual);
      row.appendChild(label);
      return row;
    }

    function buildChangedLine(line) {
      if (!line.changing) {
        return { text: line.text, yin: line.yin, changing: false };
      }

      return line.yin
        ? { text: "变阳", yin: false, changing: false }
        : { text: "变阴", yin: true, changing: false };
    }

    function judgementFromChangingCount(count) {
      if (count === 0) {
        return "这是一卦偏静的结果，重点通常不在立刻翻盘，而在先看清现状。";
      }
      if (count <= 2) {
        return "变爻不多，说明变化集中在局部，先处理眼前最关键的那个点。";
      }
      if (count <= 4) {
        return "这卦的变化不算小，适合先稳住节奏，再决定是否继续加码。";
      }
      return "多爻齐变，意味着整体态势正在改向，不宜只修补局部，可能要重看全局。";
    }

    function animateCoinFaces(flips) {
      if (!coinFaces.length) {
        return Promise.resolve();
      }

      coinFaces.forEach(function (face, index) {
        face.classList.remove("is-tail", "is-tossing");
        void face.offsetWidth;
        face.classList.add("is-tossing");

        window.setTimeout(function () {
          var isTail = flips[index] === "背";
          face.classList.toggle("is-tail", isTail);
          face.querySelector("span").textContent = isTail ? "背" : "字";
        }, 420);
      });

      return new Promise(function (resolve) {
        window.setTimeout(function () {
          coinFaces.forEach(function (face) {
            face.classList.remove("is-tossing");
          });
          resolve();
        }, 980);
      });
    }

    function setMode(nextMode) {
      activeMode = nextMode;
      modeButtons.forEach(function (button) {
        button.classList.toggle("is-active", button.getAttribute("data-yao-mode") === nextMode);
      });
      modePanels.forEach(function (panel) {
        panel.hidden = panel.getAttribute("data-yao-panel") !== nextMode;
      });
    }

    function renderCoinProgress() {
      if (!coinStatus || !coinLog) {
        return;
      }

      coinStatus.textContent = "当前进度：" + coinLines.length + " / 6";
      coinLog.hidden = coinLines.length === 0;
      coinLog.innerHTML = "";

      coinLines.forEach(function (entry, index) {
        var row = document.createElement("div");
        row.className = "coin-log-item";
        row.textContent =
          "第 " + (index + 1) + " 爻：" + entry.flips.join(" / ") + " -> " + entry.line.text + "（" + entry.total + "）";
        coinLog.appendChild(row);
      });
    }

    function renderYaoResult(rawLines, metaTime, sourceLabel) {
      var question = questionInput.value.trim() || "未填写具体问题";
      var profile = buildHexagramProfile(rawLines);
      var changedLines = rawLines.map(buildChangedLine);
      var changedProfile = buildHexagramProfile(changedLines);
      var interpretation = buildInterpretation(profile, changedProfile, sourceLabel);

      var primary = document.querySelector("[data-yao-primary]");
      var changed = document.querySelector("[data-yao-changed]");
      primary.innerHTML = "";
      changed.innerHTML = "";

      rawLines.slice().reverse().forEach(function (line) {
        primary.appendChild(buildLineNode(line, false));
      });

      changedLines
        .slice()
        .reverse()
        .forEach(function (line) {
          changed.appendChild(buildLineNode(line, true));
        });

      result.hidden = false;
      result.querySelector("[data-yao-question]").textContent = "所问： " + question;
      result.querySelector("[data-yao-time]").textContent = sourceLabel + " · " + metaTime;
      result.querySelector("[data-yao-primary-name]").textContent = profile.primaryName;
      result.querySelector("[data-yao-primary-theme]").textContent = "本卦气象：" + profile.upper.theme + "，内里主调：" + profile.lower.theme + "。";
      result.querySelector("[data-yao-changed-name]").textContent = "上" + changedProfile.upper.name + "下" + changedProfile.lower.name;
      result.querySelector("[data-yao-changed-theme]").textContent = "变卦去向：外势转向 " + changedProfile.upper.label + "，内势归于 " + changedProfile.lower.label + "。";
      result.querySelector("[data-yao-trigram-pair]").textContent = profile.trigramPair;
      result.querySelector("[data-yao-dynamic-summary]").textContent = profile.dynamicSummary;
      result.querySelector("[data-yao-judgement]").textContent = interpretation.overview + " " + judgementFromChangingCount(profile.movingCount);
      result.querySelector("[data-yao-lines]").textContent = "变爻数量： " + profile.movingCount + " / 6";
      result.querySelector("[data-yao-balance]").textContent =
        "阴阳分布：阴爻 " + profile.yinCount + "，阳爻 " + profile.yangCount + "。重心更偏向 " + (profile.yinCount >= profile.yangCount ? "蓄势与观察" : "行动与推进") + "。";
      result.querySelector("[data-yao-career]").textContent = interpretation.career;
      result.querySelector("[data-yao-wealth]").textContent = interpretation.wealth;
      result.querySelector("[data-yao-relationship]").textContent = interpretation.relationship;
      result.querySelector("[data-yao-health]").textContent = interpretation.health;
      result.querySelector("[data-yao-action]").textContent = interpretation.action;
      result.querySelector("[data-yao-risk]").textContent = interpretation.risk;
    }

    function generateTimeLines() {
      var now = new Date();
      var baseSeed =
        now.getFullYear() +
        (now.getMonth() + 1) * 31 +
        now.getDate() * 37 +
        now.getHours() * 41 +
        hashText(questionInput.value.trim());
      var values = [6, 7, 8, 9];
      var lines = [];

      for (var index = 0; index < 6; index += 1) {
        var seed = (baseSeed + index * 53 + now.getMinutes() * (index + 3)) % 2147483647;
        lines.push(lineMap[values[seed % values.length]]);
      }

      return {
        lines: lines,
        timeText: now.toLocaleString("zh-CN")
      };
    }

    modeButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        setMode(button.getAttribute("data-yao-mode"));
      });
    });

    if (coinButton) {
      coinButton.addEventListener("click", function () {
        if (isCoinAnimating || coinLines.length >= 6) {
          return;
        }

        var toss = throwCoins();
        isCoinAnimating = true;
        coinButton.disabled = true;

        animateCoinFaces(toss.flips).then(function () {
          coinLines.push({
            flips: toss.flips,
            total: toss.total,
            line: lineMap[toss.total]
          });
          renderCoinProgress();
          isCoinAnimating = false;
          coinButton.disabled = coinLines.length >= 6;

          if (coinLines.length === 6) {
            renderYaoResult(
              coinLines.map(function (entry) {
                return entry.line;
              }),
              new Date().toLocaleString("zh-CN"),
              "投铜钱"
            );
          }
        });
      });
    }

    if (coinReset) {
      coinReset.addEventListener("click", function () {
        coinLines = [];
        isCoinAnimating = false;
        if (coinButton) {
          coinButton.disabled = false;
        }
        coinFaces.forEach(function (face, index) {
          face.classList.remove("is-tail", "is-tossing");
          face.querySelector("span").textContent = index % 2 === 1 ? "坤" : "乾";
        });
        renderCoinProgress();
        result.hidden = true;
      });
    }

    if (timeButton) {
      timeButton.addEventListener("click", function () {
        var payload = generateTimeLines();
        renderYaoResult(payload.lines, payload.timeText, "时间起卦");
      });
    }

    renderCoinProgress();
    setMode(activeMode);
  }

  root.classList.remove("loading");
  body.classList.remove("loading");

  setupNav();
  setupReveal();
  setupScrollButtons();
  setupCopyButtons();
  setupReadingProgress();
  setupAudio();
  setupDailyOracle();
  setupYaoOracle();
})();
