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

    if (!result || !questionInput || !modeButtons.length) {
      return;
    }

    var lineMap = {
      6: { text: "老阴", yin: true, changing: true },
      7: { text: "少阳", yin: false, changing: false },
      8: { text: "少阴", yin: true, changing: false },
      9: { text: "老阳", yin: false, changing: true }
    };
    var activeMode = "coins";
    var coinLines = [];

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
      var movingCount = 0;
      var yinCount = 0;
      var yangCount = 0;

      rawLines.forEach(function (line) {
        movingCount += line.changing ? 1 : 0;
        yinCount += line.yin ? 1 : 0;
        yangCount += line.yin ? 0 : 1;
      });

      var primary = document.querySelector("[data-yao-primary]");
      var changed = document.querySelector("[data-yao-changed]");
      primary.innerHTML = "";
      changed.innerHTML = "";

      rawLines.slice().reverse().forEach(function (line) {
        primary.appendChild(buildLineNode(line, false));
      });

      rawLines
        .slice()
        .reverse()
        .map(buildChangedLine)
        .forEach(function (line) {
          changed.appendChild(buildLineNode(line, true));
        });

      result.hidden = false;
      result.querySelector("[data-yao-question]").textContent = "所问： " + question;
      result.querySelector("[data-yao-time]").textContent = sourceLabel + " · " + metaTime;
      result.querySelector("[data-yao-judgement]").textContent = judgementFromChangingCount(movingCount);
      result.querySelector("[data-yao-lines]").textContent = "变爻数量： " + movingCount + " / 6";
      result.querySelector("[data-yao-balance]").textContent =
        "阴阳分布：阴爻 " + yinCount + "，阳爻 " + yangCount + "。重心更偏向 " + (yinCount >= yangCount ? "蓄势与观察" : "行动与推进") + "。";
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
        var toss = throwCoins();
        coinLines.push({
          flips: toss.flips,
          total: toss.total,
          line: lineMap[toss.total]
        });
        renderCoinProgress();

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
    }

    if (coinReset) {
      coinReset.addEventListener("click", function () {
        coinLines = [];
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
