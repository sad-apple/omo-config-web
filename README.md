# OMO Config Web

[Oh-My-OpenAgent (OMO)](https://github.com/code-yeongyu/oh-my-openagent) 的可视化配置管理工具。用 Web UI 替代手动编辑 JSON，管理 Provider、模型、智能体和配置方案。

## 功能

| 模块 | 能力 |
|------|------|
| **Provider** | 添加 / 编辑 / 删除 AI 提供商，配置 API Key 和 Base URL |
| **Model** | 配置上下文窗口、温度、Token 上限、思维链、推理努力度等参数 |
| **Agent** | 为不同角色分配主模型与回退模型，设置权限和运行时参数 |
| **Profile** | 拖拽排序配置方案，按需启用不同智能体和分类组合 |
| **Preset** | 多套预设配置的创建、切换、删除，含差异检测和自动备份 |
| **JSON Editor** | Monaco 双模式编辑（可视化 ↔ JSON），300ms 双向同步 |
| **发布** | ETag 并发控制 + JSONC 格式保留写入，冲突检测避免覆盖 |
| **主题** | 深色 / 浅色一键切换 |

## 快速开始

### 一键安装（推荐）

无需 Node.js、无需构建，从 GitHub Releases 下载预构建包：

```bash
curl -fsSL https://raw.githubusercontent.com/sad-apple/omo-config/main/install.sh | bash -s update
```

安装完成后 `omo-config` 命令全局可用：

```bash
omo-config start     # 启动服务 → http://localhost:3000
```

指定版本安装：

```bash
bash install.sh update v0.1.0
```

### 源码安装

需要 Node.js ≥ 18 和 pnpm ≥ 9：

```bash
git clone https://github.com/sad-apple/omo-config.git
cd omo-config
bash scripts/setup-dev.sh   # 检查依赖 → 安装 → 构建 → 初始化配置 → 注册 CLI
omo-config start             # 启动服务
```

## CLI 命令

`omo-config` 是全局 CLI，安装后即可使用：

### 服务管理

```bash
omo-config start       # 启动 Web 服务（默认端口 3000）
omo-config stop        # 停止服务
omo-config restart     # 重启服务
omo-config status      # 查看运行状态和当前配置
```

自定义端口：

```bash
PORT=8080 omo-config start
```

### 预设配置管理

预设配置存放在 `~/.config/omo-config/`，每个预设是一个子目录：

```
~/.config/omo-config/
├── default/                    # 默认预设
│   ├── opencode.json           # Provider + Model
│   └── oh-my-openagent.jsonc   # Agent + Category + Profile + Runtime
├── daily/                      # 自定义预设
│   ├── opencode.json
│   └── oh-my-openagent.jsonc
└── .current                    # 当前激活的预设名称
```

```bash
omo-config list              # 列出所有预设（* 标记当前）
omo-config create daily      # 创建新预设
omo-config use daily         # 切换预设（含差异检测 + 自动备份）
omo-config current           # 查看当前预设名
omo-config delete daily      # 删除预设（不能删当前）
```

### 安装与更新

```bash
bash install.sh update           # 更新到最新版
bash install.sh update v0.2.0    # 安装指定版本
bash install.sh uninstall        # 卸载（配置数据保留）
```

## 配置文件

应用管理两个配置文件，位于 `~/.config/opencode/`：

| 文件 | 格式 | 内容 |
|------|------|------|
| `opencode.json` | JSON | Provider 定义、Model 参数 |
| `oh-my-openagent.jsonc` | JSONC | Agent 配置、Category 分类、Profile 方案、Runtime 参数 |

### 安全同步

CLI (`omo-config use`) 和 Web ("Activate" 按钮) 在覆盖运行时配置时：

1. **差异检测** — 比较预设文件与运行时文件
2. **用户确认** — CLI 输入 `y/N`，Web 弹出确认对话框
3. **自动备份** — 旧文件备份到 `~/.config/omo-config/.backup/<时间戳>/`
4. **原子操作** — 先写临时文件再 rename，确保一致性

> `start` 命令仅启动服务器，不会复制任何配置文件。

## Web UI 使用

启动服务后访问 http://localhost:3000：

1. **Providers** — 点击添加按钮创建 Provider，填写名称、API Key、Base URL
2. **Models** — 在 Provider 下添加模型，配置上下文窗口、温度、思维链等
3. **Agents** — 为智能体角色分配主模型和回退模型，关联分类
4. **Profiles** — 拖拽添加智能体和分类到配置方案，启用/禁用方案
5. **发布** — 右上角发布按钮，预览差异 → 确认写入磁盘
6. **预设** — 右上角预设选择器，切换/激活不同预设配置

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) + React 19 |
| 语言 | TypeScript Strict Mode |
| 样式 | Tailwind CSS v4 + shadcn/ui (new-york) |
| 状态 | Zustand 5（单 Store） |
| 表单 | react-hook-form + Zod（Agent 表单） |
| 编辑器 | Monaco Editor（JSON 模式，双向同步） |
| 拖拽 | @dnd-kit (core + sortable) |
| JSONC | jsonc-parser（读写保留注释） |
| 图标 | Lucide React |
| 通知 | Sonner |

