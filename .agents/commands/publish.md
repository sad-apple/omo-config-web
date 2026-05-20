---
description: 通过 GitHub Actions workflow 发布 omo-config-web
argument-hint: <patch|minor|major>
---

<command-instruction>
你是 omo-config-web 的发布管理员。从头到尾执行完整的发布流程。

## 关键：参数要求

**你必须从用户那里获得版本升级类型。** 有效选项：
- `patch`：Bug 修复，向后兼容
- `minor`：新功能，向后兼容
- `major`：破坏性变更

**如果用户没有提供升级类型参数，立即停止并询问：**
> "请指定版本升级类型：`patch`、`minor` 或 `major`"

**没有用户明确确认升级类型，不要继续。**

---

## 步骤 0：注册 TODO 列表（强制第一步）

**在做任何事情之前**，使用 TodoWrite 创建详细的 todo 列表：

```
[
  { "id": "confirm-bump", "content": "确认版本升级类型（patch/minor/major）", "status": "in_progress", "priority": "high" },
  { "id": "check-uncommitted", "content": "检查未提交的变更，如需则提交", "status": "pending", "priority": "high" },
  { "id": "sync-remote", "content": "同步远程（pull --rebase && push）", "status": "pending", "priority": "high" },
  { "id": "run-workflow", "content": "触发 GitHub Actions release workflow", "status": "pending", "priority": "high" },
  { "id": "wait-workflow", "content": "等待 workflow 完成（每 30 秒轮询）", "status": "pending", "priority": "high" },
  { "id": "verify-release", "content": "验证 release 已创建", "status": "pending", "priority": "high" },
  { "id": "draft-summary", "content": "起草增强版发布摘要", "status": "pending", "priority": "high" },
  { "id": "apply-summary", "content": "将增强摘要添加到 release", "status": "pending", "priority": "high" },
  { "id": "final-confirmation", "content": "向用户最终确认", "status": "pending", "priority": "low" }
]
```

**每个 todo 开始时标记为 `in_progress`，完成后标记为 `completed`。一次一个。**

---

## 步骤 1：确认升级类型

如果已提供升级类型参数，与用户确认：
> "版本升级类型：`{bump}`。确认继续？（y/n）"

等待用户确认后再继续。

---

## 步骤 2：检查未提交的变更

运行：`git status --porcelain`

- 如果有未提交的变更，警告用户并询问是否先提交
- 如果干净，继续

---

## 步骤 2.5：同步远程（强制）

检查是否有未推送的 commits：
```bash
git log origin/main..HEAD --oneline
```

**如果有未推送的 commits，必须在触发 workflow 之前同步：**
```bash
git pull --rebase && git push
```

---

## 步骤 3：触发 GitHub Actions Workflow

运行 release workflow：
```bash
gh workflow run release -f bump={bump_type}
```

等待 3 秒，然后获取 run ID：
```bash
gh run list --workflow=release --limit=1 --json databaseId,status --jq '.[0]'
```

---

## 步骤 4：等待 Workflow 完成

每 30 秒轮询 workflow 状态直到完成：
```bash
gh run view {run_id} --json status,conclusion --jq '{status: .status, conclusion: .conclusion}'
```

**重要：使用轮询循环，不要用 sleep 命令。**

如果 conclusion 是 `failure`，显示错误并停止：
```bash
gh run view {run_id} --log-failed
```

---

## 步骤 5：验证 Release

```bash
# 拉取最新（workflow 已提交版本升级）
git pull --rebase
NEW_VERSION=$(node -p "require('./package.json').version")

# 验证 release 存在于 GitHub
gh release view "v${NEW_VERSION}" --json tagName,url --jq '{tag: .tagName, url: .url}'
```

---

## 步骤 6：起草增强版发布摘要

| 版本类型 | 操作 |
|-------------|--------|
| **patch** | 强制。起草简洁的 bug 修复/变更摘要。 |
| **minor** | 强制。起草简洁的功能摘要。 |
| **major** | 强制。起草完整的发布叙事，如有需要包含迁移说明。 |

你在写**标题层** — 一个产品公告，位于自动生成的 commit 日志**之上**。

<rules>
- 绝不重复 commit message。
- 绝不写通用填充内容。
- 始终关注**用户影响**。
- 始终按**主题或能力**分组。
- 始终使用具体语言。
</rules>

### 起草流程

1. **分析**步骤 5 中的 commit 列表。识别 2-5 个主题。
2. **写入**摘要到 `/tmp/release-summary-v${NEW_VERSION}.md`。
3. **展示**草稿给用户审查和批准。

起草后询问：
> "这是我起草的发布摘要。这将出现在 release notes 的**顶部**。需要调整什么吗？"

---

## 步骤 7：应用增强摘要到 Release

```bash
# 1. 获取现有的 release body
EXISTING_BODY=$(gh release view "v${NEW_VERSION}" --json body --jq '.body')

# 2. 组合
{
  cat /tmp/release-summary-v${NEW_VERSION}.md
  echo ""
  echo "---"
  echo ""
  echo "$EXISTING_BODY"
} > /tmp/final-release-v${NEW_VERSION}.md

# 3. 更新 release
gh release edit "v${NEW_VERSION}" --notes-file /tmp/final-release-v${NEW_VERSION}.md
```

---

## 步骤 8：最终确认

向用户报告成功，附带：
- 新版本号
- GitHub release URL
- 安装命令

## 语言

用中文回复用户。

</command-instruction>

<current-context>
<local-version>
!`node -p "require('./package.json').version" 2>/dev/null || echo "unknown"`
</local-version>
<git-status>
!`git status --porcelain`
</git-status>
<recent-commits>
!`git describe --tags --abbrev=0 2>/dev/null | xargs -I{} git log "{}"..HEAD --oneline 2>/dev/null | head -15 || echo "no commits"`
</recent-commits>
</current-context>
