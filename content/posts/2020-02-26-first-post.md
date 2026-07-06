---
title: 第一篇博文？
date: 2020-02-26
path: /2020/02/26/New/
summary: 建站早期踩坑实录：命名、部署和文档阅读习惯，都是从这里开始补课的。
cover: /img/cover.jpg
lead: 最早的一篇中文建站记录，现在被重新整理为更适合阅读的版本。
category: 建站记录
tags:
  - Hexo
  - GitHub Pages
  - 建站
  - 踩坑
audio:
  - http://link.hhtjim.com/163/5146554.mp3
  - http://link.hhtjim.com/qq/001faIUs4M2zna.mp3
---
好的，在某人多次提醒下，我终于把建站时遇到的问题记下来。

1. Windows 下的命令行不要硬扛，不熟就先去查文档。
2. GitHub Pages 个人站点仓库名必须和自己的用户名一致，否则很容易一路 404。
3. 改完内容别忘了重新生成并部署，`hexo d` 之后也可能需要等一会儿。

后来回头看，这些问题其实都不复杂，难的是一开始没建立起查文档和对照配置的习惯。

官方文档依旧是最值得看的入口：

- [Hexo 模板文档](https://hexo.io/zh-cn/docs/templates)
- [Hexo 写作与 Scaffold](https://hexo.io/zh-cn/docs/writing#%E6%A8%A1%E7%89%88%EF%BC%88Scaffold%EF%BC%89)

> 看见文档里的 `[]`、`<>` 这类占位内容，第一反应应该是“替换成真实值”，而不是照抄过去。

额外一个建议：如果可以，尽量用 SSH，把部署和拉取流程都跑顺，会省很多重复劳动。