## 项目结构

```
src/
├── app/                        # Next.js App Router
│   ├── page.tsx                # Dashboard
│   ├── providers/              # Provider 页面
│   ├── models/                 # Model 页面
│   ├── agents/                 # Agent 页面
│   ├── profiles/               # Profile 页面
│   └── api/config/             # API 路由
│       ├── route.ts            # GET 读取配置
│       ├── publish/route.ts    # POST 写入配置（JSONC + ETag）
│       ├── presets/route.ts    # 预设 CRUD
│       └── activate/route.ts   # 预设激活（差异检测 + 原子复制）
├── components/
│   ├── ui/                     # shadcn/ui 基础组件
│   ├── layout/                 # 侧边栏、头部、主题
│   ├── providers/              # Provider 组件 + ProviderConfigSheet
│   ├── models/                 # Model 组件
│   ├── agents/                 # Agent 组件 + AgentConfigSheet
│   ├── profiles/               # Profile 组件 + 拖拽排序
│   ├── forms/                  # 表单组件（Agent、Model 参数等）
│   └── editor/                 # Monaco 编辑器、发布、预设选择器
├── hooks/                      # useConfigExport, useDraftRestore, usePublish 等
├── lib/                        # configReader, config-splitter, config-merger,
│                               # jsonc-writer, config-validator, etag, model-ref
├── store/                      # configStore.ts（Zustand 单 Store）
└── types/                      # index.ts（类型唯一来源）
```

## 开发

```bash
# 开发服务器
pnpm dev

# 生产构建（含类型检查）
pnpm build

# 启动生产服务器
pnpm start

# 代码检查
pnpm lint
```

### 添加 shadcn/ui 组件

```bash
pnpm dlx shadcn@latest add <component>
```

### 约定

- **类型定义**：`src/types/index.ts` 是唯一来源，禁止重复定义
- **Store**：使用独立 selector `useConfigStore((s) => s.field)`，不要解构整个 store
- **表单**：Agent 表单用 react-hook-form + Zod，其他表单用 `useState` + `useEffect`
- **Tailwind v4**：主题变量在 `src/app/globals.css` 的 `@theme` 块中，无 `tailwind.config.ts`
- **路径别名**：`@/*` → `./src/*`
- **页面模式**：Server Component 读取数据 → 传给 `*Client.tsx` 子组件使用 store

## 发布

通过 GitHub Actions 自动构建和发布：

1. 在 GitHub 仓库页面 → Actions → Release → Run workflow
2. 选择版本类型（patch / minor / major）
3. CI 自动：bump 版本 → 构建 → 打包 → 创建 Release + 上传 tar.gz

手动触发：

```bash
git tag v0.2.0
git push origin v0.2.0
```

## 许可证

MIT
