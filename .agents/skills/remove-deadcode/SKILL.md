---
name: remove-deadcode
description: "使用 LSP 验证安全地移除项目中的未使用代码，原子提交。触发词：remove dead code, dead code, cleanup, remove unused, 清理死代码, 移除未使用代码"
---

通过大规模并行 deep agent 移除死代码。你是**编排者** — 你扫描、验证、分批，然后将所有移除工作分发给并行 agent。

<rules>
- **LSP 是法律。** 在做出任何移除决定之前，必须使用 `LspFindReferences(includeDeclaration=false)` 验证。
- **绝不移除入口点。** `src/app/` 页面组件、`src/app/layout.tsx`、`src/components/ui/`（shadcn/ui 组件）、测试文件、配置文件 — 禁止操作。
- **你不自己移除代码。** 你扫描、验证、分批，然后启动 deep agent。它们来做实际工作。
</rules>

<false-positive-guards>
绝不可标记为死代码：
- `src/app/` 下的 page.tsx、layout.tsx、loading.tsx、error.tsx
- `src/components/ui/` 下的 shadcn/ui 组件
- barrel `index.ts` 中的 re-exports
- 测试文件中引用的符号（测试是有效消费者）
- 带有 `@public` / `@api` JSDoc 标签的符号
- Zustand store 中使用的符号（即使只在 store 文件中引用）
- `package.json` exports 中的符号
- Next.js API 路由（`src/app/api/` 下的 route.ts）
</false-positive-guards>

---

## 阶段 1：扫描 — 查找死代码候选

并行运行以下所有操作：

<parallel-scan>

**TypeScript 严格模式（主要扫描器 — 最先运行）：**
```bash
npx tsc --noEmit --noUnusedLocals --noUnusedParameters 2>&1
```
这会给出未使用的 locals、imports、parameters 和 types 的确定列表，包含精确的 file:line 位置。

**Explore agents（全部同时作为后台启动）：**

```
task(subagent_type="explore", run_in_background=true, load_skills=[],
  description="查找孤立文件",
  prompt="在 src/ 中查找未被任何其他文件导入的文件。检查所有 import 语句。排除：index.ts, *.test.ts, 入口点（src/app/ 下的页面）, .md 文件。返回：文件路径。")

task(subagent_type="explore", run_in_background=true, load_skills=[],
  description="查找未使用的导出符号",
  prompt="查找 src/ 中从未被其他文件导入的导出函数/类型/常量。交叉验证：对每个导出，在 src/ 中 grep 该符号名 — 如果只出现在自己文件中，就是候选。排除：src/app/ 页面组件, src/components/ui/ shadcn 组件, 测试文件。返回：文件路径、行号、符号名、导出类型。")
```

</parallel-scan>

收集所有结果到主候选列表。

---

## 阶段 2：验证 — LSP 确认（零误报）

对阶段 1 中的**每个候选**：

```typescript
LspFindReferences(filePath, line, character, includeDeclaration=false)
// 0 引用 → 确认死代码
// 1+ 引用 → 不是死代码，从列表中移除
```

同时应用上面的 false-positive-guards。生成确认列表：

```
| # | 文件 | 符号 | 类型 | 操作 |
|---|------|--------|------|--------|
| 1 | src/foo.ts:42 | unusedFunc | function | 移除 |
| 2 | src/bar.ts:10 | OldType | type | 移除 |
| 3 | src/baz.ts:7 | ctx | parameter | 前缀 _ |
```

**操作类型：**
- `移除` — 删除该符号/import/文件
- `前缀 _` — 签名必需的未使用函数参数 → 重命名为 `_paramName`

如果确认数量为 0：报告"未发现死代码"并停止。

---

## 阶段 3：分批 — 按文件分组以实现无冲突并行

<batching-rules>

**目标：最大化并行 agent 数量，零 git 冲突。**

