# Blog Content Workflow

这个仓库现在不是只维护“生成后的静态页面”了，而是增加了一层可持续更新的内容工作流。

## 目录结构

- `content/site.json`：站点配置、首页文案、关于页补充信息。
- `content/posts/*.md`：文章内容源，使用 markdown + 简单 frontmatter。
- `content/pages/about.md`：关于页内容源。
- `scripts/build.mjs`：把内容源编译成当前主题对应的静态 HTML。
- `scripts/new-post.mjs`：生成新文章草稿。

## 更新文章

1. 新建草稿：`npm run new:post -- "文章标题" optional-slug`
2. 编辑 `content/posts/*.md`
3. 执行构建：`npm run build`
4. 检查生成后的静态页，再提交并推送。

## Frontmatter 字段

文章支持的主要字段：

- `title`
- `date`：格式 `YYYY-MM-DD`
- `path`：输出路径，例如 `/2026/07/06/my-post/`
- `summary`：卡片摘要
- `cover`：封面图路径
- `lead`：文章页导语
- `featured`：是否作为首页 featured post
- `category`：分类
- `tags`：标签数组
- `audio`：可选音乐链接数组

## 注意

生成后的 `index.html`、`archives/**`、`post/**`、文章页等仍然会保留在仓库里，因为 GitHub Pages 最终发布的就是这些静态文件。以后尽量不要直接手改这些生成结果，而是优先修改 `content/` 里的源文件再重新 build。
