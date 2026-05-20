---
name: github-triage
description: "只读 GitHub 分类：分析 issues 和 PRs。每个 item = 1 个后台任务（category: quick），生成带证据的报告到 /tmp/{datetime}/。每个声明都需要 GitHub permalink 作为证明。绝不执行任何 GitHub 写操作——不评论、不合并、不关闭、不加标签。仅输出报告。触发词：triage, triage issues, triage PRs, github triage, 分类, 分析 issues, 分析 PRs"
---

# GitHub Triage - 只读分析器

<role>
只读 GitHub 分类编排器。获取未关闭的 issues/PRs，进行分类，为每个 item 启动 1 个后台 `quick` 子 agent。每个子 agent 分析并写入报告文件。零 GitHub 写操作。
</role>

## 架构

**1 个 ISSUE/PR = 1 个 `task_create` = 1 个 `quick` 子 agent（后台）。无例外。**

| 规则 | 值 |
|------|-------|
| Category | `quick` |
| 执行方式 | `run_in_background=true` |
| 并行度 | 所有 item 同时执行 |
| 追踪 | 每个 item 一个 `task_create` |
| 输出 | `/tmp/{YYYYMMDD-HHmmss}/issue-{N}.md` 或 `pr-{N}.md` |

---

## 零操作策略（绝对规则）

<zero_action>
子 agent 绝不允许运行任何写入或修改 GitHub 状态的命令。

**禁止**（非完整列表）：
`gh issue comment`, `gh issue close`, `gh issue edit`, `gh pr comment`, `gh pr merge`, `gh pr review`, `gh pr edit`, `gh api -X POST`, `gh api -X PUT`, `gh api -X PATCH`, `gh api -X DELETE`

**允许**：
- `gh issue view`, `gh pr view`, `gh api`（仅 GET）— 读取 GitHub 数据
- `Grep`, `Read`, `Glob` — 读取代码库
- `Write` — 仅写入报告文件到 `/tmp/`
- `git log`, `git show`, `git blame` — 读取 git 历史（用于查找修复 commit）

**任何 GitHub 写操作 = 严重违规。**
</zero_action>

---

## 证据规则（强制）

<evidence>
**报告中的每个事实声明都必须包含 GitHub permalink 作为证明。**

permalink 是指向特定 commit 中特定行/范围的 URL，例如：
`https://github.com/{owner}/{repo}/blob/{commit_sha}/{path}#L{start}-L{end}`

### 如何生成 permalinks

1. 通过 Grep/Read 找到相关文件和行号。
2. 获取当前 commit SHA：`git rev-parse HEAD`
3. 构造：`https://github.com/{REPO}/blob/{SHA}/{filepath}#L{line}`（范围用 `#L{start}-L{end}`）

### 规则

- **没有 permalink = 没有声明。** 如果无法用 permalink 支持某个说法，请写"未找到证据"。
- 没有 permalink 的声明明确标记为 `[未验证]`，权重为零。
- 指向 `main`/`master`/`dev` 分支的 permalink 不可接受 — 仅使用 commit SHA。
- Bug 分析：permalink 指向问题代码。修复验证：permalink 指向修复 commit 的 diff。
</evidence>

---

## 阶段 0：初始化

```bash
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
REPORT_DIR="/tmp/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$REPORT_DIR"
COMMIT_SHA=$(git rev-parse HEAD)
```

将 `REPO`、`REPORT_DIR` 和 `COMMIT_SHA` 传递给每个子 agent。

---

## 阶段 1：获取所有未关闭的 items

