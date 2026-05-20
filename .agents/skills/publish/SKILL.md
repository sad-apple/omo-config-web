---
name: publish
description: "通过 GitHub Actions workflow 发布 omo-config-web。参数：<patch|minor|major>。触发词：publish, release, deploy, 发布, 发版, 部署"
---

你是 omo-config-web 的发布管理员。从头到尾执行完整的发布流程。

## 关键：完整工作流包含 Discord

发布不仅仅是在 GitHub 上创建 release。

- **不要在创建 GitHub release 后就停止。**
- **不要在起草或应用发布说明后就停止。**
- **如果用户已经确认发布，不要等待第二次确认。**
- 发布说明定稿后，立即执行 Discord 发布步骤。
- 如果 Discord 发布在认证/重试后仍然失败，明确报告失败并继续剩余验证步骤。跳过 Discord 步骤等于工作流失败。

## 关键：参数要求

**你必须从用户那里获得版本升级类型。** 有效选项：
- `patch`：Bug 修复，向后兼容（1.1.7 → 1.1.8）
- `minor`：新功能，向后兼容（1.1.7 → 1.2.0）
- `major`：破坏性变更（1.1.7 → 2.0.0）

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
  { "id": "sync-remote", "content": "同步远程（pull --rebase && push 如果有未推送的 commits）", "status": "pending", "priority": "high" },
  { "id": "run-workflow", "content": "触发 GitHub Actions release workflow", "status": "pending", "priority": "high" },
  { "id": "wait-workflow", "content": "等待 workflow 完成（每 30 秒轮询）", "status": "pending", "priority": "high" },
  { "id": "verify-release", "content": "验证 release 已创建 + 预览自动生成的变更日志", "status": "pending", "priority": "high" },
  { "id": "draft-summary", "content": "起草增强版发布摘要（所有版本类型都强制要求）", "status": "pending", "priority": "high" },
  { "id": "apply-summary", "content": "将增强摘要添加到 release", "status": "pending", "priority": "high" },
  { "id": "final-confirmation", "content": "向用户最终确认，附带链接", "status": "pending", "priority": "low" }
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

这确保 GitHub Actions workflow 在最新代码上运行，包含所有本地 commits。

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

状态流程：`queued` → `in_progress` → `completed`

**重要：使用轮询循环，不要用 sleep 命令。**

如果 conclusion 是 `failure`，显示错误并停止：
```bash
gh run view {run_id} --log-failed
```

---

## 步骤 5：验证 Release 并预览自动生成内容

两个目标：确认 release 已创建，然后向用户展示 workflow 自动生成的内容。

```bash
# 拉取最新（workflow 已提交版本升级）
git pull --rebase
NEW_VERSION=$(node -p "require('./package.json').version")

# 验证 release 存在于 GitHub
gh release view "v${NEW_VERSION}" --json tagName,url --jq '{tag: .tagName, url: .url}'
```

**验证后，生成本地预览自动生成内容：**

```bash
# 查看自上次 tag 以来的 commits
git describe --tags --abbrev=0 2>/dev/null | xargs -I{} git log "{}"..HEAD --oneline
```

<agent-instruction>
运行预览后，向用户展示输出并说：

> **以下内容已自动包含在 release 中：**
> - Commit 变更日志（按 feat/fix/refactor 分组）
>
> 你不需要写这些。已经处理好了。
>
> **所有版本类型**都需要增强版摘要 — 我将在下一步起草。

等待用户确认后再继续。

如果用户已经确认发布流程且没有明确要求在编辑 release notes 之前审查自动生成的变更日志，将发布确认视为足够的确认并继续。不要在此结束 assistant 回合。
</agent-instruction>

---

## 步骤 6：起草增强版发布摘要

<decision-gate>

| 版本类型 | 操作 |
|-------------|--------|
| **patch** | 强制。起草简洁的 bug 修复/变更摘要。没有摘要不能继续。 |
| **minor** | 强制。起草简洁的功能摘要。没有摘要不能继续。 |
| **major** | 强制。起草完整的发布叙事，如有需要包含迁移说明。没有摘要不能继续。 |

</decision-gate>

### 你在写什么（以及你不写什么）

你在写**标题层** — 一个产品公告，位于自动生成的 commit 日志**之上**。想"发布博客文章"，而不是"git log"。

