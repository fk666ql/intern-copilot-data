# InternCopilot 公开岗位数据

本仓库只保存「实习副驾」的岗位同步脚本、来源配置和公开岗位快照，不包含站点 UI 源码、用户画像、投递记录或任何密钥。

- 数据来源：国家大学生就业服务平台（NCSS）公开接口、企业 Greenhouse 公开招聘板
- 自动更新：GitHub Actions 每天北京时间 02:17 运行（UTC 18:17），也支持手动触发
- 数据地址：https://fk666ql.github.io/intern-copilot-data/data/jobs.json
- 元信息：https://fk666ql.github.io/intern-copilot-data/data/meta.json

## 规则

- 不爬取需要登录的平台，不存密码或 Cookie，不自动申请。
- 同步失败时保留上一次成功的数据，并在 `meta.json` 标记 `stale: true`；两个来源都失败时不覆盖旧快照。
- 只有通过 `validate:data` 的数据才会提交和发布。
- 岗位数据来自公开页面，可能包含原页面中的联系方式；站点只展示公开信息，风险信号不定性为诈骗。

## 本地运行

```bash
npm ci
npm run sync
npm run validate:data
```

## 发布

工作流把新快照提交到 `main`，同时复制到 `docs/data`；GitHub Pages 从 `main` 的 `/docs` 目录构建，只发布数据目录。
