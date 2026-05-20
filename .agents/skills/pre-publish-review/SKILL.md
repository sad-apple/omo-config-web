---
name: pre-publish-review
description: "发布前多 agent 审查。运行 /get-unpublished-changes 检测自上次 release 以来的所有变更，启动 deep agent 进行逐变更深度分析，调用 review-work 进行全局审查，oracle 进行整体发布就绪评估。在每次发布前使用。触发词：pre-publish review, review before publish, release review, pre-release review, ready to publish?, can I publish?, safe to publish, 发布前审查, 可以发布吗, 发布安全检查"
---

发布前的三层审查。每层覆盖不同角度 — 合在一起捕获单一审查员无法发现的问题。

| 层级 | Agents | 类型 | 检查内容 |
|-------|--------|------|-----------------|
| 逐变更深度分析 | 最多 10 | ultrabrain | 每个逻辑变更组 individually — 正确性、边缘情况、模式遵循 |
| 全局审查 | 5 | review-work | 目标合规、QA 执行、代码质量、安全、上下文挖掘 |
| 发布综合评估 | 1 | oracle | 整体发布就绪、版本升级、破坏性变更、部署风险 |

---

## 阶段 0：检测未发布变更

先运行 `/get-unpublished-changes`。这是自上次 release 以来变更的唯一真实来源。

```
skill(name="get-unpublished-changes")
```

该命令自动：
- 检测已发布 git tag vs 本地版本
- 列出上次 release 以来的所有 commits
- 读取实际 diffs（不仅是 commit message）来描述**真正的变更**
- 按类型（feat/fix/refactor/docs）分组，附带作用域
- 识别破坏性变更
- 推荐版本升级类型（patch/minor/major）

**保存完整输出** — 它直接输入到阶段 1 分组和所有 agent 提示词。

然后捕获 agent 提示词需要的原始数据：

```bash
# 捕获版本
LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "no tags")
LOCAL_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")

# Agent 需要的原始数据（diffs、文件列表）
COMMITS=$(git log "${LATEST_TAG}"..HEAD --oneline 2>/dev/null || echo "no commits")
COMMIT_COUNT=$(echo "$COMMITS" | wc -l | tr -d ' ')
DIFF_STAT=$(git diff "${LATEST_TAG}"..HEAD --stat 2>/dev/null || echo "no diff")
CHANGED_FILES=$(git diff --name-only "${LATEST_TAG}"..HEAD 2>/dev/null || echo "none")
FILE_COUNT=$(echo "$CHANGED_FILES" | wc -l | tr -d ' ')
```

如果 `LATEST_TAG` 是 "no tags"，这是首次发布 — 使用完整的 git 历史替代。

---

## 阶段 1：将变更解析为分组

使用 `/get-unpublished-changes` 输出作为起点 — 它已经按作用域和类型分组。

**分组策略：**
1. 从 `/get-unpublished-changes` 分析开始，它已经按 feat/fix/refactor/docs 分类并附带作用域
2. 进一步按**模块/区域**拆分 — 触及同一模块或功能区域的变更归为一组
3. 目标**最多 10 组**。如果少于 10 个 commits，每个 commit 自成一组。如果超过 10 个逻辑区域，合并最小的组。
4. 对每组，提取：
   - **组名**：简短描述标签（如 "agent-model-resolution", "hook-system-refactor"）
   - **Commits**：该组的 commit hash 和 message 列表
   - **Files**：该组变更的文件
   - **Diff**：该组的相关 diff 部分（`git diff {LATEST_TAG}..HEAD -- {group files}`）

---

## 阶段 2：启动所有 Agents

在一个回合内启动**所有** agent。每个 agent 使用 `run_in_background=true`。绝不顺序启动。

### 层级 1：Ultrabrain 逐变更分析（最多 10 个）

对每个变更组，启动一个 ultrabrain agent。每个只获得自己那部分 diff — 不是完整的变更集。

