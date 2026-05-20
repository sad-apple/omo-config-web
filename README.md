# OMO Config Web

[Oh-My-OpenAgent (OMO)](https://github.com/code-yeongyu/oh-my-openagent) 多智能体编排的可视化配置管理工具。通过 Web UI 管理 Provider、模型、智能体、分类和配置方案，告别手动编辑 JSON 配置文件。

## 功能特性

- **Provider 管理** — 可视化添加、编辑、删除 AI 提供商及其 API 配置
- **模型管理** — 配置模型的上下文窗口、温度、最大 Token、思维链等参数
- **智能体配置** — 为不同角色（coder、reviewer 等）分配模型、设置权限和回退策略
- **分类管理** — 按任务类型对智能体进行分类管理
- **配置方案 (Profiles)** — 创建多套配置方案，按需启用不同智能体和分类
- **预设配置管理** — 创建、切换、删除多套预设配置，按需启用不同智能体和模型组合
- **冲突检测** — 发布时自动检测磁盘配置变更，避免覆盖他人修改
- **配置验证** — 发布前校验配置完整性，拦截无效引用和缺失必填字段
- **发布并发控制** — ETag 版本检查，防止最后写入覆盖问题

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) + React 19 |
| 语言 | TypeScript (Strict Mode) |
| 样式 | Tailwind CSS v4 + shadcn/ui |
| 状态管理 | Zustand 5 |
| 表单 | react-hook-form + Zod |
| 代码编辑 | Monaco Editor (@monaco-editor/react) |
| 拖拽 | @dnd-kit (core + sortable) |
| 图标 | Lucide React |
| 通知 | Sonner |
| JSONC | jsonc-parser |

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 9

### 安装

从 GitHub Releases 下载预构建包并全局安装（无需构建环境）：

```bash
# 一键安装/更新到最新版本
curl -fsSL https://raw.githubusercontent.com/sad-apple/omo-config-web/main/install.sh | bash -s update

# 或下载后执行
curl -fsSL https://raw.githubusercontent.com/sad-apple/omo-config-web/main/install.sh -o install.sh
chmod +x install.sh
bash install.sh update

# 安装指定版本
bash install.sh update v0.2.0
```

安装完成后，`omo-config-web` 命令全局可用。

### 配置管理

预设配置存放在 `~/.config/omo-config-web/` 目录下，每个配置一个子目录：

```
~/.config/omo-config-web/
├── default/                    # 默认配置
│   ├── opencode.json
│   └── oh-my-openagent.jsonc
├── daily/                      # 日常开发配置
│   ├── opencode.json
│   └── oh-my-openagent.jsonc
└── .current                    # 记录当前使用的配置
```

```bash
# 列出所有预设配置
omo-config-web list

# 创建新配置
omo-config-web create daily

# 切换到指定配置
omo-config-web use daily

# 查看当前配置
omo-config-web current

# 删除配置
omo-config-web delete daily
```

### 服务管理

```bash
omo-config-web start              # 使用当前配置启动服务
omo-config-web start daily        # 使用指定配置启动服务
omo-config-web stop               # 停止服务
omo-config-web restart            # 重启服务
omo-config-web status             # 查看状态
```

启动时会自动将预设配置复制到 `~/.config/opencode/` 目录供应用读取。

#### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| PORT | 3000 | 服务端口 |

自定义端口示例：

```bash
PORT=8080 omo-config-web start
```

### 开发

```bash
# 启动开发服务器
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建

```bash
# 生产构建（包含类型检查）
pnpm build

