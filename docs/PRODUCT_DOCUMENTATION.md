# OMO Config Web — 产品设计与使用说明文档

> **版本**: v1.0  
> **适用对象**: OMO (Oh-My-OpenAgent) 多智能体编排系统的配置管理员  
> **文档目标**: 帮助用户全面理解 OMO Config Web 的功能设计、操作逻辑与配置数据模型，实现从手动编辑 JSON/JSONC 到可视化管理的平滑过渡。

---

## 目录

1. [产品概述](#一产品概述)
2. [核心概念](#二核心概念)
3. [功能模块详解](#三功能模块详解)
   - 3.1 [仪表盘 (Dashboard)](#31-仪表盘-dashboard)
   - 3.2 [Provider 管理](#32-provider-管理)
   - 3.3 [模型管理](#33-模型管理)
   - 3.4 [智能体管理](#34-智能体管理)
   - 3.5 [配置方案管理](#35-配置方案管理)
4. [双模式编辑器](#四双模式编辑器)
5. [配置发布与版本管理](#五配置发布与版本管理)
6. [导入与导出](#六导入与导出)
7. [键盘快捷键](#七键盘快捷键)
8. [配置数据模型参考](#八配置数据模型参考)
9. [已知限制与注意事项](#九已知限制与注意事项)

---

## 一、产品概述

### 1.1 产品定位

**OMO Config Web** 是 [Oh-My-OpenAgent (OMO)](https://github.com/code-yeongyu/oh-my-openagent) 多智能体编排系统的**可视化配置管理工具**。它替代了手动编辑 `opencode.json` 和 `oh-my-openagent.jsonc` 两个配置文件的繁琐流程，通过直观的 Web UI 帮助用户管理：

- **AI 提供商 (Providers)** — OpenAI、Anthropic、Google、Ollama 等
- **模型 (Models)** — 各提供商下的具体模型及其参数
- **智能体 (Agents)** — OMO 内置的 coder、reviewer、explorer 等角色
- **分类 (Categories)** — 任务分类，如 coding、writing、debugging
- **配置方案 (Config Profiles)** — 将智能体和分类组合成可切换的方案
- **运行时配置** — 后台任务并发、回退策略等高级设置

### 1.2 解决的问题

在 OMO Config Web 出现之前，用户需要：

1. 手动编辑 `~/.config/opencode/opencode.json`（纯 JSON，管理 providers + models）
2. 手动编辑 `~/.config/opencode/oh-my-openagent.jsonc`（JSONC 带注释，管理 agents + categories + profiles + runtime）
3. 理解两个文件之间的字段映射关系
4. 在修改时保持 JSON/JSONC 语法正确
5. 无法直观看到配置之间的关联（如某个 Agent 使用了哪个模型）

**OMO Config Web 通过以下方式解决上述问题**：

- 统一的 Web 界面管理所有配置实体
- 可视化表单替代手写 JSON
- 实时关联展示（Agent -> Model -> Provider 的链路）
- 双模式编辑（Visual + JSON），满足不同用户习惯
- 配置版本历史与回滚
- 草稿自动保存与恢复
- 一键发布到磁盘

### 1.3 技术架构速览

| 层级 | 技术栈 | 说明 |
|------|--------|------|
| 前端框架 | Next.js 16.2.6 + React 19.2.4 | App Router，服务端/客户端组件混合 |
| 样式 | Tailwind CSS v4 + shadcn/ui | 现代化 UI 组件库，支持 light/dark 主题 |
| 状态管理 | Zustand 5 | 单一 Store 管理全部配置状态 |
| 拖拽排序 | @dnd-kit | 配置方案中的 Agent/Category 拖拽排序 |
| 代码编辑 | Monaco Editor | JSON 模式下的语法高亮与校验 |
| 表单验证 | react-hook-form + Zod | Agent 配置表单的数据校验 |
| 数据持久化 | 本地 API + localStorage | 配置写入磁盘，草稿/历史存 localStorage |

---

## 二、核心概念

在使用 OMO Config Web 之前，需要理解以下核心概念及其关系：

### 2.1 实体关系图

```
+-------------+       +-------------+       +-------------+
|  Provider   |<------|    Model    |<------|    Agent    |
|  (提供商)    | 1:N   |   (模型)     | 1:N   |  (智能体)    |
+-------------+       +-------------+       +------+------+
                                                   |
                          +------------------------+
                          | N:M
                   +------+------+
                   |   Profile   |
                   |  (配置方案)  |
                   +------+------+
                          | 1:N
                   +------+------+
                   |  Category   |
                   |  (任务分类)  |
                   +-------------+
```

### 2.2 各实体详解

#### Provider（提供商）

代表一个 AI 服务提供商，如 OpenAI、Anthropic、Google 等。每个 Provider 包含：

- **名称** — 显示名称，如 "OpenAI"
- **NPM 包名** — LiteLLM 对应的 SDK 包名，如 `@openai/sdk`
- **API 配置** — baseURL（自定义 API 地址）和 apiKey（密钥）
- **模型列表** — 该提供商下的所有可用模型

> **注意**: 当前版本中，Provider 页面为**只读展示**，添加/编辑 Provider 需通过 JSON 模式或导入功能完成。

#### Model（模型）

代表一个具体的 AI 模型，如 GPT-4o、Claude Sonnet 等。模型参数包括：

- **上下文窗口 (Context Window)** — 模型能处理的最大 token 数
- **温度 (Temperature)** — 控制输出随机性（0 = 确定性，2 = 高度随机）
- **最大 Token (Max Tokens)** — 单次响应的最大输出长度
- **Top P** — 核采样参数，控制词汇选择的多样性
- **思维链 (Thinking)** — 是否启用推理过程及预算 token 数
- **推理努力程度 (Variant)** — 模型推理的深度级别
- **文本冗长度 (Text Verbosity)** — 输出详细程度

#### Agent（智能体）

OMO 的核心工作单元，代表一个具有特定角色的 AI 代理。每个 Agent 包含：

- **主模型 (Primary Model)** — 该 Agent 默认使用的模型（格式：`provider/modelName`）
- **回退模型 (Fallback Models)** — 主模型不可用时依次尝试的备用模型（最多 5 个）
- **思维模式 (Thinking)** — 是否启用深度推理及预算
- **变体 (Variant)** — 推理努力程度覆盖
- **分类 (Category)** — 该 Agent 所属的任务分类
- **超长工作模型 (Ultrawork)** — 处理超长上下文时的专用模型
- **压缩模型 (Compaction)** — 上下文压缩时使用的轻量模型
- **描述 (Description)** — 该 Agent 的职责说明

> **当前限制**: Agent 配置表单仅覆盖了约 32% 的字段。以下字段暂无 UI，需通过 JSON 模式编辑：skills、permissions、prompt、prompt_append、tools、disable、mode、color、temperature、top_p、maxTokens、reasoningEffort、textVerbosity、providerOptions。

#### Category（分类）

任务分类，用于将 Agents 按功能领域分组。例如：

- `coding` — 软件开发任务
- `writing` — 文档撰写任务
- `debugging` — 调试排错任务

每个 Category 可以指定默认模型和思维模式，该 Category 下的 Agent 会继承这些设置（除非 Agent 自身有覆盖）。

#### ConfigProfile（配置方案）

将一组 Agents 和 Categories 组合成一个可切换的配置方案。例如：

- **Coding Setup** — 包含 coder、reviewer、explorer 三个 Agent 和 coding 分类
- **Writing Setup** — 包含 writer、editor 两个 Agent 和 writing 分类

配置方案支持：
- **启用/禁用** — 控制该方案是否生效
- **激活** — 设置当前使用的方案（绿色圆点标识）
- **拖拽排序** — 调整 Agents 和 Categories 的优先级顺序

### 2.3 双文件配置布局

OMO 使用两个配置文件，分别存储不同类型的数据：

| 文件 | 路径 | 格式 | 存储内容 |
|------|------|------|----------|
| `opencode.json` | `~/.config/opencode/opencode.json` | 纯 JSON | `providers`（含嵌套 `models`） |
| `oh-my-openagent.jsonc` | `~/.config/opencode/oh-my-openagent.jsonc` | JSONC（支持注释） | `agents`、`categories`、`configProfiles`、`background_task`、`runtime_fallback`、`tmux`、`team_mode` |

**为什么分成两个文件？**

- `opencode.json` 与 OpenCode 编辑器共享，管理 providers + models
- `oh-my-openagent.jsonc` 是 OMO 专属配置，使用 JSONC 格式保留用户注释
- 分离后，修改 OMO 的 Agent 配置不会影响 OpenCode 的 Provider 配置

---

## 三、功能模块详解

### 3.1 仪表盘 (Dashboard)

**路径**: `/`（首页）

**功能定位**: 配置概览与快捷操作入口

#### 界面布局

仪表盘采用卡片式布局，顶部为统计概览，下方为快捷操作区。

#### 统计卡片

- **Providers** — 当前配置的 AI 提供商数量
- **Models** — 所有 Provider 下的模型总数
- **Agents** — 已配置的智能体数量

点击卡片可快速跳转到对应页面。

#### 快捷操作

- **Import Config** — 导入 JSON 配置文件（支持文件选择和拖拽）
- **Export Config** — 导出当前完整配置为 JSON 文件（带时间戳文件名）

> **注意**: 当前版本中，Dashboard 的 Import/Export 按钮需要点击后通过文件选择器操作，暂不支持直接拖拽到按钮上。

---

### 3.2 Provider 管理

**路径**: `/providers`

**功能定位**: 查看已配置的 AI 提供商及其模型列表

#### 界面布局

Provider 页面采用响应式卡片网格：

- **桌面端 (lg+)** — 3 列网格
- **平板 (sm-lg)** — 2 列网格
- **移动端** — 1 列网格

#### Provider 卡片

每张 ProviderCard 显示以下信息：

- **名称** — 如 "OpenAI"
- **NPM 包名** — 如 `@openai/sdk`，以 Badge 显示
- **模型数量** — 右上角数字 Badge
- **可折叠模型列表** — 点击 "Show models" 展开，显示每个模型的名称和上下文窗口大小

**颜色编码**: 每个 Provider 有预定义的颜色标识（OpenAI = 蓝色、Anthropic = 橙色、Google = 绿色、Ollama = 紫色），用于在 Agent 卡片、模型选择器等位置快速识别。

#### 当前限制

- Provider 页面**仅支持查看**，不支持添加、编辑或删除 Provider
- 如需修改 Provider，请切换到 **JSON 模式** 直接编辑，或通过 **导入功能** 覆盖

---

### 3.3 模型管理

**路径**: `/models`

**功能定位**: 浏览和编辑所有模型的参数配置

#### 界面布局

模型页面采用**双栏布局**：左侧为模型列表，右侧为详情面板。

#### 左侧 — 模型列表 (ModelList)

- 按 Provider 分组显示所有模型
- 每个 ModelCard 显示：
  - 模型名称 + Provider 名称
  - Thinking 状态 Badge（紫色 "Thinking" 或灰色 "Standard"）
  - 4 个参数指标：Context Window、Temperature、Max Tokens、Top P
  - Thinking budget（如果启用）
- 点击卡片选中，右侧显示详情

#### 右侧 — 模型详情 (ModelDetail)

- **默认只读模式**：显示所有参数的详细信息
- 点击铅笔图标进入**编辑模式**
- 编辑模式使用 ModelParamsForm，包含 3 个滑块：
  - **Temperature**: 0-2，步长 0.1，默认 0.7
  - **Max Tokens**: 256-200,000，步长 256，默认 4096
  - **Top P**: 0-1，步长 0.05，默认 0.9
- "Reset to defaults" 按钮恢复默认值
- 实时 onChange 同步到 store

#### Model 类型字段

- `name`: 模型名称
- `contextWindow`: 上下文窗口大小
- `options.temperature`: 温度
- `options.maxTokens`: 最大 token
- `options.topP`: Top P 采样
- `options.thinking`: ThinkingConfig（type + budgetTokens）
- `options.reasoningEffort`: Variant 级别
- `options.textVerbosity`: "low" | "medium" | "high"
- `options.frequencyPenalty`: 频率惩罚
- `options.presencePenalty`: 存在惩罚
- `variants`: 模型变体配置

---

### 3.4 智能体管理

**路径**: `/agents`

**功能定位**: 展示和编辑 OMO 内置智能体的配置

#### 界面布局

Agent 页面采用响应式卡片网格：

- **桌面端 (xl+)** — 4 列网格
- **平板 (lg-xl)** — 3 列网格
- **小屏 (sm-lg)** — 2 列网格
- **移动端** — 1 列网格

#### Agent 卡片 (AgentCard)

每张卡片显示：

- **Agent key** — 大写化显示（如 "CODER"）
- **未保存变更指示器** — 琥珀色圆点
- **Variant Badge** — 如果有配置
- **Provider Badge** — 带颜色编码
- **主模型引用** — `provider/modelName` 格式
- **Thinking 模式指示** — 如果启用
- **Fallback 模型数量** — Tooltip 显示详情
- **编辑按钮** — 铅笔图标

#### 编辑 — AgentConfigSheet (侧边抽屉)

点击卡片或编辑按钮打开右侧抽屉（宽度 480-540px），使用 AgentConfigForm（react-hook-form + Zod 验证）。

**主要字段**：

1. **Primary Model** — ModelSelector 下拉选择器（按 Provider 分组，可搜索）
2. **Fallback Models** — FallbackModelsEditor：
   - 最多 5 个回退模型
   - 每个使用 ModelSelector 选择
   - 上下箭头调整优先级顺序
   - X 按钮删除
3. **Thinking Mode** — ThinkingConfigForm：
   - Switch 开关启用/禁用
   - 启用后显示 Budget Tokens 输入框（1024-200,000，步长 1024，默认 8192）
4. **Variant** — VariantSelector 下拉选择：
   - No Override / Max / XHigh / High / Medium / Low

**高级设置**（可折叠区域）：

5. **Ultrawork Model** — ModelSelector + variant
6. **Compaction Model** — ModelSelector + variant
7. **Description** — 多行文本输入框

**保存/取消**: 底部 Save/Cancel 按钮

#### Agent 类型中未被 UI 覆盖的字段（约 68% 缺失）

以下字段暂无 UI，需通过 JSON 模式编辑：

- `skills` — 技能列表
- `permissions` — 权限配置（edit/bash/webfetch/task/doom_loop/external_directory）
- `prompt` — 系统提示词
- `prompt_append` — 追加提示词
- `tools` — 工具开关
- `disable` — 是否禁用
- `mode` — 运行模式（subagent/primary/all）
- `color` — 颜色
- `temperature` / `top_p` / `maxTokens` — 模型参数覆盖
- `reasoningEffort` / `textVerbosity` — 推理和冗长度
- `providerOptions` — 提供商特定选项

---

### 3.5 配置方案管理

**路径**: `/profiles`

**功能定位**: 创建、编辑、删除配置方案，管理方案内的 Agent 和 Category 分配

#### 两种视图

##### 视图 A: Profile 卡片列表

- 网格布局（md 2列 / lg 3列）
- 每张卡片显示：
  - Profile 名称
  - 活跃状态指示器（绿色圆点 = 当前激活）
  - Enabled/Disabled Badge
  - Agent 数量
  - Category 数量
  - 操作按钮：设为活跃（Play）、编辑（Pencil）、删除（Trash）
- 点击卡片进入详情视图

##### 视图 B: Profile 详情 — ProfileAssignmentBoard

**三栏布局**：

**左栏 — Available Pool**：
- 未分配的 Agent 列表（每个有 + 按钮添加到 Profile）
- 未分配的 Category 列表（每个有 + 按钮添加到 Profile）
- 全部已分配时显示 "All assigned"

**中栏 — Profile Assignments**：
- **已分配 Agent 列表** — DraggableAgentList：
  - 使用 @dnd-kit 实现拖拽排序
  - 每个 Agent 项显示：拖拽手柄（GripVertical）、Bot 图标、名称、Provider Badge、Variant Badge、删除按钮（X）
  - 支持 PointerSensor（5px 激活距离）和 KeyboardSensor
  - 拖拽时显示阴影和 ring 效果
- **已分配 Category 列表** — DraggableCategoryList（类似实现）

**右栏 — Runtime Config**：
- **BackgroundTaskConfigForm**：
  - Switch 启用/禁用
  - Default Concurrency（1-20，默认 3）
  - Stale Timeout（1000-3,600,000ms，默认 300,000）
  - Provider Concurrency — KeyValueEditor（动态添加/删除 key-value 行）
  - Model Concurrency — KeyValueEditor
- **RuntimeFallbackConfigForm**：
  - Switch 启用/禁用
  - Retry on Errors（逗号分隔的 HTTP 状态码，默认 "429, 500, 503"）
  - Max Fallback Attempts（1-10，默认 3）
  - Cooldown Seconds（0-3600，默认 30）
  - Timeout Seconds（1-300，默认 60）
  - Notify on Fallback — Switch

#### 创建 Profile

- "Create Profile" 按钮 -> ProfileConfigSheet（侧边抽屉）
- 输入 Profile Name + Enabled Switch -> Save
- 名称重复检查（使用 window.alert）

#### 模板快速创建

- "From Template" 按钮 -> TemplateGallery Dialog
- 4 个预置模板：Coding、Writing、Minimal、Full Stack
- 每个模板预填充 agents + categories + configProfiles + backgroundTask + runtimeFallback
- 选择后自动合并到现有 store

#### 删除 Profile

- AlertDialog 确认 -> 删除后 toast 提示

---

## 四、双模式编辑器

**DualModeEditor** 包裹每个页面（Providers、Models、Agents、Profiles）

### 模式切换

- **Visual 模式**: 显示页面的可视化表单/卡片
- **JSON 模式**: 显示 Monaco Editor，语法高亮 JSON

### 双向同步机制

1. **Visual -> JSON**: 当 store 数据变化时，自动更新 Monaco 内容（通过 jsonValue prop 变化检测）
2. **JSON -> Visual**: Monaco 编辑时，300ms 防抖自动同步到 store
   - 如果 JSON 无效，toast 报错 "Invalid JSON — changes not synced to store"
   - 切换到 Visual 时，立即应用 Monaco 中的待处理变更

### 状态指示

- "Unsaved changes" 琥珀色警告（当 isDirty 或 hasUnsavedChanges 为 true）
- 页面关闭前警告（beforeunload 事件）

### 自动草稿保存

- 当 isDirty 时，自动保存到 localStorage
- 下次打开时弹出 "Restore unsaved changes?" Dialog

### 键盘快捷键

- `Ctrl/Cmd + S` — 保存
- `Ctrl/Cmd + I` — 导入
- `Ctrl/Cmd + D` — 切换 Diff
- `Ctrl/Cmd + E` — 切换 Visual/JSON 模式

---

## 五、配置发布与版本管理

### 发布 (Publish)

**触发条件**: 仅在有未保存变更时显示 Publish 按钮

**流程**：

1. 点击 "Publish" -> PublishDialog
2. Dialog 显示：
   - 警告：将覆盖现有文件（JSONC 注释会保留）
   - 将写入的文件列表：`~/.config/opencode/opencode.json` + `~/.config/opencode/oh-my-openagent.jsonc`
   - Diff 预览按钮
3. 确认 -> usePublish hook：
   - exportToJson() 导出当前配置
   - splitConfig() 拆分为 opencode.json 和 oh-my-openagent.jsonc
   - POST /api/config/publish 写入磁盘
   - 创建 PublishSnapshot 记录到历史
   - setLastSavedSnapshot() 标记为已保存
   - Toast 成功提示

### 发布历史 (Publish History)

- 点击 "History" 按钮打开侧边栏
- 展示最多 50 条发布快照
- 每条显示：时间戳、变更摘要
- 支持回滚到任意版本（Rollback）
- 支持清空历史（Clear History）

### Diff 预览

- 点击 "Diff" 按钮打开 Dialog
- 对比当前配置与上次保存状态的差异
- 使用代码高亮展示增删改

---

## 六、导入与导出

### 导入 (Import)

**触发方式**：
- Dashboard 的 "Import Config" 按钮 -> 文件选择器
- 键盘快捷键 `Ctrl/Cmd + I`
- 拖拽 JSON 文件到页面

**流程** (useConfigImport)：

1. 验证文件类型（.json）和大小（小于等于5MB）
2. 读取并解析 JSON
3. 如果已有配置，显示 Toast 确认（"Importing will replace..."）
4. importFromJson() 导入到 store
5. Toast 显示加载的 agent 和 category 数量

### 导出 (Export)

**触发方式**：
- Dashboard 的 "Export Config" 按钮
- 键盘快捷键

**流程** (useConfigExport)：

1. exportToJson() 序列化当前配置
2. 生成带时间戳的文件名：`omo-config-2026-05-20T10-30-00.json`
3. 创建 Blob -> 触发浏览器下载

---

## 七、键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd + S` | 保存当前配置 |
| `Ctrl/Cmd + Shift + P` | 发布配置到磁盘 |
| `Ctrl/Cmd + Shift + D` | 打开 Diff 预览 |
| `Ctrl/Cmd + E` | 切换 Visual/JSON 模式 |
| `Ctrl/Cmd + I` | 导入配置 |
| `?` | 打开快捷键帮助对话框 |

---

## 八、配置数据模型参考

### 8.1 实体类型完整字段

#### Provider（提供商）

```typescript
interface Provider {
  name: string;                    // 显示名，如 "OpenAI"
  npm: string;                     // LiteLLM 包名，如 "@openai/sdk"
  options: {
    baseURL?: string;              // API 基础 URL
    apiKey?: string;               // API 密钥
  };
  models: Record<string, Model>;   // 嵌套的模型字典
}
```

#### Model（模型）

```typescript
interface Model {
  name: string;                    // 显示名，如 "GPT-4o"
  contextWindow?: number;          // 上下文窗口大小（token 数）
  options: {
    temperature?: number;          // 温度 (0-2)
    maxTokens?: number;            // 最大输出 token
    topP?: number;                 // Top P 采样
    thinking?: ThinkingConfig;     // 思维链配置
    reasoningEffort?: Variant;     // 推理努力程度
    textVerbosity?: "low" | "medium" | "high";
    frequencyPenalty?: number;     // 频率惩罚
    presencePenalty?: number;      // 存在惩罚
  };
  variants?: Record<string, {      // 变体配置
    options: Record<string, unknown>
  }>;
}
```

#### Agent（智能体）— 22 个字段

```typescript
interface Agent {
  name: string;                    // 智能体名称，如 "coder"
  model: string;                   // 主模型引用，格式 "provider/modelName"
  fallback_models?: ModelRef[];    // 回退模型列表
  variant?: string;                // 使用的变体名
  category?: string;               // 所属分类
  skills?: string[];               // 技能列表
  temperature?: number;            // 温度
  top_p?: number;                  // Top P
  prompt?: string;                 // 系统提示词
  prompt_append?: string;          // 追加提示词
  tools?: Record<string, boolean>; // 工具开关
  disable?: boolean;               // 是否禁用
  description?: string;            // 描述
  mode?: "subagent" | "primary" | "all";  // 运行模式
  color?: string;                  // 颜色
  permission?: PermissionConfig;   // 权限配置
  maxTokens?: number;              // 最大 token
  thinking?: ThinkingConfig;       // 思维链
  reasoningEffort?: Variant;       // 推理努力
  textVerbosity?: "low" | "medium" | "high";
  providerOptions?: Record<string, unknown>;
  ultrawork?: { model: string; variant?: string };   // 超长工作模型
  compaction?: { model: string; variant?: string };  // 压缩模型
}
```

#### Category（分类）

```typescript
interface Category {
  name: string;
  model: string;                   // 默认模型引用
  thinking?: ThinkingConfig;
  variant?: string;
  description?: string;
}
```

#### ConfigProfile（配置方案）

```typescript
interface ConfigProfile {
  name: string;                    // 方案名（用作 key）
  enabled: boolean;                // 是否启用
  agents: string[];                // 包含的智能体名称列表
  categories: string[];            // 包含的分类名称列表
}
```

#### 运行时配置

```typescript
interface BackgroundTaskConfig {
  defaultConcurrency: number;              // 默认并发数
  staleTimeoutMs: number;                  // 过期超时（毫秒）
  providerConcurrency?: Record<string, number>;  // 按提供商并发
  modelConcurrency?: Record<string, number>;     // 按模型并发
}

interface RuntimeFallbackConfig {
  enabled: boolean;
  retry_on_errors: number[];         // 触发回退的 HTTP 状态码
  max_fallback_attempts: number;     // 最大回退尝试次数
  cooldown_seconds: number;          // 冷却时间（秒）
  timeout_seconds: number;           // 超时时间（秒）
  notify_on_fallback: boolean;       // 回退时是否通知
}

interface TmuxConfig {
  enabled: boolean;
  layout: string;
  main_pane_size: number;
}

interface TeamModeConfig {
  enabled: boolean;
  max_parallel_members: number;
  max_members: number;
}
```

#### 辅助类型

```typescript
type ThinkingType = "enabled" | "disabled";
interface ThinkingConfig {
  type: ThinkingType;
  budgetTokens?: number;
}

type Variant = "none" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

type PermissionLevel = "ask" | "allow" | "deny";
interface PermissionConfig {
  edit?: PermissionLevel;
  bash?: PermissionLevel | Record<string, PermissionLevel>;
  webfetch?: PermissionLevel;
  task?: PermissionLevel;
  doom_loop?: PermissionLevel;
  external_directory?: PermissionLevel;
}

type ModelRef = string | FallbackModelEntry;
interface FallbackModelEntry {
  model: string;
  variant?: string;
  reasoningEffort?: Variant;
  temperature?: number;
  top_p?: number;
  maxTokens?: number;
  thinking?: ThinkingConfig;
}
```

### 8.2 真实配置示例

#### Coding 模板示例

```jsonc
// oh-my-openagent.jsonc 片段
{
  "agents": {
    "coder": {
      "name": "coder",
      "model": "anthropic/claude-sonnet-4-20250514",
      "fallback_models": ["openai/gpt-4o"],
      "thinking": { "type": "enabled", "budgetTokens": 32000 },
      "variant": "high",
      "description": "Primary coding agent for implementation tasks.",
      "mode": "primary",
      "ultrawork": { "model": "anthropic/claude-sonnet-4-20250514", "variant": "max" },
      "compaction": { "model": "openai/gpt-4o-mini" }
    },
    "reviewer": {
      "name": "reviewer",
      "model": "anthropic/claude-sonnet-4-20250514",
      "thinking": { "type": "enabled", "budgetTokens": 16000 },
      "description": "Code review and quality analysis agent.",
      "mode": "subagent"
    }
  },
  "categories": {
    "coding": {
      "name": "coding",
      "model": "anthropic/claude-sonnet-4-20250514",
      "thinking": { "type": "enabled", "budgetTokens": 32000 },
      "variant": "high",
      "description": "Software development tasks."
    }
  },
  "configProfiles": {
    "Coding Setup": {
      "name": "Coding Setup",
      "enabled": true,
      "agents": ["coder", "reviewer", "explorer"],
      "categories": ["coding"]
    }
  },
  "background_task": {
    "defaultConcurrency": 4,
    "staleTimeoutMs": 300000,
    "providerConcurrency": { "anthropic": 3, "openai": 2 }
  },
  "runtime_fallback": {
    "enabled": true,
    "retry_on_errors": [429, 500, 503],
    "max_fallback_attempts": 3,
    "cooldown_seconds": 30,
    "timeout_seconds": 120,
    "notify_on_fallback": true
  }
}
```

```json
// opencode.json 片段
{
  "providers": {
    "openai": {
      "name": "OpenAI",
      "npm": "@openai/sdk",
      "options": {},
      "models": {
        "gpt-4o": { "name": "GPT-4o", "contextWindow": 128000, "options": {} },
        "gpt-4o-mini": { "name": "GPT-4o Mini", "contextWindow": 128000, "options": {} },
        "o3": { "name": "o3", "contextWindow": 200000, "options": {} }
      }
    },
    "anthropic": {
      "name": "Anthropic",
      "npm": "@anthropic-ai/sdk",
      "options": {},
      "models": {
        "claude-sonnet-4-20250514": { "name": "Claude Sonnet 4", "contextWindow": 200000, "options": {} },
        "claude-opus-4-20250514": { "name": "Claude Opus 4", "contextWindow": 200000, "options": {} }
      }
    }
  }
}
```

---

## 九、已知限制与注意事项

### 9.1 功能限制

| 问题 | 影响 |  workaround |
|------|------|-------------|
| Provider 页面只读 | 无法通过 UI 添加/编辑 Provider | 使用 JSON 模式或导入功能 |
| Agent 表单仅覆盖约 32% 字段 | skills、permissions、prompt 等无 UI | 使用 JSON 模式编辑 |
| `tmux`/`team_mode` 导入导出丢失 | 字段在类型中存在但 store 处理不完整 | 手动编辑 JSONC 文件 |
| `writeNewConfig` 忽略 `isJsonc` | 新文件只加一行注释，非真正 JSONC | 手动添加注释 |
| 发布无并发控制 | 最后写入胜出，无 ETag/版本检查 | 避免多用户同时编辑 |
| 无 React 错误边界 | 运行时错误导致白屏 | 刷新页面恢复 |
| 发布前无校验 | 可写入无效配置 | 发布前仔细检查 |
| 删除使用 window.confirm | 部分页面仍使用原生确认框 | 注意确认操作 |
| 无加载状态 | 数据加载时显示空白 | 等待数据加载完成 |

### 9.2 使用建议

1. **定期导出备份** — 使用 Export 功能定期备份配置
2. **发布前预览 Diff** — 使用 Diff 功能确认变更内容
3. **利用模板快速开始** — 使用预置模板（Coding/Writing/Minimal/Full Stack）快速创建配置
4. **JSON 模式补充高级配置** — 对于 UI 未覆盖的字段，切换到 JSON 模式编辑
5. **注意草稿恢复** — 关闭页面前确保已保存或发布，避免草稿恢复提示
6. **Provider 颜色编码** — 利用颜色快速识别 Agent 使用的 Provider

### 9.3 配置文件路径

| 文件 | 路径 | 说明 |
|------|------|------|
| opencode.json | `~/.config/opencode/opencode.json` | 纯 JSON，管理 providers + models |
| oh-my-openagent.jsonc | `~/.config/opencode/oh-my-openagent.jsonc` | JSONC 带注释，管理 agents + categories + profiles + runtime |

---

## 附录：预置模板说明

### Coding 模板
- **Agents**: coder、reviewer、explorer
- **Categories**: coding
- **特点**: 适合软件开发场景，启用 thinking 模式，配置高推理努力程度

### Writing 模板
- **Agents**: writer、editor、researcher
- **Categories**: writing
- **特点**: 适合文档撰写场景，注重文本质量和一致性

### Minimal 模板
- **Agents**: assistant
- **Categories**: general
- **特点**: 最小化配置，适合快速上手和简单任务

### Full Stack 模板
- **Agents**: coder、reviewer、explorer、writer、editor、researcher、debugger
- **Categories**: coding、writing、debugging
- **特点**: 完整配置，覆盖开发、写作、调试全场景

---

*文档结束*