```
task(
  category="ultrabrain",
  run_in_background=true,
  load_skills=[],
  description="深度分析：{GROUP_NAME}",
  prompt="""
<review_type>逐变更深度分析</review_type>
<change_group>{GROUP_NAME}</change_group>

<project>omo-config-web（Next.js Web 应用）</project>
<latest_tag>{LATEST_TAG}</latest_tag>
<target_version>{LOCAL_VERSION}</target_version>

<commits>
{GROUP_COMMITS — 该组每个 commit 的 hash 和 message}
</commits>

<changed_files>
{GROUP_FILES — 该组变更的文件}
</changed_files>

<diff>
{GROUP_DIFF — 仅该组文件的 diff}
</diff>

<file_contents>
{读取并包含该组每个变更文件的完整内容}
</file_contents>

你正在审查即将发布的一组特定变更。仅关注**本变更组**。其他组由并行 agent 审查。

分析清单：

1. **意图清晰性**：这个变更想做什么？意图从代码和 commit message 中清晰吗？如果你需要猜，这就是一个发现。

2. **正确性**：追踪 3+ 种场景的逻辑。代码真的做了它声称的事吗？差一错误、null 处理、异步边缘情况、资源清理。

3. **破坏性变更**：这个变更是否改变了任何公共 API、配置格式、UI 行为？如果是，是否向后兼容？现有用户会感到意外吗？

4. **模式遵循**：新代码是否遵循现有文件中可见的既定模式？在已有模式的地方引入新模式 = 发现。

5. **边缘情况**：什么输入或条件会破坏这个？空数组、undefined 值、并发调用、非常大的输入、缺失的配置字段。

6. **错误处理**：错误是否正确捕获和传播？没有空的 catch 块？没有吞掉的 promise？

7. **类型安全**：有任何 `as any`、`@ts-ignore`、`@ts-expect-error` 吗？在可以严格的地方使用了宽松类型？

8. **测试覆盖**：行为变更有测试覆盖吗？测试是有意义的还是仅为了覆盖率？

9. **副作用**：这个变更会破坏其他模块中的东西吗？检查 import 和 export — 谁依赖了变更的内容？

10. **发布风险**：SAFE / CAUTION / RISKY — 你对这个变更不会在生产中引起问题的信心如何？

输出格式：
<group_name>{GROUP_NAME}</group_name>
<verdict>PASS 或 FAIL</verdict>
<risk>SAFE / CAUTION / RISKY</risk>
<summary>2-3 句对该变更组的评估</summary>
<has_breaking_changes>是 或 否</has_breaking_changes>
<breaking_change_details>如果是，描述什么会破坏以及对谁</breaking_change_details>
<findings>
  每个发现：
  - [严重/主要/次要] 类别：描述
  - 文件：路径（行范围）
  - 证据：具体代码引用
  - 建议：如何修复
</findings>
<blocking_issues>发布前必须修复的问题。如果 PASS 则为空。</blocking_issues>
""")
```

### 层级 2：全局审查 via review-work（5 个 agent）

启动一个加载 `review-work` skill 的子 agent。review-work skill 内部启动 5 个并行 agent：目标验证、QA 执行、代码质量、安全、上下文挖掘。5 个全部通过审查才算通过。

```
task(
  category="unspecified-high",
  run_in_background=true,
  load_skills=["review-work"],
  description="运行 review-work 审查所有未发布变更",
  prompt="""
对未发布的变更运行 /review-work。

目标：审查 omo-config-web 即将发布的所有变更。这些变更跨越 {COMMIT_COUNT} 个 commits，涉及 {FILE_COUNT} 个文件。

约束：
- 这是一个 Next.js Web 应用，通过 GitHub Release 分发
- TypeScript strict mode，pnpm 包管理
- 禁止 `as any`、`@ts-ignore`、`@ts-expect-error`
- Zustand 状态管理，shadcn/ui 组件
- Next.js App Router 架构

背景：omo-config-web 的发布前审查。自 {LATEST_TAG} 以来的变更即将发布。

diff 基准是：git diff {LATEST_TAG}..HEAD

严格按照 /review-work skill 流程执行 — 启动所有 5 个审查 agent 并收集结果。不要跳过任何 agent。
""")
```