# 启动生产服务器
pnpm start
```

### 代码检查

```bash
pnpm lint
```

## 项目结构

src/
├── app/                        # Next.js App Router 页面
│   ├── page.tsx                # 仪表盘（Dashboard）
│   ├── layout.tsx              # 根布局：主题 + 侧边栏 + 头部
│   ├── error.tsx               # 全局错误边界
│   ├── loading.tsx             # 全局加载骨架屏
│   ├── providers/              # Provider 管理页面（含 error.tsx + loading.tsx）
│   ├── models/                 # 模型管理页面（含 error.tsx + loading.tsx）
│   ├── agents/                 # 智能体管理页面（含 error.tsx + loading.tsx）
│   ├── profiles/               # 配置方案管理页面（含 error.tsx + loading.tsx）
│   └── api/config/             # API 路由
│       ├── route.ts            # GET: 读取磁盘配置
│       ├── publish/route.ts    # POST: 写入配置（JSONC + ETag 并发控制）
│       ├── presets/route.ts    # GET/POST: 预设配置管理
│       └── activate/route.ts   # POST: 激活预设配置
├── components/
│   ├── ui/                     # shadcn/ui 基础组件
│   ├── layout/                 # 布局组件（侧边栏、头部、主题）
│   ├── providers/              # Provider 相关组件
│   ├── models/                 # 模型相关组件
│   ├── agents/                 # 智能体相关组件
│   ├── profiles/               # 配置方案相关组件
│   ├── forms/                  # 表单组件
│   └── editor/                 # Monaco 编辑器、发布管理、预设选择器
├── hooks/                      # 自定义 Hooks
├── lib/                        # 工具库（配置读写、合并、验证、ETag 等）
├── store/                      # Zustand 状态管理
└── types/                      # TypeScript 类型定义

## 配置文件

本工具采用**预设配置 + 启动时应用**的模式：

### 预设配置目录

所有预设配置存放在 `~/.config/omo-config-web/` 下，每个配置一个子目录：

```
~/.config/omo-config-web/
├── default/
│   ├── opencode.json          # 提供商和模型
│   └── oh-my-openagent.jsonc  # 智能体、分类、配置方案
├── daily/
│   ├── opencode.json
│   └── oh-my-openagent.jsonc
└── .current                   # 当前使用的配置名称
```

### 运行时配置目录

启动服务时，预设配置会自动复制到 `~/.config/opencode/`：

| 文件 | 格式 | 内容 |
|------|------|------|
| `~/.config/opencode/opencode.json` | JSON | 提供商 (providers) 和模型 (models) |
| `~/.config/opencode/oh-my-openagent.jsonc` | JSONC | 智能体、分类、配置方案、运行时配置 |

应用通过 API 路由读取和写入运行时配置目录，写入时使用 `jsonc-parser` 保留注释和格式。

## 使用指南

### 1. 添加 Provider

进入 **Providers** 页面，点击添加新 Provider，填写：
- **名称**：如 `openai`、`anthropic`、`siliconflow`
- **NPM 包名**：对应的 LiteLLM 提供商包名
- **API 配置**：`baseURL` 和 `apiKey`

### 2. 添加模型

在 Provider 下添加模型，配置：
- 上下文窗口大小
- 温度 (temperature)、最大 Token、Top P
- 思维链 (thinking) 配置
- 推理努力程度 (reasoning effort)

### 3. 配置智能体

进入 **Agents** 页面，为每个智能体角色设置：
- 主模型和回退模型列表
- 关联的分类
- 温度、Top P 等运行时参数

### 4. 创建配置方案

在 **Profiles** 页面：
- 创建新的配置方案（如 "日常开发"、"代码审查"）
- 拖拽添加智能体和分类到方案中
- 启用/禁用特定方案

### 5. 发布配置

点击页面右上角的 **发布** 按钮：
- 预览配置变更差异
- 确认后将配置写入本地磁盘
- 查看发布历史，支持回滚到任意版本

## 开发指南

### 添加 shadcn/ui 组件

```bash
pnpm dlx shadcn@latest add <component>
```

### 路径别名

项目配置了 `@/*` 路径别名，映射到 `./src/*`：

```typescript
import { cn } from "@/lib/utils";
import { useConfigStore } from "@/store/configStore";
```

### 状态管理

所有状态通过 Zustand store 管理，使用独立的 selector 避免不必要的重渲染：

```typescript
// 推荐：使用独立 selector
const agents = useConfigStore((s) => s.agents);
const setAgents = useConfigStore((s) => s.setAgents);

// 不推荐：解构整个 store
const { agents, setAgents } = useConfigStore();
```

### Tailwind CSS v4

本项目使用 Tailwind CSS v4，主题变量定义在 `src/app/globals.css` 的 `@theme` 块中，无需 `tailwind.config.ts`。

- Agent 配置表单仅覆盖约 32% 的字段（skills、permissions、prompt 等尚未支持）
- `tmux` 和 `team_mode` 字段在导入/导出时会丢失
## 许可证

MIT
