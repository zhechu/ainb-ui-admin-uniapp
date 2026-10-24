module.exports = {
  extends: ['@commitlint/config-conventional'],
  // 本工作区三仓统一的提交格式是全角：`type（范围）：中文描述`（见 C:\code\xpy\AGENTS.md）。
  // 上游 unibest 带来的是半角 conventional-commit 配置，两者对不上——全角冒号解析不出 type/subject，
  // 会报 `type may not be empty` + `subject may not be empty`。这里放宽 header 解析，两种分隔符都收，
  // 这样仓库历史里既有的 `fix(form-design): ...`（半角）与 `feat（系统）：...`（全角）都能通过。
  parserPreset: {
    parserOpts: {
      headerPattern: /^(\w+)(?:[（(]([^）)]*)[)）])?[：:]\s*(\S[\s\S]*)$/,
      headerCorrespondence: ['type', 'scope', 'subject'],
    },
  },
}
