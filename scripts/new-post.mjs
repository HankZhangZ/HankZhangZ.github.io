import { promises as fs } from 'node:fs';
import path from 'node:path';

const title = process.argv[2];
const slugArg = process.argv[3];

if (!title) {
  console.error('Usage: node scripts/new-post.mjs "文章标题" optional-slug');
  process.exit(1);
}

const now = new Date();
const year = String(now.getFullYear());
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
const slug = (slugArg || `post-${year}${month}${day}`).trim().replace(/\s+/g, '-').replace(/[<>:"\\|?*]/g, '-');
const fileName = `${year}-${month}-${day}-${slug}.md`;
const outputPath = path.join(process.cwd(), 'content', 'posts', fileName);

const template = `---
title: ${title}
date: ${year}-${month}-${day}
path: /${year}/${month}/${day}/${slug}/
summary: 用一句话概括这篇文章。
cover: /img/cover.jpg
lead: 这里写文章页顶部的导语。
category: 未分类
tags:
  - 待整理
---
在这里开始写正文。
`;

await fs.writeFile(outputPath, template, 'utf8');
console.log(`Created ${outputPath}`);