```bash
# 获取基础元数据（不包含 body/comments 以避免 JSON 解析问题）
ISSUES_LIST=$(gh issue list --repo $REPO --state open --limit 500 \
  --json number,title,labels,author,createdAt)
ISSUE_COUNT=$(echo "$ISSUES_LIST" | jq length)

# 如需分页
if [ "$ISSUE_COUNT" -eq 500 ]; then
  LAST_DATE=$(echo "$ISSUES_LIST" | jq -r '.[-1].createdAt')
  while true; do
    PAGE=$(gh issue list --repo $REPO --state open --limit 500 \
      --search "created:<$LAST_DATE" \
      --json number,title,labels,author,createdAt)
    PAGE_COUNT=$(echo "$PAGE" | jq length)
    [ "$PAGE_COUNT" -eq 0 ] && break
    ISSUES_LIST=$(echo "$ISSUES_LIST" "$PAGE" | jq -s '.[0] + .[1] | unique_by(.number)')
    ISSUE_COUNT=$(echo "$ISSUES_LIST" | jq length)
    [ "$PAGE_COUNT" -lt 500 ] && break
    LAST_DATE=$(echo "$PAGE" | jq -r '.[-1].createdAt')
  done
fi

# PRs 同理
PRS_LIST=$(gh pr list --repo $REPO --state open --limit 500 \
  --json number,title,labels,author,headRefName,baseRefName,isDraft,createdAt)
PR_COUNT=$(echo "$PRS_LIST" | jq length)

if [ "$PR_COUNT" -eq 500 ]; then
  LAST_DATE=$(echo "$PRS_LIST" | jq -r '.[-1].createdAt')
  while true; do
    PAGE=$(gh pr list --repo $REPO --state open --limit 500 \
      --search "created:<$LAST_DATE" \
      --json number,title,labels,author,headRefName,baseRefName,isDraft,createdAt)
    PAGE_COUNT=$(echo "$PAGE" | jq length)
    [ "$PAGE_COUNT" -eq 0 ] && break
    PRS_LIST=$(echo "$PRS_LIST" "$PAGE" | jq -s '.[0] + .[1] | unique_by(.number)')
    PR_COUNT=$(echo "$PRS_LIST" | jq length)
    [ "$PAGE_COUNT" -lt 500 ] && break
    LAST_DATE=$(echo "$PAGE" | jq -r '.[-1].createdAt')
  done
fi

echo "Issues 总数: $ISSUE_COUNT, PRs 总数: $PR_COUNT"
```

---

## 阶段 2：分类

| 类型 | 检测方式 |
|------|-----------|
| `ISSUE_QUESTION` | `[Question]`, `[Discussion]`, `?`, "how to" / "why does" / "is it possible" |
| `ISSUE_BUG` | `[Bug]`, `Bug:`, 错误信息, 堆栈跟踪, 意外行为 |
| `ISSUE_FEATURE` | `[Feature]`, `[RFE]`, `[Enhancement]`, `Feature Request`, `Proposal` |
| `ISSUE_OTHER` | 其他 |
| `PR_BUGFIX` | 标题以 `fix` 开头，分支包含 `fix/`/`bugfix/`，标签 `bug` |
| `PR_OTHER` | 其他 |

---

## 阶段 3：启动子 agent（逐个工具调用）

**关键：使用独立的 `task_create` 工具调用逐个创建任务。绝不批量或脚本化。**

对每个 item，按顺序执行：

### 步骤 3.1：创建任务记录
```typescript
task_create(
  subject="分类: #{number} {title}",
  description="GitHub {issue|PR} 分类分析 - {type}",
  metadata={"type": "{ISSUE_QUESTION|ISSUE_BUG|ISSUE_FEATURE|ISSUE_OTHER|PR_BUGFIX|PR_OTHER}", "number": {number}}
)
```

### 步骤 3.2：启动分析子 agent（后台）
```typescript
task(
  category="quick",
  run_in_background=true,
  load_skills=[],
  prompt=SUBAGENT_PROMPT
)
```

**子 agent 绝对规则：**
- **仅分析** — 不在 GitHub 上执行任何操作（不评论、不合并、不关闭）
- **只读** — 仅使用工具读取代码/GitHub 数据
- **仅写报告** — 输出到 `{REPORT_DIR}/{issue|pr}-{number}.md`，通过 Write 工具
- **需要证据** — 每个声明必须有 GitHub permalink 作为证明

---

## 子 agent 提示词

### 通用前言（包含在所有子 agent 提示词中）

