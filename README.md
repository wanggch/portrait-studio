# 人像工坊

转着看一个成年女性全身模型，把类别、主题和少量选项收成一条中文指令。复制后贴进 Claude Code 或 Codex，由本机的技能来写提示词。这个页面自己不写提示词。

类别对应的技能：

- 美女写真 → `/beauty-prompt`
- 内衣写真 → `/lingerie-prompt`
- 纪实抓拍 → `/candid-prompt`

人设和 9:16 竖幅已经由技能默认处理，页面上只作说明，不能改。数量默认 5，默认时不写进指令。没选的项目也不会写进去。

```bash
npm install
npm run dev
```

浏览器打开 http://127.0.0.1:5173 。上次填的内容留在这台浏览器里。

```bash
npm test
npm run test:e2e
npm run build
```
