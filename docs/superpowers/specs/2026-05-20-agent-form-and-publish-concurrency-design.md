# OMO Config Web - 剩余问题修复设计

**日期**: 2026-05-20  
**状态**: 已批准，待实施

---

## 问题 5: Agent 表单完整补全

### 现状
- `AgentConfigForm.tsx` 仅覆盖 7/20 字段（35%）
- 缺失 13 个字段，分属不同优先级
- 现有表单使用 `react-hook-form + zod`，Advanced 区域用 `Collapsible`

### Oracle 审查发现（必须修正）

| P0 | 问题 | 修正 |
|----|------|------|
| 1 | `permission` 类型错误：实际是 `"ask" \| "allow" \| "deny"` 三态，非 boolean | 用 `Select`（三选一），bash 额外支持 `Record<string, PermissionLevel>` |
| 2 | `form.watch()` 性能灾难：9 处 watch，扩展后 Slider 拖动重渲染整个表单 | 用 `useController` 替代，Slider 用本地 state + debounce |
| 3 | `onSubmit` 字段丢失：`...agent` 展开覆盖 defaultValues | 用 `form.reset(agent)` 初始化全部字段，提交时明确构建完整对象 |

| P1 | 问题 | 修正 |
|----|------|------|
| 4 | Sheet 540px 宽度放不下 4 个 section | 加宽至 `w-[640px] sm:w-[720px]`，用 `Tabs` 切换 |
| 5 | `tools: Record<string, boolean>` 不是 tag input | 改为 key-value 行列表：`[Input] [Switch] [Delete]` |

### 最终结构

```
AgentConfigSheet (w-[640px] sm:w-[720px])
├── Tabs: ["基本配置", "行为", "参数", "高级"]
│   ├── Tab 1 基本配置: model, fallback_models, variant, description
│   ├── Tab 2 行为: category, mode, disable, prompt, prompt_append, permission
│   ├── Tab 3 参数: temperature, top_p, maxTokens, reasoningEffort, textVerbosity, thinking
│   └── Tab 4 高级: ultrawork, compaction, skills, tools(kv-editor), color, providerOptions(monaco)
└── zod schema → agentSchema.ts（独立文件）
```

### 数据流

```
AgentConfigSheet open → form.reset(agent) 初始化全部字段
  → 各 Tab 内 useController 隔离渲染
  → onSubmit → 明确构建完整 Agent 对象（无 ...agent 展开）
  → configStore.updateAgent(name, completeAgent)
```

### 验证规则

- `temperature`: 0-2
- `top_p`: 0-1
- `maxTokens`: 正整数
- `prompt`: 可选，最大 10000 字符
- `skills/tools`: 字符串数组/Record，每项非空
- `permission`: 每个字段为 `"ask" | "allow" | "deny"` 之一

---

## 问题 9: 发布并发控制（ETag 机制）

### 现状
- API 层无任何并发控制
- 前端仅通过 `isPublishing` 防止重复点击
- 多标签页/用户同时发布 → 最后写入胜出，数据覆盖风险

### 架构

服务端无状态，基于文件内容 hash 实现乐观锁：

```
GET /api/config → 返回 { data, etag: sha256(content) }
POST /api/config/publish → 请求携带 { data, etag }
  → 服务端重新读取文件，计算当前 hash
  → hash === etag → 写入成功，返回新 etag
  → hash !== etag → 409 Conflict，返回 { currentContent, serverEtag }
```

### 关键决策

1. **ETag 计算**: `crypto.createHash('sha256').update(fileContent).digest('hex').slice(0, 16)`
2. **前端存储**: `usePublish` hook 内部维护 `currentEtag`，从 GET 响应获取
3. **冲突处理**: 409 时弹出 Dialog，展示 diff，用户选择：
   - **覆盖**: 强制写入（跳过 etag 校验）
   - **放弃**: 丢弃本地修改，重新加载服务端
   - **合并**: 手动编辑（Monaco Editor 对比视图）
4. **多文件**: `opencode.json` 和 `oh-my-openagent.jsonc` 分别计算 etag，合并为 `{ opencodeEtag, omoEtag }`

### 数据流

```
页面加载 → GET /api/config → store 更新 + 保存 etag
用户修改 → isDirty = true
点击发布 → POST /api/config/publish { data, etag }
  → 200 → 成功，更新 etag，isDirty = false
  → 409 → 冲突 Dialog → 用户选择 → 覆盖/放弃/合并
```

### 工作量

- `route.ts` 修改: ~30 行
- `usePublish.ts` 修改: ~20 行
- `ConflictDialog` 新组件: ~40 行
- 总计: ~90 行

---

## 实施顺序

1. **问题 5**（Agent 表单）: 先实施，因为涉及大量 UI 代码，独立性强
2. **问题 9**（发布并发）: 后实施，依赖问题 5 完成后的稳定状态

## 风险

- **Agent 表单**: zod schema 设计复杂，permission 的 bash 字段支持 `Record<string, PermissionLevel>` 需特殊处理
- **发布并发**: 多文件 etag 合并逻辑需确保原子性，避免部分写入

## 验证标准

- [ ] `pnpm build` 通过
- [ ] LSP diagnostics clean
- [ ] Agent 表单 20/20 字段全部可编辑
- [ ] 发布并发冲突时正确弹出 Dialog
- [ ] 强制写入后 etag 正确更新