```
上下文：
- 仓库：{REPO}
- 报告目录：{REPORT_DIR}
- 当前 commit SHA：{COMMIT_SHA}

PERMALINK 格式：
每个事实声明必须包含 permalink：https://github.com/{REPO}/blob/{COMMIT_SHA}/{filepath}#L{start}-L{end}
没有 permalink = 没有声明。将未验证的声明标记为 [未验证]。
如需获取当前 SHA：git rev-parse HEAD

绝对规则（违反任何一条 = 严重失败）：
- 绝不运行 gh issue comment, gh issue close, gh issue edit
- 绝不运行 gh pr comment, gh pr merge, gh pr review, gh pr edit
- 绝不运行任何带 -X POST, -X PUT, -X PATCH, -X DELETE 的 gh 命令
- 绝不运行 git checkout, git fetch, git pull, git switch, git worktree
- 你唯一可写的输出：{REPORT_DIR}/{issue|pr}-{number}.md，通过 Write 工具
```

---

### ISSUE_QUESTION

```
你正在分析 {REPO} 的 issue #{number}。

项目：
- Issue #{number}：{title}
- 作者：{author}
- 正文：{body}
- 评论摘要：{comments_summary}

任务：
1. 理解问题。
2. 搜索代码库（Grep, Read）寻找答案。
3. 对每个发现，构造 permalink：https://github.com/{REPO}/blob/{COMMIT_SHA}/{path}#L{N}
4. 将报告写入 {REPORT_DIR}/issue-{number}.md

报告格式（将此作为文件内容写入）：

# Issue #{number}：{title}
**类型：** 问题 | **作者：** {author} | **创建时间：** {createdAt}

## 问题
[1-2 句摘要]

## 发现
[每个发现附带 permalink 证明。示例：]
- 配置解析位于 [`src/config/loader.ts#L42-L58`](https://github.com/{REPO}/blob/{SHA}/src/config/loader.ts#L42-L58)

## 建议答案
[带代码引用和 permalink 的草稿答案]

## 置信度：[高 | 中 | 低]
[原因。如果为低：缺少什么]

## 建议操作
[维护者应该做什么]

---
记住：没有 permalink = 没有声明。每个代码引用都需要 permalink。
```

---

### ISSUE_BUG

```
你正在分析 {REPO} 的 bug 报告 #{number}。

项目：
- Issue #{number}：{title}
- 作者：{author}
- 正文：{body}
- 评论摘要：{comments_summary}

任务：
1. 理解：预期行为、实际行为、复现步骤。
2. 搜索代码库中的相关代码。追踪逻辑。
3. 判定结论：CONFIRMED_BUG（确认 bug）、NOT_A_BUG（不是 bug）、ALREADY_FIXED（已修复）或 UNCLEAR（不明确）。
4. 对于 ALREADY_FIXED：使用 git log/git blame 找到修复 commit。包含 commit SHA 和变更内容。
5. 对每个发现，构造 permalink。
6. 将报告写入 {REPORT_DIR}/issue-{number}.md

查找"已修复"commit 的方法：
- 使用 `git log --all --oneline -- {file}` 查找相关文件近期变更
- 使用 `git log --all --grep="fix" --grep="{keyword}" --all-match --oneline` 搜索 commit message
- 使用 `git blame {file}` 查找最后修改相关行的人
- 使用 `git show {commit_sha}` 验证修复
- 构造 commit permalink：https://github.com/{REPO}/commit/{fix_commit_sha}

报告格式（将此作为文件内容写入）：

# Issue #{number}：{title}
**类型：** Bug 报告 | **作者：** {author} | **创建时间：** {createdAt}

## Bug 摘要
**预期：** [用户期望的行为]
**实际：** [实际发生的行为]
**复现：** [如果提供了复现步骤]

## 结论：[CONFIRMED_BUG | NOT_A_BUG | ALREADY_FIXED | UNCLEAR]

## 分析

### 证据
[每个证据附带 permalink。没有 permalink = 标记为 [未验证]]

### 根因（如果是 CONFIRMED_BUG）
[哪个文件、哪个函数、哪里出错]
- 问题代码：[`{path}#L{N}`](permalink)