<rules>
- 绝不重复 commit message。自动生成的部分已经列出了每个 commit。
- 绝不写通用填充内容，如"各种 bug 修复和改进"或"多项增强"。
- 始终关注**用户影响**：用户现在能做什么以前不能做的？
- 始终按**主题或能力**分组，而不是按 commit 类型（feat/fix/refactor）。
- 始终使用具体语言："你现在可以做 X"而不是"添加了 X 功能"。
</rules>

<examples>
<bad title="Commit 重复 — 不要这样做">
## 更新内容
- feat(auth): 添加 JWT 刷新令牌轮换
- fix(auth): 处理过期令牌边缘情况
- refactor(auth): 提取中间件
</bad>

<good title="用户影响叙事 — 这样做">
## 🔐 更智能的身份验证

令牌刷新现在是自动且无缝的。会话不再在任务中途过期 — 系统在后台静默轮换凭证。如果你一直被随机登出困扰，这个版本修复了这个问题。
</good>

<bad title="模糊填充 — 不要这样做">
## 改进
- 各种性能改进
- Bug 修复和稳定性增强
</bad>

<good title="具体且可衡量 — 这样做">
## ⚡ 3 倍更快的规则解析

规则现在按文件修改时间缓存。如果你的项目有 50+ 个规则文件，你会注意到启动明显变快 — 我们在测试套件中测量到 3 倍的改进。
</good>
</examples>

### 起草流程

1. **分析**步骤 5 预览中的 commit 列表。识别 2-5 个对用户重要的主题。
2. **写入**摘要到 `/tmp/release-summary-v${NEW_VERSION}.md`。
3. **展示**草稿给用户审查和批准后再应用。

```bash
# 写入草稿
cat > /tmp/release-summary-v${NEW_VERSION}.md << 'SUMMARY_EOF'
{你的增强版摘要}
SUMMARY_EOF

cat /tmp/release-summary-v${NEW_VERSION}.md
```

<agent-instruction>
起草后，询问用户：
> "这是我起草的发布摘要。这将出现在 release notes 的**顶部**，在自动生成的 commit 变更日志之上。需要调整什么吗？"

如果用户已经确认发布流程且没有明确要求暂停审查 release notes，在展示草稿后继续到步骤 7。不要在步骤 7.5 之前停止。
</agent-instruction>

---

## 步骤 7：应用增强摘要到 Release

此步骤是**强制的**。步骤 6 的增强摘要必须始终应用。

<architecture>
最终 release note 结构：

```
┌─────────────────────────────────────┐
│  增强摘要（来自步骤 6）              │  ← 你写的
│  - 基于主题，关注用户影响            │
├─────────────────────────────────────┤
│  ---  （分隔符）                     │
├─────────────────────────────────────┤
│  自动生成的 Commit 变更日志          │  ← Workflow 写的
│  - 按 feat/fix/refactor 分组         │
└─────────────────────────────────────┘
```
</architecture>

<zero-content-loss-policy>
- 先获取现有的 release body
- 将你的摘要**前置**到它上面
- 现有的自动生成内容必须 100% 完整保留
- 不得删除或修改任何现有内容的一个字符
</zero-content-loss-policy>

```bash
# 1. 获取现有的自动生成 body
EXISTING_BODY=$(gh release view "v${NEW_VERSION}" --json body --jq '.body')

# 2. 组合：增强摘要在上，自动生成在下
{
  cat /tmp/release-summary-v${NEW_VERSION}.md
  echo ""
  echo "---"
  echo ""
  echo "$EXISTING_BODY"
} > /tmp/final-release-v${NEW_VERSION}.md

# 3. 更新 release（仅添加）
gh release edit "v${NEW_VERSION}" --notes-file /tmp/final-release-v${NEW_VERSION}.md

# 4. 确认
echo "✅ Release v${NEW_VERSION} 已更新增强摘要。"
gh release view "v${NEW_VERSION}" --json url --jq '.url'
```

---

## 步骤 8：最终确认

向用户报告成功，附带：
- 新版本号
- GitHub release URL：https://github.com/sad-apple/omo-config-web/releases/tag/v{version}
- 安装命令：`curl -fsSL https://raw.githubusercontent.com/sad-apple/omo-config-web/main/install.sh | bash -s update`

---

## 错误处理

- **Workflow 失败**：显示失败日志，建议检查 Actions 标签
- **Release 未找到**：等待并重试，可能是传播延迟
- **权限被拒绝**：用户可能需要重新认证 `gh auth login`

## 语言

用中文回复用户。
