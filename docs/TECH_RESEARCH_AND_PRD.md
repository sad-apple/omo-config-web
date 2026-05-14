# OMO Config Web — 技术调研与产品需求文档

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

## 二、系统架构调研

### 2.1 配置文件层级关系

```
┌─────────────────────────────────────────────────────────┐
│                    opencode.json (Base)                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  provider: {                                       │  │
│  │    "alibaba-coding-plan-cn": { npm, options,      │  │
│  │      models: { "qwen3.6-plus": {...}, ... } }     │  │
│  │    "zhipuai-coding-plan": { npm, options,          │  │
│  │      models: { "glm-5-turbo": {...} } }           │  │
│  │    "freeModel": { npm, options,                    │  │
│  │      models: { "gpt-5.5": {...variants...} } }    │  │
│  │  }                                                 │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  agent: { }  (内置 agent 定义，通常为空)            │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  mcp: { gitee, github, yunxiao-devops }           │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │ overlay
                          ▼
┌─────────────────────────────────────────────────────────┐
│              oh-my-openagent.jsonc (OMO Overlay)         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  agents: {                                         │  │
│  │    sisyphus:       model → alibaba/qwen3.6-plus    │  │
│  │    hephaestus:     model → alibaba/qwen3.6-plus    │  │
│  │    oracle:         model → zhipuai/glm-5-turbo     │  │
│  │    librarian:      model → alibaba/MiniMax-M2.5    │  │
│  │    explore:        model → alibaba/MiniMax-M2.5    │  │
│  │    multimodal:     model → alibaba/kimi-k2.5       │  │
│  │    prometheus:     model → zhipuai/glm-5-turbo     │  │
│  │    metis:          model → zhipuai/glm-5-turbo     │  │
│  │    momus:          model → alibaba/MiniMax-M2.5    │  │
│  │    atlas:          model → alibaba/glm-5           │  │
│  │    sisyphus-junior: model → alibaba/glm-5          │  │
│  │  }                                                 │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  categories: {                                     │  │
│  │    visual-engineering → alibaba/qwen3.6-plus       │  │
│  │    ultrabrain       → alibaba/qwen3.6-plus         │  │
│  │    deep             → alibaba/qwen3.6-plus         │  │
│  │    artistry         → alibaba/MiniMax-M2.5         │  │
│  │    quick            → zhipuai/glm-5-turbo          │  │
│  │    unspecified-low  → alibaba/MiniMax-M2.5         │  │
│  │    unspecified-high → zhipuai/glm-5-turbo          │  │
│  │    writing          → alibaba/qwen3.6-plus         │  │
│  │  }                                                 │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  background_task: {                                │  │
│  │    defaultConcurrency, staleTimeoutMs,             │  │
│  │    providerConcurrency: { alibaba: 3, zhipuai: 3 },│  │
│  │    modelConcurrency: { qwen: 4, glm: 4, ... }      │  │
│  │  }                                                 │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  runtime_fallback: { enabled, retry_on_errors,     │  │
│  │    max_fallback_attempts, cooldown_seconds }       │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  tmux: { enabled, layout, main_pane_size, ... }    │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  team_mode: { enabled, tmux_visualization,         │  │
│  │    max_parallel_members, max_members, ... }        │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  experimental: { dynamic_context_pruning,           │  │
│  │    auto_resume, aggressive_truncation, ... }       │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 2.2 数据实体关系模型

```
Provider (opencode.json.provider)
  ├── name: string (e.g., "alibaba-coding-plan-cn")
  ├── npm: string (e.g., "@ai-sdk/openai-compatible")
  ├── options: { baseURL, apiKey, ... }
  └── models: Record<string, Model>
        └── Model
              ├── name: string
              ├── contextWindow: number
              ├── options: { temperature, maxTokens, topP, ... }
              ├── variants: Record<string, Variant>
              └── thinking: { type, budgetTokens }

Agent (oh-my-openagent.jsonc.agents)
  ├── name: string (e.g., "sisyphus")
  ├── model: string ("provider/modelName")
  ├── fallback_models: string[] | ModelRef[]
  ├── thinking: { type, budgetTokens }
  ├── compaction: { model: string }
  ├── ultrawork: { model: string }
  ├── variant: string
  ├── allow_non_gpt_model: boolean
  └── description: string

Category (oh-my-openagent.jsonc.categories)
  ├── name: string (e.g., "visual-engineering")
  ├── model: string ("provider/modelName")
  ├── thinking: { type, budgetTokens }
  ├── variant: string
  └── description: string

ConfigProfile (OMO 配置集 — 新增概念)
  ├── name: string
  ├── enabled: boolean
  ├── agents: string[] (从 agents 池中选择)
  ├── categories: string[] (从 categories 池中选择)
  └── published_to: "opencode.json" | null