### 层级 3：Oracle 发布综合评估（1 个 agent）

Oracle 获得全局视图 — 所有 commits、完整 diff stat 和变更文件列表。提供最终的发布就绪评估。

```
task(
  subagent_type="oracle",
  run_in_background=true,
  load_skills=[],
  description="Oracle：整体发布综合评估和版本升级建议",
  prompt="""
<review_type>发布综合评估 — 整体评估</review_type>

<project>omo-config-web（Next.js Web 应用）</project>
<latest_tag>{LATEST_TAG}</latest_tag>
<local_version>{LOCAL_VERSION}</local_version>

<all_commits>
{自 latest tag 以来的所有 commits — hash、message、作者、日期}
</all_commits>

<diff_stat>
{DIFF_STAT — 变更的文件数、插入行数、删除行数}
</diff_stat>

<changed_files>
{CHANGED_FILES — 修改的文件路径完整列表}
</changed_files>

<full_diff>
{FULL_DIFF — latest tag 和 HEAD 之间的完整 git diff}
</full_diff>

<file_contents>
{读取并包含关键变更文件的完整内容 — 关注公共 API 表面、配置 schema、agent 定义、hook 注册、工具注册}
</file_contents>

你是 npm 发布前的最后一道关卡。10 个 ultrabrain agent 正在审查各个变更，5 个 review-work agent 正在进行全局审查。你的工作是那些聚焦审查可能错过的鸟瞰视图。

综合评估清单：

1. **发布一致性**：这些变更是否讲述了一个连贯的故事？还是这是不相关变更的大杂烩，应该拆分成多个发布？

2. **版本升级**：基于 semver：
   - PATCH：仅 Bug 修复，无行为变更
   - MINOR：新功能，向后兼容的变更
   - MAJOR：公共 API、配置格式或行为的破坏性变更
   推荐正确的升级类型，附带具体理由。

3. **破坏性变更审计**：详尽列出每个可能破坏现有用户的变更。检查：
   - 配置 schema 变更（新必填字段、移除字段、重命名字段）
   - API 路由变更（新端点、移除端点、变更响应格式）
   - UI 行为变更（表单字段变更、布局变更、交互变更）
   - Zustand store 变更（新字段、移除字段、变更字段类型）
   - 组件接口变更（新必填 props、移除 props、变更 props 类型）

4. **迁移要求**：如果有破坏性变更，用户需要采取什么迁移步骤？有自动迁移吗？

5. **依赖变更**：添加了新依赖？移除了依赖？版本升级？有供应链风险吗？

6. **变更日志草稿**：编写按以下分组的变更日志草稿：
   - feat：新功能
   - fix：Bug 修复
   - refactor：内部变更（无用户影响）
   - breaking：破坏性变更，附带迁移说明
   - docs：文档变更

7. **部署风险评估**：
   - SAFE：常规变更，经过充分测试，低风险
   - CAUTION：重大变更但风险可控
   - RISKY：大面积变更、测试不足或没有迁移的破坏性变更
   - BLOCK：发现关键问题，不要发布

8. **发布后监控**：发布后应该监控什么？错误率、特定功能、用户反馈渠道。

输出格式：
<verdict>SAFE / CAUTION / RISKY / BLOCK</verdict>
<recommended_version_bump>PATCH / MINOR / MAJOR</recommended_version_bump>
<version_bump_justification>为什么是这个升级级别</version_bump_justification>
<release_coherence>变更是否属于一个发布的评估</release_coherence>
<breaking_changes>
  详尽列表，如果没有则写"无"。
  每个：
  - 什么变更了
  - 谁受影响
  - 迁移步骤
</breaking_changes>
<changelog_draft>
  可直接使用的变更日志条目
</changelog_draft>
<deployment_risk>
  整体风险评估，附带具体关注点
</deployment_risk>
<monitoring_recommendations>
  发布后需要监控什么
</monitoring_recommendations>
<blocking_issues>发布前必须修复的问题。如果 SAFE 则为空。</blocking_issues>
""")
```