### 为什么不是 Bug（如果是 NOT_A_BUG）
[带 permalink 的严格证明，说明当前行为是正确的]

### 修复详情（如果是 ALREADY_FIXED）
- **修复于 commit：** [`{short_sha}`](https://github.com/{REPO}/commit/{full_sha})
- **修复日期：** {date}
- **变更内容：** [带 diff permalink 的描述]
- **修复者：** {author}

### 阻碍因素（如果是 UNCLEAR）
[什么阻止了判定，下一步调查什么]

## 严重程度：[低 | 中 | 高 | 严重]

## 涉及文件
[带 permalink 的列表]

## 建议修复方案（如果是 CONFIRMED_BUG）
[具体方法："在 {file}#L{N}，将 X 改为 Y，因为 Z"]

## 建议操作
[维护者应该做什么]

---
关键：没有 permalink 的声明毫无价值。如果找不到证据，明确说明，而不是做出未验证的声明。
```

---

### ISSUE_FEATURE

```
你正在分析 {REPO} 的功能请求 #{number}。

项目：
- Issue #{number}：{title}
- 作者：{author}
- 正文：{body}
- 评论摘要：{comments_summary}

任务：
1. 理解需求。
2. 搜索代码库查找现有（部分/完整）实现。
3. 评估可行性。
4. 将报告写入 {REPORT_DIR}/issue-{number}.md

报告格式（将此作为文件内容写入）：

# Issue #{number}：{title}
**类型：** 功能请求 | **作者：** {author} | **创建时间：** {createdAt}

## 需求摘要
[用户想要什么]

## 现有实现：[完全存在 | 部分存在 | 不存在]
[如果存在：在哪里，带 permalink 指向实现]

## 可行性：[简单 | 中等 | 困难 | 需要架构调整]

## 相关文件
[带 permalink]

## 实现说明
[方法、陷阱、依赖]

## 建议操作
[维护者应该做什么]
```

---

### ISSUE_OTHER

```
你正在分析 {REPO} 的 issue #{number}。

项目：
- Issue #{number}：{title}
- 作者：{author}
- 正文：{body}
- 评论摘要：{comments_summary}

任务：评估并写入报告到 {REPORT_DIR}/issue-{number}.md

报告格式（将此作为文件内容写入）：

# Issue #{number}：{title}
**类型：** [问题 | Bug | 功能 | 讨论 | 元数据 | 过期]
**作者：** {author} | **创建时间：** {createdAt}

## 摘要
[1-2 句]

## 需要关注：[是 | 否]
## 建议标签：[如果有]
## 建议操作：[维护者应该做什么]
```

---

### PR_BUGFIX

```
你正在审查 {REPO} 的 PR #{number}。

项目：
- PR #{number}：{title}
- 作者：{author}
- 目标分支：{baseRefName} <- 源分支：{headRefName}
- 草稿：{isDraft} | 可合并：{mergeable}
- 审查状态：{reviewDecision} | CI：{statusCheckRollup_summary}
- 正文：{body}

任务：
1. 获取 PR 详情（只读）：gh pr view {number} --repo {REPO} --json files,reviews,comments,statusCheckRollup,reviewDecision
2. 读取 diff：gh api repos/{REPO}/pulls/{number}/files
3. 搜索代码库验证修复的正确性。
4. 将报告写入 {REPORT_DIR}/pr-{number}.md

报告格式（将此作为文件内容写入）：

# PR #{number}：{title}
**类型：** Bug 修复 | **作者：** {author}
**目标分支：** {baseRefName} <- {headRefName} | **草稿：** {isDraft}

## 修复摘要
[什么 bug，如何修复 — 带指向变更代码的 permalink]

## 代码审查

### 正确性
[修复是否正确？解决了根因吗？带 permalink 的证据]

### 副作用
[有风险的变更、破坏性变更 — 如果有的话带 permalink]

### 代码质量
[风格、模式、测试覆盖]

## 合并就绪状态

| 检查项 | 状态 |
|-------|--------|
| CI | [通过 / 失败 / 等待中] |
| 审查 | [已批准 / 要求变更 / 等待中 / 无] |
| 可合并 | [是 / 否 / 冲突] |
| 草稿 | [是 / 否] |
| 正确性 | [已验证 / 有疑虑 / 不明确] |
| 风险 | [无 / 低 / 中 / 高] |

## 变更文件
[带简要描述]

## 建议操作：[合并 / 要求变更 / 需要审查 / 等待]
[带证据的推理]

---
绝不合并。绝不评论。绝不审查。仅写入文件。
```

---

### PR_OTHER

```
你正在审查 {REPO} 的 PR #{number}。

项目：
- PR #{number}：{title}
- 作者：{author}
- 目标分支：{baseRefName} <- 源分支：{headRefName}
- 草稿：{isDraft} | 可合并：{mergeable}
- 审查状态：{reviewDecision} | CI：{statusCheckRollup_summary}
- 正文：{body}

任务：
1. 获取 PR 详情（只读）：gh pr view {number} --repo {REPO} --json files,reviews,comments,statusCheckRollup,reviewDecision
2. 读取 diff：gh api repos/{REPO}/pulls/{number}/files
3. 将报告写入 {REPORT_DIR}/pr-{number}.md

报告格式（将此作为文件内容写入）：

# PR #{number}：{title}
**类型：** [功能 | 重构 | 文档 | 日常 | 其他]
**作者：** {author}
**目标分支：** {baseRefName} <- {headRefName} | **草稿：** {isDraft}

## 摘要
[2-3 句，带指向关键变更的 permalink]

## 状态

| 检查项 | 状态 |
|-------|--------|
| CI | [通过 / 失败 / 等待中] |
| 审查 | [已批准 / 要求变更 / 等待中 / 无] |
| 可合并 | [是 / 否 / 冲突] |
| 风险 | [低 / 中 / 高] |
| 一致性 | [是 / 否 / 不明确] |

## 变更文件
[数量和关键文件]

## 阻碍因素
[如果有]

## 建议操作：[合并 / 要求变更 / 需要审查 / 关闭 / 等待]
[推理]

---
绝不合并。绝不评论。绝不审查。仅写入文件。
```

---

## 阶段 4：收集结果与更新

对每个任务轮询 `background_output()`。每个完成后：
1. 解析报告。
2. `task_update(id=task_id, status="completed", description=REPORT_SUMMARY)`
3. 立即流式输出给用户。

---

## 阶段 5：最终汇总

写入 `{REPORT_DIR}/SUMMARY.md` 并展示给用户：

```markdown
# GitHub 分类报告 - {REPO}

**日期：** {date} | **Commit：** {COMMIT_SHA}
**处理 items 数：** {total}
**报告目录：** {REPORT_DIR}

## Issues（{issue_count} 个）
| 分类 | 数量 |
|----------|-------|
| 确认 Bug | {n} |
| 已修复 Bug | {n} |
| 不是 Bug | {n} |
| 需要调查 | {n} |
| 问题已分析 | {n} |
| 功能已评估 | {n} |
| 其他 | {n} |

## PRs（{pr_count} 个）
| 分类 | 数量 |
|----------|-------|
| Bug 修复已审查 | {n} |
| 其他 PR 已审查 | {n} |

## 需要关注的项目
[每个 item：编号、标题、结论、1 句摘要、报告文件链接]

## 报告文件
[所有生成的文件路径]
```

---

## 反模式

| 违规行为 | 严重程度 |
|-----------|----------|
| 任何 GitHub 写操作（评论/关闭/合并/审查/加标签/编辑） | **严重** |
| 没有 permalink 的声明 | **严重** |
| 使用 `quick` 以外的 category | 严重 |
| 将多个 items 批量放入一个任务 | 严重 |
| `run_in_background=false` | 严重 |
| 在 PR 分支上 `git checkout` | 严重 |
| 没有代码库证据的猜测 | 高 |
| 未将报告写入 `{REPORT_DIR}` | 高 |
| permalink 中使用分支名而非 commit SHA | 高 |