```

### 2.3 当前 Provider 清单（来自 `opencode providers list`）

| Provider 名称 | 认证方式 | 状态 |
|---|---|---|
| OpenRouter | api (auth.json) | ✅ 已配置 |
| Alibaba Coding Plan (China) | api (auth.json) | ✅ 已配置 |
| Zhipu AI Coding Plan | api (auth.json) | ✅ 已配置 |
| Z.AI Coding Plan | api (auth.json) | ✅ 已配置 |
| DeepSeek | api (auth.json) | ✅ 已配置 |
| OpenAI | api (auth.json) | ✅ 已配置 |
| Xiaomi Token Plan (China) | api (auth.json) | ✅ 已配置 |
| Alibaba (Env) | DASHSCOPE_API_KEY | ✅ 环境变量 |
| Alibaba China (Env) | DASHSCOPE_API_KEY | ✅ 环境变量 |
| OpenAI (Env) | OPENAI_API_KEY | ✅ 环境变量 |
| Anthropic (Env) | ANTHROPIC_API_KEY | ✅ 环境变量 |

### 2.4 当前 Agent → Provider/Model 映射

| Agent | 模型 | Provider | 思考模式 | 备用模型 |
|---|---|---|---|---|
| sisyphus | qwen3.6-plus | alibaba-coding-plan-cn | enabled (32k) | kimi-k2.5 |
| hephaestus | qwen3.6-plus | alibaba-coding-plan-cn | enabled (32k) | kimi-k2.5 |
| oracle | glm-5-turbo | zhipuai-coding-plan | - | - |
| librarian | MiniMax-M2.5 | alibaba-coding-plan-cn | - | - |
| explore | MiniMax-M2.5 | alibaba-coding-plan-cn | - | - |
| multimodal-looker | kimi-k2.5 | alibaba-coding-plan-cn | enabled (16k) | - |
| prometheus | glm-5-turbo | zhipuai-coding-plan | - | - |
| metis | glm-5-turbo | zhipuai-coding-plan | - | - |
| momus | MiniMax-M2.5 | alibaba-coding-plan-cn | - | - |
| atlas | glm-5 | alibaba-coding-plan-cn | - | kimi-k2.5 |
| sisyphus-junior | glm-5 | alibaba-coding-plan-cn | - | kimi-k2.5 |

### 2.5 当前 Category → Model 映射

| Category | 模型 | Provider | 思考模式 | Variant |
|---|---|---|---|---|
| visual-engineering | qwen3.6-plus | alibaba-coding-plan-cn | enabled (32k) | - |
| ultrabrain | qwen3.6-plus | alibaba-coding-plan-cn | enabled (64k) | high |
| deep | qwen3.6-plus | alibaba-coding-plan-cn | enabled (32k) | high |
| artistry | MiniMax-M2.5 | alibaba-coding-plan-cn | - | - |
| quick | glm-5-turbo | zhipuai-coding-plan | - | - |
| unspecified-low | MiniMax-M2.5 | alibaba-coding-plan-cn | - | - |
| unspecified-high | glm-5-turbo | zhipuai-coding-plan | - | - |
| writing | qwen3.6-plus | alibaba-coding-plan-cn | - | - |

---

## 三、技术选型

### 3.1 前端框架

| 方案 | 优势 | 劣势 | 推荐度 |
|------|------|------|--------|
| **Next.js 15 (App Router)** | SSR/SSG、API Routes、生态成熟 | 学习曲线略陡 | ⭐⭐⭐⭐⭐ |
| Vite + React | 轻量、快速 | 需自建 API 层 | ⭐⭐⭐⭐ |
| Nuxt (Vue) | Vue 生态 | OMO 生态以 TS/React 为主 | ⭐⭐⭐ |

**决策: Next.js 15 + TypeScript + App Router**

### 3.2 UI 组件库

| 方案 | 优势 | 劣势 | 推荐度 |
|------|------|------|--------|
| **shadcn/ui + Radix UI** | 无头组件、高度可定制、无障碍 | 需自行组合 | ⭐⭐⭐⭐⭐ |
| Ant Design | 开箱即用、组件丰富 | 体积大、风格固定 | ⭐⭐⭐ |
| MUI | 生态完善 | 较重 | ⭐⭐⭐ |

**决策: shadcn/ui + Radix UI + Tailwind CSS**

### 3.3 核心交互组件

| 功能 | 推荐库 | Stars | 用途 |
|------|--------|-------|------|
| JSON Schema 表单 | **@rjsf/core** | 13k+ | 从 JSON Schema 自动生成表单 |
| 拖放排序 | **dnd-kit** | 17k+ | Agent/Category 拖放分配 |
| 节点编辑器 | **@xyflow/react** | 12k+ | Agent 路由可视化 |
| 代码编辑 | **@monaco-editor/react** | - | 原始 JSON 编辑模式 |
| 状态管理 | **zustand** | 40k+ | 轻量状态管理 |
| 树形组件 | **@dnd-kit/sortable-tree** | 132 | Provider→Model→Agent 层级树 |

### 3.4 后端/数据持久化

| 方案 | 说明 | 推荐度 |
|------|------|--------|
| **Next.js API Routes + 本地文件** | 直接读写 ~/.config/opencode/ 下的 JSON 文件 | ⭐⭐⭐⭐⭐ (开发阶段) |
| SQLite + Prisma | 持久化配置历史、版本管理 | ⭐⭐⭐⭐ (生产阶段) |
| 纯前端 (localStorage) | 无后端，导出/导入 JSON | ⭐⭐⭐ (MVP) |

**决策: MVP 阶段纯前端 + 文件导出/导入；V1 阶段 Next.js API Routes 直读本地配置**

### 3.5 技术栈总览

```
OMO Config Web
├── Frontend
│   ├── Next.js 15 (App Router) + TypeScript
│   ├── shadcn/ui + Radix UI + Tailwind CSS
│   ├── @rjsf/core (JSON Schema Forms)
│   ├── dnd-kit (Drag & Drop)
│   ├── @xyflow/react (Node Editor)
│   ├── @monaco-editor/react (Raw JSON)
│   └── zustand (State Management)
├── Backend (V1)
│   ├── Next.js API Routes
│   ├── fs (读写 ~/.config/opencode/)
│   └── JSON Schema Validation (ajv)
└── DevOps
    ├── pnpm (包管理)
    ├── ESLint + Prettier
    └── GitHub Actions (CI/CD)
