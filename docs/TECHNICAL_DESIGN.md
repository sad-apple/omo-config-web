# OMO Config Web — 技术设计与实现方案

> 版本: v0.1 | 日期: 2026-05-14 | 状态: 调研完成

---

## 一、系统架构

### 1.1 配置文件层级关系

```
┌─────────────────────────────────────────────────────────┐
│                    opencode.json (Base)                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  provider: {                                       │  │
│  │    "provider-name": { npm, options,               │  │
│  │      models: { "model-name": {...}, ... } }       │  │
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
│  │  agents: { agentName: { model, fallback_models,   │  │
│  │    thinking, compaction, ultrawork, variant } }   │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  categories: { catName: { model, thinking,        │  │
│  │    variant, description } }                       │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  background_task: { defaultConcurrency,           │  │
│  │    providerConcurrency, modelConcurrency }        │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  runtime_fallback: { enabled, retry_on_errors,    │  │
│  │    max_fallback_attempts, cooldown_seconds }      │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  tmux: { enabled, layout, main_pane_size, ... }   │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  team_mode: { enabled, tmux_visualization,        │  │
│  │    max_parallel_members, max_members, ... }       │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  experimental: { dynamic_context_pruning,          │  │
│  │    auto_resume, aggressive_truncation, ... }      │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 1.2 数据实体关系模型

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

### 1.3 Provider 动态读取方法

Provider 和 Model 数据**不静态记录**，而是通过以下方式动态获取：

#### 方法一: `opencode providers list` CLI 命令

```bash
# 获取所有已配置的 Provider 及其认证方式
opencode providers list

# 输出包含两部分:
# 1. Credentials — 通过 auth.json 配置的 Provider (标注 "api")
# 2. Environment — 通过环境变量认证的 Provider (标注 env var 名称)
```

**后端实现**: 通过 `child_process.exec('opencode providers list')` 执行命令，解析文本输出。

**CLI 输出格式**:
```
┌ Credentials ~/.local/share/opencode/auth.json
● OpenRouter api
● Alibaba Coding Plan (China) api
● Zhipu AI Coding Plan api
...
└ N credentials

┌ Environment
● Alibaba DASHSCOPE_API_KEY
● OpenAI OPENAI_API_KEY
...
└ N environment variables
```

**解析策略**: 使用 ANSI 转义序列过滤 + 正则提取，或优先使用 `--output=json` 参数（如果支持）。

#### 方法二: 解析 `opencode.json` 的 `provider` 字段

```typescript
// 读取 ~/.config/opencode/opencode.json
// 解析 provider 字段获取每个 Provider 的完整定义:

interface ProviderDefinition {
  npm: string;                    // npm 包名, 如 "@ai-sdk/openai-compatible"
  name: string;                   // Provider 显示名称
  options: {                      // 连接选项
    baseURL?: string;
    apiKey?: string;
    [key: string]: unknown;
  };
  models: Record<string, ModelDefinition>;
}

interface ModelDefinition {
  name: string;
  contextWindow?: number;
  options?: {                     // 模型参数
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    reasoningEffort?: string;
    thinking?: {
      type: 'enabled' | 'disabled';
      budgetTokens: number;
    };
  };
  variants?: Record<string, {     // 模型变体
    options: Record<string, unknown>;
  }>;
}
```

#### 方法三: OMO JSON Schema 校验

从 `https://raw.githubusercontent.com/code-yeongyu/oh-my-openagent/dev/assets/oh-my-opencode.schema.json` 获取最新 schema，用于:
- 前端表单自动生成
- 配置校验
- Agent/Category 字段合法性检查

### 1.4 Agent 动态读取方法

Agent 定义存储在 `oh-my-openagent.jsonc` 的 `agents` 字段中。

**读取方式**: 解析 JSONC 文件 (需处理注释)，提取 `agents` 对象。

```typescript
interface AgentConfig {
  model: string;                          // "provider/modelName" 格式
  fallback_models?: string[] | ModelRef[]; // 备用模型
  thinking?: { type: 'enabled' | 'disabled'; budgetTokens: number };
  compaction?: { model: string };
  ultrawork?: { model: string };
  variant?: string;                       // max/high/medium/low/xhigh
  allow_non_gpt_model?: boolean;
  description?: string;
}
```

**内置 Agent 列表** (由 OMO 插件预定义，不可删除):
`build`, `sisyphus`, `oracle`, `librarian`, `explore`, `multimodal-looker`,
`prometheus`, `metis`, `momus`, `atlas`, `sisyphus-junior`, `hephaestus`

用户可在 `agents` 字段中覆盖任意内置 Agent 的模型配置。

### 1.5 Category 动态读取方法

Category 定义存储在 `oh-my-openagent.jsonc` 的 `categories` 字段中。

**读取方式**: 同 Agent，解析 JSONC 文件的 `categories` 对象。

```typescript
interface CategoryConfig {
  model: string;                           // "provider/modelName" 格式
  thinking?: { type: 'enabled' | 'disabled'; budgetTokens: number };
  variant?: string;
  description?: string;
}
```

**内置 Category 列表** (由 OMO 插件预定义):
`visual-engineering`, `ultrabrain`, `deep`, `artistry`,
`quick`, `unspecified-low`, `unspecified-high`, `writing`

用户可在 `categories` 字段中覆盖任意 Category 的模型配置。

---

## 二、技术选型

### 2.1 前端框架

| 方案 | 优势 | 劣势 | 推荐度 |
|------|------|------|--------|
| **Next.js 15 (App Router)** | SSR/SSG、API Routes、生态成熟 | 学习曲线略陡 | ⭐⭐⭐⭐⭐ |
| Vite + React | 轻量、快速 | 需自建 API 层 | ⭐⭐⭐⭐ |
| Nuxt (Vue) | Vue 生态 | OMO 生态以 TS/React 为主 | ⭐⭐⭐ |