---

## 阶段 3：收集结果

当 agent 完成时（系统通知），通过 `background_output(task_id="...")` 收集。

用表格追踪完成情况：

| # | Agent | 类型 | 状态 | 结论 |
|---|-------|------|--------|---------|
| 1-10 | Ultrabrain: {group_name} | ultrabrain | 等待中 | — |
| 11 | Review-Work 协调器 | unspecified-high | 等待中 | — |
| 12 | 发布综合评估 Oracle | oracle | 等待中 | — |

在**所有** agent 完成之前**不要**交付最终报告。

---

## 阶段 4：最终结论

<verdict_logic>

**BLOCK** 如果：
- Oracle 结论是 BLOCK
- 任何 ultrabrain 发现严重阻塞问题
- Review-work 在任何 MAIN agent 上失败

**RISKY** 如果：
- Oracle 结论是 RISKY
- 多个 ultrabrain 返回 CAUTION 或 FAIL
- Review-work 通过但有重大发现

**CAUTION** 如果：
- Oracle 结论是 CAUTION
- 少数 ultrabrain 标记了次要问题
- Review-work 干净通过

**SAFE** 如果：
- Oracle 结论是 SAFE
- 所有 ultrabrain 通过
- Review-work 通过

</verdict_logic>

编译最终报告：

```markdown
# 发布前审查 — omo-config-web

## 发布：{LATEST_TAG} -> v{LOCAL_VERSION}
**Commits：** {COMMIT_COUNT} | **变更文件：** {FILE_COUNT} | **Agents：** {AGENT_COUNT}

---

## 整体结论：SAFE / CAUTION / RISKY / BLOCK

## 建议版本升级：PATCH / MINOR / MAJOR
{来自 Oracle 的理由}

---

## 逐变更分析（Ultrabrains）

| # | 变更组 | 结论 | 风险 | 破坏性？ | 阻塞问题 |
|---|-------------|---------|------|-----------|-----------------|
| 1 | {name} | PASS/FAIL | SAFE/CAUTION/RISKY | 是/否 | {数量 或 "无"} |
| ... | ... | ... | ... | ... | ... |

### 逐变更分析中的阻塞问题
{从所有 ultrabrains 聚合 — 去重}

---

## 全局审查（Review-Work）

| # | 审查领域 | 结论 | 置信度 |
|---|------------|---------|------------|
| 1 | 目标与约束验证 | 通过/失败 | 高/中/低 |
| 2 | QA 执行 | 通过/失败 | 高/中/低 |
| 3 | 代码质量 | 通过/失败 | 高/中/低 |
| 4 | 安全 | 通过/失败 | 严重级别 |
| 5 | 上下文挖掘 | 通过/失败 | 高/中/低 |

### 全局审查中的阻塞问题
{从 review-work 聚合}

---

## 发布综合评估（Oracle）

### 破坏性变更
{来自 Oracle — 详尽列表 或 "无"}

### 变更日志草稿
{来自 Oracle — 可直接使用}

### 部署风险
{来自 Oracle — 具体关注点}

### 发布后监控
{来自 Oracle — 需要监控什么}

---

## 所有阻塞问题（按优先级排序）
{从三层聚合，去重，按严重程度排序}

## 建议
{如果是 BLOCK/RISKY：按优先级列出具体要修复什么}
{如果是 CAUTION：发布前值得考虑的建议}
{如果是 SAFE：非阻塞的改进建议}
```

---

## 反模式

| 违规行为 | 严重程度 |
|-----------|----------|
| 不等所有 agent 完成就发布 | **严重** |
| 顺序而非并行启动 ultrabrains | 严重 |
| 对任何 agent 使用 `run_in_background=false` | 严重 |
| 跳过 Oracle 综合评估 | 高 |
| 不为 Oracle 读取文件内容（它无法读取文件） | 高 |
| 将所有变更归入 1-2 个 ultrabrains 而不是分发 | 高 |
| 在所有 agent 完成之前交付结论 | 高 |
| 不在 ultrabrain 提示词中包含 diff | 主要 |
