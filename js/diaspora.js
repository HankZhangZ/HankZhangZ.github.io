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

  root.classList.remove("loading");
  body.classList.remove("loading");

  setupNav();
  setupReveal();
  setupScrollButtons();
  setupCopyButtons();
  setupReadingProgress();
  setupAudio();
})();