**决策: Next.js 15 + TypeScript + App Router**

### 2.2 UI 组件库

| 方案 | 优势 | 劣势 | 推荐度 |
|------|------|------|--------|
| **shadcn/ui + Radix UI** | 无头组件、高度可定制、无障碍 | 需自行组合 | ⭐⭐⭐⭐⭐ |
| Ant Design | 开箱即用、组件丰富 | 体积大、风格固定 | ⭐⭐⭐ |
| MUI | 生态完善 | 较重 | ⭐⭐⭐ |

**决策: shadcn/ui + Radix UI + Tailwind CSS**

### 2.3 核心交互组件

| 功能 | 推荐库 | Stars | 用途 |
|------|--------|-------|------|
| JSON Schema 表单 | **@rjsf/core** | 13k+ | 从 JSON Schema 自动生成表单 |
| 拖放排序 | **dnd-kit** | 17k+ | Agent/Category 拖放分配 |
| 节点编辑器 | **@xyflow/react** | 12k+ | Agent 路由可视化 |
| 代码编辑 | **@monaco-editor/react** | - | 原始 JSON 编辑模式 |
| 状态管理 | **zustand** | 40k+ | 轻量状态管理 |
| 树形组件 | **@dnd-kit/sortable-tree** | 132 | Provider→Model→Agent 层级树 |

### 2.4 后端/数据持久化

| 方案 | 说明 | 推荐度 |
|------|------|--------|
| **Next.js API Routes + 本地文件** | 直接读写 ~/.config/opencode/ 下的 JSON 文件 | ⭐⭐⭐⭐⭐ (开发阶段) |
| SQLite + Prisma | 持久化配置历史、版本管理 | ⭐⭐⭐⭐ (生产阶段) |
| 纯前端 (localStorage) | 无后端，导出/导入 JSON | ⭐⭐⭐ (MVP) |

**决策: MVP 阶段纯前端 + 文件导出/导入；V1 阶段 Next.js API Routes 直读本地配置**

### 2.5 技术栈总览

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

## 三、数据流设计

### 3.1 数据读取流程

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

1. **启动时**: 调用 `opencode providers list` 获取已配置的 Provider 列表
2. **读取 opencode.json**: 解析 `provider` 字段，获取每个 Provider 的 Model 定义
3. **读取 oh-my-openagent.jsonc**: 解析 `agents`, `categories`, `background_task` 等字段
4. **合并数据**: 将 Provider → Model → Agent 关系构建成前端可用的树形数据结构

### 3.2 数据写入流程

1. **编辑时**: 所有变更存储在 Zustand store 中 (内存)
2. **自动保存**: 定时将 store 序列化到 localStorage (草稿)
3. **发布时**: 
   - 校验 JSON Schema
   - 生成 Diff 预览
   - 用户确认后，通过 API Route 写入对应 JSON 文件
   - 记录发布历史

---

## 四、关键技术实现方案

### 4.1 JSONC 文件解析

`oh-my-openagent.jsonc` 包含注释，标准 `JSON.parse` 无法处理。

**方案**: 使用 `jsonc-parser` 库 (VS Code 同款)

```typescript
import { parse as parseJsonc } from 'jsonc-parser';

const jsoncContent = await fs.readFile(configPath, 'utf-8');
const config = parseJsonc(jsoncContent);
```

### 4.2 CLI 命令执行与输出解析

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function getProviders(): Promise<Provider[]> {
  const { stdout } = await execAsync('opencode providers list');
  // 过滤 ANSI 转义序列
  const cleanOutput = stdout.replace(/\x1b\[[0-9;]*m/g, '');
  // 解析文本输出
  return parseProviderOutput(cleanOutput);
}
```

### 4.3 配置发布流程

```
用户编辑 → Zustand Store 更新 → localStorage 草稿保存
    ↓
点击"发布" → JSON Schema 校验 (ajv)
    ↓
校验通过 → 生成 Diff (jsdiff) → 用户确认
    ↓
写入文件 → fs.writeFile(opencode.json)
    ↓
记录历史 → localStorage 发布历史
```

### 4.4 拖放实现方案

使用 `dnd-kit` 实现 Agent/Category 到配置集的拖放：

```typescript
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';

// Agent 池中的可拖拽项
function AgentCard({ agent }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `agent-${agent.name}`,
    data: { type: 'agent', agent },
  });
  // ...
}

// 配置集的目标区域
function ConfigDropZone() {
  const { setNodeRef, isOver } = useDroppable({
    id: 'config-drop-zone',
  });
  // ...
}
```

### 4.5 Diff 预览实现

使用 `jsdiff` 生成 diff，Monaco Editor 的 diff 模式展示：

```typescript
import { diffLines } from 'diff';
import { DiffEditor } from '@monaco-editor/react';

const diff = diffLines(originalJson, newJson);
// Monaco DiffEditor 展示
```

---

## 五、技术风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| `opencode providers` 输出格式变化 | 解析失败 | 使用结构化输出 (JSON)，不依赖 CLI 文本格式 |
| JSON Schema 版本不兼容 | 校验失败 | 锁定 schema URL，定期更新 |
| 本地文件读写权限 | 安全风险 | 使用 Next.js API Routes，限制文件路径 |
| 大配置文件性能 | 渲染卡顿 | 虚拟列表 (Provider/Model 较多时) |
| 多实例同时编辑 | 数据冲突 | 文件锁 + 发布前校验 |

---

## 六、参考资源

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
