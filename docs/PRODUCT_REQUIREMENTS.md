# OMO Config Web — 产品需求文档 (PRD)

> 版本: v0.1 | 日期: 2026-05-14 | 状态: 调研完成

---

## 一、产品概述

OMO Config Web 是一个 Web 端可视化工具，用于替代手动编辑 JSON 文件的方式，通过图形界面配置 [Oh-My-OpenAgent (OMO)](https://github.com/code-yeongyu/oh-my-openagent) 的多 Agent 编排配置。

### 1.1 解决的核心痛点

| 痛点 | 现状 | 目标 |
|------|------|------|
| Provider/Model 关系不直观 | 在 JSON 中通过 `provider/model` 字符串引用，无层级视图 | 树形可视化 Provider → Model 层级 |
| Agent 模型分配易出错 | 手动编辑 `model: "alibaba-coding-plan-cn/qwen3.6-plus"` 格式 | 下拉选择器，自动补全 provider/model |
| Category 委派配置冗长 | 每个 category 重复配置 model/thinking/variant | 批量配置 + 模板复用 |
| 配置发布无版本管理 | 直接覆盖 JSON 文件，无回滚能力 | 启用/禁用配置集，Diff 预览后发布 |
| 并发/降级参数难调 | 嵌套 JSON 结构，数值单位易混淆 | 可视化滑块 + 单位提示 |

---

## 二、功能模块总览

```
┌─────────────────────────────────────────────────────────────┐
│                     OMO Config Web                          │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│ ①        │ ②        │ ③        │ ④        │ ⑤               │
│ Provider │ Model    │ Agent    │ OMO      │ 发布管理        │
│ Layer    │ Layer    │ Layer    │ Config   │                 │
│          │          │          │ Layer    │                 │
├──────────┼──────────┼──────────┼──────────┼─────────────────┤
│ 动态加载 │ 模型浏览 │ Agent    │ 配置集   │ 启用/禁用       │
│ opencode │ 模型配置 │ 模型分配 │ 创建     │ 配置集          │
│ providers│ 变体管理 │ Category │ Agent    │ Diff 预览       │
│ 命令数据 │ 思考模式 │ 委派配置 │ 拖放分配 │ 发布到          │
│          │          │          │ Category │ opencode.json   │
│          │          │          │ 批量配置 │ 回滚            │
└──────────┴──────────┴──────────┴──────────┴─────────────────┘
```

### 2.1 模块 ①: Provider Layer

**功能描述**: 动态加载并展示 opencode 中已配置的 Provider 列表。

| 需求项 | 优先级 | 说明 |
|--------|--------|------|
| P1-1 | P0 | 通过 `opencode providers list` 命令动态获取已配置的 Provider |
| P1-2 | P0 | 显示 Provider 名称、认证方式 (api/env)、状态 |
| P1-3 | P0 | 展开 Provider 查看其下所有 Model |
| P1-4 | P1 | 添加/编辑 Provider (npm package, baseURL, apiKey) |
| P1-5 | P1 | 删除 Provider (带确认) |
| P1-6 | P2 | Provider 健康检查 (ping API 验证 key 有效性) |

**UI 设计要点**:
- 左侧树形面板，Provider 为一级节点
- 每个 Provider 前有状态指示器 (🟢 已认证 / 🔴 未配置)
- 点击展开显示该 Provider 下的所有 Model

### 2.2 模块 ②: Model Layer

**功能描述**: 管理每个 Provider 下的 Model 配置。

| 需求项 | 优先级 | 说明 |
|--------|--------|------|
| P2-1 | P0 | 显示 Model 名称、contextWindow、temperature 等参数 |
| P2-2 | P0 | 编辑 Model 参数 (表单形式) |
| P2-3 | P0 | 管理 Model Variants (fast, detailed 等) |
| P2-4 | P1 | 添加新 Model 到已有 Provider |
| P2-5 | P1 | 配置 Thinking 模式 (enabled/disabled + budgetTokens) |
| P2-6 | P2 | Model 参数模板 (快速套用常用配置) |

**UI 设计要点**:
- 选中 Model 后右侧弹出编辑面板
- 参数使用表单控件 (滑块、数字输入、下拉选择)
- Variants 以标签页形式展示
- Thinking 模式使用 Switch 开关 + 数字输入

### 2.3 模块 ③: Agent Layer (角色层)

**功能描述**: 管理 OMO 中的所有 Agent/角色，为每个 Agent 指定使用的 Provider 和 Model。

| 需求项 | 优先级 | 说明 |
|--------|--------|------|
| P3-1 | P0 | 列出所有 Agent (sisyphus, oracle, librarian, ...) |
| P3-2 | P0 | 为 Agent 选择 Model (级联下拉: Provider → Model) |
| P3-3 | P0 | 配置 Fallback Models (备用模型列表) |
| P3-4 | P0 | 配置 Thinking 模式 |
| P3-5 | P1 | 配置 Compaction 模型 |
| P3-6 | P1 | 配置 Ultrawork 模型 (仅 sisyphus) |
| P3-7 | P1 | 配置 Variant (max/high/medium/low) |
| P3-8 | P2 | 添加自定义 Agent |
| P3-9 | P2 | 禁用/启用 Agent |

**UI 设计要点**:
- Agent 列表使用卡片式布局，每张卡片显示:
  - Agent 名称 + 描述
  - 当前使用的 Model (带 Provider 图标)
  - Thinking 状态标签
- 点击卡片展开详细配置面板
- Model 选择使用级联下拉框 (先选 Provider，再选 Model)

### 2.4 模块 ④: OMO Config Layer (配置层)

**功能描述**: 创建灵活多变的 OMO 配置集，从 Agent 池中选择角色加入当前配置。

| 需求项 | 优先级 | 说明 |
|--------|--------|------|
| P4-1 | P0 | 创建配置集 (命名 + 描述) |
| P4-2 | P0 | 从 Agent 池拖放 Agent 到配置集 |
| P4-3 | P0 | 从 Category 池拖放 Category 到配置集 |
| P4-4 | P0 | 配置 background_task 参数 (并发数、超时) |
| P4-5 | P1 | 配置 runtime_fallback (降级策略) |
| P4-6 | P1 | 配置 tmux 参数 (布局、窗格大小) |
| P4-7 | P1 | 配置 team_mode 参数 |
| P4-8 | P1 | 配置 experimental 功能开关 |
| P4-9 | P2 | 配置集克隆 (基于已有配置集创建) |
| P4-10 | P2 | 配置集导出/导入 (JSON) |

**UI 设计要点**:
- 三栏布局:
  - 左栏: Agent 池 + Category 池 (可拖放的源)
  - 中栏: 当前配置集 (拖放目标区域)
  - 右栏: 配置参数面板 (并发、降级、tmux 等)
- 拖放使用 dnd-kit，拖入时高亮目标区域
- 配置集以卡片形式展示在顶部，可切换

### 2.5 模块 ⑤: 发布管理

**功能描述**: 管理配置集的启用/禁用状态，发布到 opencode 配置文件。

| 需求项 | 优先级 | 说明 |
|--------|--------|------|
| P5-1 | P0 | 启用/禁用配置集 (Switch 开关) |
| P5-2 | P0 | 发布前 Diff 预览 (对比当前配置与目标配置) |
| P5-3 | P0 | 发布到 opencode.json / oh-my-openagent.jsonc |
| P5-4 | P1 | 发布前自动校验 (JSON Schema 验证) |
| P5-5 | P1 | 发布历史 (记录每次变更) |
| P5-6 | P1 | 回滚到历史版本 |
| P5-7 | P2 | 多配置集切换 (快速切换不同工作场景) |

**UI 设计要点**:
- 发布按钮旁显示 Diff 预览按钮
- Diff 使用 Monaco Editor 的 diff 模式
- 发布成功后显示 Toast 通知
- 发布历史以时间线形式展示

### 2.6 全局功能

| 需求项 | 优先级 | 说明 |
|--------|--------|------|
| G1 | P0 | 双模式切换: 可视化编辑 ↔ 原始 JSON (Monaco Editor) |
| G2 | P0 | 实时 JSON Schema 校验 |
| G3 | P0 | 自动保存 (localStorage 草稿) |
| G4 | P1 | 深色/浅色主题 |
| G5 | P1 | 配置搜索 (搜索 Agent/Model/Provider 名称) |
| G6 | P2 | 快捷键支持 |

---

## 三、页面路由设计

```
/                          → 首页 / 仪表盘 (配置概览)
/providers                 → Provider 管理页
  /providers/[id]          → 单个 Provider 详情 + Model 列表
/models                    → Model 总览 (所有 Provider 的 Model)
  /models/[provider]/[name]→ 单个 Model 详情/编辑
/agents                    → Agent 管理页
  /agents/[name]           → 单个 Agent 配置
/configs                   → OMO 配置集列表
  /configs/[id]            → 配置集编辑器 (拖放界面)
  /configs/[id]/diff       → 发布前 Diff 预览
/history                   → 发布历史
/settings                  → 全局设置 (主题、快捷键等)
```

---

## 四、开发里程碑

### Phase 1: MVP (2-3 周)

- [ ] 项目初始化 (Next.js + TypeScript + shadcn/ui)
- [ ] Provider Layer: 读取并展示 opencode.json 中的 Provider 列表
- [ ] Model Layer: 展示 Model 参数 (只读)
- [ ] Agent Layer: 展示 Agent → Model 映射 (只读)
- [ ] 双模式切换: 可视化 ↔ 原始 JSON
- [ ] 纯前端，手动导入/导出 JSON

### Phase 2: 可编辑 (2-3 周)

- [ ] Model 参数编辑表单
- [ ] Agent Model 选择器 (级联下拉)
- [ ] Agent Fallback Models 配置
- [ ] Thinking / Variant 配置
- [ ] JSON Schema 实时校验

### Phase 3: 配置集管理 (2-3 周)

- [ ] 配置集创建/克隆
- [ ] Agent 拖放分配到配置集
- [ ] Category 拖放分配
- [ ] background_task / runtime_fallback 参数配置
- [ ] 配置集启用/禁用

### Phase 4: 发布管理 (1-2 周)

- [ ] Diff 预览
- [ ] 发布到本地配置文件
- [ ] 发布历史
- [ ] 回滚功能

### Phase 5: 增强功能 (持续)

- [ ] Provider 健康检查
- [ ] 配置集模板
- [ ] 多主题
- [ ] 快捷键
- [ ] 团队协作 (多用户配置共享)