```

---

## 四、产品需求文档 (PRD)

### 4.1 功能模块总览

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

### 4.2 模块 ①: Provider Layer

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

### 4.3 模块 ②: Model Layer

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

### 4.4 模块 ③: Agent Layer (角色层)

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

### 4.5 模块 ④: OMO Config Layer (配置层)

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

### 4.6 模块 ⑤: 发布管理

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

### 4.7 全局功能

| 需求项 | 优先级 | 说明 |
|--------|--------|------|
| G1 | P0 | 双模式切换: 可视化编辑 ↔ 原始 JSON (Monaco Editor) |
| G2 | P0 | 实时 JSON Schema 校验 |
| G3 | P0 | 自动保存 (localStorage 草稿) |
| G4 | P1 | 深色/浅色主题 |
| G5 | P1 | 配置搜索 (搜索 Agent/Model/Provider 名称) |
| G6 | P2 | 快捷键支持 |

---

## 五、页面路由设计

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

## 六、数据流设计

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  opencode    │     │  OMO Config  │     │   Browser    │
│  CLI         │     │  Web App     │     │   (Frontend) │
│              │     │              │     │              │
│ providers    │────▶│  API Routes  │────▶│  React UI    │
│ list         │     │  (Next.js)   │     │              │
│              │     │              │     │              │
│              │◀────│  Write JSON  │◀────│  Form Submit │
│              │     │  Files       │     │  / DragDrop  │
└──────────────┘     └──────────────┘     └──────────────┘
```

### 6.1 数据读取流程

1. **启动时**: 调用 `opencode providers list` 获取已配置的 Provider 列表
2. **读取 opencode.json**: 解析 `provider` 字段，获取每个 Provider 的 Model 定义
3. **读取 oh-my-openagent.jsonc**: 解析 `agents`, `categories`, `background_task` 等字段
4. **合并数据**: 将 Provider → Model → Agent 关系构建成前端可用的树形数据结构

### 6.2 数据写入流程

1. **编辑时**: 所有变更存储在 Zustand store 中 (内存)
2. **自动保存**: 定时将 store 序列化到 localStorage (草稿)
3. **发布时**: 
   - 校验 JSON Schema
   - 生成 Diff 预览
   - 用户确认后，通过 API Route 写入对应 JSON 文件
   - 记录发布历史

---

## 七、技术风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| `opencode providers` 输出格式变化 | 解析失败 | 使用结构化输出 (JSON)，不依赖 CLI 文本格式 |
| JSON Schema 版本不兼容 | 校验失败 | 锁定 schema URL，定期更新 |
| 本地文件读写权限 | 安全风险 | 使用 Next.js API Routes，限制文件路径 |
| 大配置文件性能 | 渲染卡顿 | 虚拟列表 (Provider/Model 较多时) |
| 多实例同时编辑 | 数据冲突 | 文件锁 + 发布前校验 |

---

## 八、开发里程碑

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

---

## 九、参考资源

### 开源项目参考

| 项目 | Stars | 参考价值 |
|------|-------|----------|
| [react-jsonschema-form](https://github.com/rjsf-team/react-jsonschema-form) | 13k+ | JSON Schema 表单生成 |
| [dnd-kit](https://github.com/clauderic/dnd-kit) | 17k+ | 拖放交互 |
| [React Flow](https://github.com/xyflow/react-flow) | 12k+ | 节点编辑器 |
| [ai-selector](https://github.com/tombcato/ai-selector) | 19 | AI Provider/Model 选择器 |
| [compose-flow](https://github.com/mr-akkerman/compose-flow) | - | 可视化配置 → JSON 导出 |

### 官方文档

- [Oh-My-OpenAgent GitHub](https://github.com/code-yeongyu/oh-my-openagent)
- [OpenCode GitHub](https://github.com/anomalyco/opencode)
- [OMO JSON Schema](https://raw.githubusercontent.com/code-yeongyu/oh-my-openagent/dev/assets/oh-my-opencode.schema.json)