1. 按**文件路径**对确认的死代码项分组
2. 同一文件中的所有项归入同一批（防止两个 agent 编辑同一文件）
3. 如果是死文件（整个文件删除），单独成批
4. 目标 5-15 批。如果总项数少于 5，每项一批。

**分批示例：**
```
批次 A: [src/hooks/foo/hook.ts — 3 个未使用的 import]
批次 B: [src/features/bar/manager.ts — 2 个未使用的常量, 1 个死函数]
批次 C: [src/tools/baz/tool.ts — 1 个未使用的参数, src/tools/baz/types.ts — 1 个未使用的类型]
批次 D: [src/dead-file.ts — 整个文件删除]
```

同一目录下的文件可以归入同一批（只要没有两个 agent 编辑同一文件就不会冲突）。最大化批数以实现并行。

</batching-rules>

---

## 阶段 4：执行 — 启动并行 deep agent

对**每批**，启动一个 deep agent：

```
task(
  category="deep",
  load_skills=[],
  run_in_background=true,
  description="移除死代码批次 N: [简要描述]",
  prompt="[见下方模板]"
)
```

<agent-prompt-template>

每个 deep agent 获得以下提示结构（按批次填写具体内容）：

```
## 任务：从 [文件列表] 中移除死代码

## 要移除的死代码

### [文件路径] 第 [N] 行
- 符号：`[名称]` — [类型：未使用的 import / 未使用的常量 / 未使用的函数 / 未使用的参数 / 死文件]
- 操作：[完全移除 / 从 import 列表中移除 / 前缀加 _]

### [文件路径] 第 [N] 行
- ...

## 协议

1. 读取每个文件，了解目标行的确切语法
2. 对每个符号，运行 LspFindReferences **重新验证**它仍然是死的（另一个 agent 可能已变更内容）
3. 应用变更：
   - 未使用的 import（行中唯一符号）：移除整行
   - 未使用的 import（多个之一）：仅从 import 列表中移除该符号
   - 未使用的常量/函数/类型：移除声明。清理尾部空行。
   - 未使用的参数：前缀加 `_`（不要移除 — 签名必需）
   - 死文件：用 `rm` 删除
4. 本批所有编辑完成后，运行：`pnpm build`
5. 如果 build 失败：`git checkout -- [文件]` 并报告失败
6. 如果 build 通过：仅暂存你的文件并提交：
   `git add [你的具体文件] && git commit -m "refactor: 移除 [简要文件列表] 中的死代码"`
7. 报告你移除了什么以及 commit hash

## 关键
- 仅暂存你这批的文件（`git add [具体文件]`）。绝不 `git add -A` — 其他 agent 也在并行工作。
- 如果编辑后 build 失败，回退所有变更并报告。不要尝试修复。
- 其他文件中预先存在的测试失败是预期的。只有 build 结果对你的批次有意义。
```

</agent-prompt-template>

同时启动**所有批次**。等待全部完成。

---

## 阶段 5：最终验证

所有 agent 完成后：

```bash
pnpm build    # 必须通过
pnpm lint     # 必须通过
```

生成摘要：

```markdown
## 死代码移除完成

### 已移除
| # | 符号 | 文件 | 类型 | Commit | 批次 |
|---|--------|------|------|--------|-------|
| 1 | unusedFunc | src/foo.ts | function | abc1234 | 批次 A |

### 跳过（agent 报告失败）
| # | 符号 | 文件 | 原因 |
|---|--------|------|--------|

### 验证
- Build: 通过/失败
- Lint: 通过/失败
- 总计移除：N 个符号，M 个文件
- 总计提交：K 个原子提交
- 使用并行 agent 数：P
```

---

## 范围控制

如果提供了 `$ARGUMENTS`，缩小扫描范围：
- 文件路径 → 仅该文件
- 目录 → 仅该目录
- 符号名 → 仅该符号
- `all` 或空 → 全项目扫描（默认）

## 中止条件

出现以下情况时停止并报告：
- 发现超过 50 个候选（请用户缩小范围或确认继续）
- Build 中断且无法通过回退修复
