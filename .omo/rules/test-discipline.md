---
description: 测试纪律 — 读取或编辑本项目任何测试文件时生效
globs:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/__tests__/**/*.ts"
  - "**/__tests__/**/*.tsx"
  - "src/testing/**/*.ts"
  - "src/testing/**/*.tsx"
  - "vitest.setup.ts"
  - "jest.setup.ts"
---

# 测试纪律（不可协商）

**所有测试必须能在单个测试进程中一次通过 — 不允许隔离标志、重试、特殊排序。** 需要 `--only`、独立进程或特定顺序才能通过的测试就是**坏的**。修测试，不要惯着它。

## 不稳定 = 失败

10 次过 9 次的测试 = **10% 的失败率**。不是"偶尔"。是**坏的**。

**禁止**在测试体中使用以下代码（除非时间本身就是被测对象，如 `Date.now`、真实计时器、debounce/throttle 窗口）：

- `setTimeout(resolve, N)` / `await new Promise(r => setTimeout(r, N))` / `await sleep(N)`
- "等足够久让 X 发生" — "足够久"是瞎猜；CI 机器比你的笔记本慢或快，测试**一定**会在别人的环境里失败

替代方案：**在触发之前订阅，用显式超时等待信号。**

## 事件测试 — 先订阅，超时约束

当被测代码触发事件、回调或 resolve promise 时：

1. **先注册监听器 / 构建 awaitable，再触发动作。** 反序 = 丢失事件 = 不稳定。
2. **与显式超时做 race。** 超时后**报错并带有用信息**（`"等待 5s 事件 'X'，从未触发"`）。绝不静默重试，绝不静默跳过。
3. 超时是**熔断器**，不是同步原语。如果断言逻辑依赖超时先触发，测试本身就写错了。

## 禁止隔离拐杖

测试必须在单次测试运行中任意并行排序下通过，**不管用了多少 mock。**

禁止：

- 用 `.only` / `.skip` 掩盖不稳定测试
- 用独立进程运行某个测试来"修复"状态泄漏
- 重排 `describe` / `it` 块来掩盖交叉污染
- 依赖测试 A 在测试 B 之前运行

交叉污染 = **状态泄漏**。找到泄漏源。在 `beforeEach` 中重置，如果是共享状态就加到 setup 文件中，或者在模块边界做 mock（`vi.mock` / `jest.mock`）而不是修改其他测试会读到的全局变量。

### Zustand Store 测试隔离

本项目使用 Zustand 作为状态管理。测试中涉及 store 时必须：

```ts
// ✅ 正确：在 beforeEach 中重置 store
beforeEach(() => {
  const store = useConfigStore.getState()
  store.discardChanges() // 或调用 store 的 reset 方法
})

// ❌ 错误：依赖测试执行顺序，假设前一个测试没有修改 store
// 假设 store 处于初始状态，但不保证
```

如果 store 没有内置 reset 方法，在测试 setup 文件中添加：

```ts
// vitest.setup.ts 或 jest.setup.ts
import { useConfigStore } from '@/store/configStore'

beforeEach(() => {
  // 重置 store 到初始状态
  useConfigStore.setState(useConfigStore.getInitialState())
})
```

## UI 组件测试 — 断言行为，不断言实现细节

测试 React 组件时，**不要断言内部实现细节**。

**禁止 — 这些测试守护的是实现细节，不是行为：**

```ts
// ❌ 断言 DOM 结构细节
expect(container.querySelector('div > div > button')).toBeTruthy()

// ❌ 断言 CSS class 名称（class 改名测试就挂）
expect(element.className).toBe('bg-blue-500')

// ❌ 断言内部 state 值
expect(wrapper.state('isOpen')).toBe(true)
```

**必须 — 断言用户可观察的行为：**

- "点击按钮后，对话框**应该出现**" → `expect(screen.getByRole('dialog')).toBeInTheDocument()`
- "表单提交后，**应该调用** onSubmit 回调" → `expect(onSubmit).toHaveBeenCalledWith(expectedData)`
- "输入无效值时，**应该显示**错误提示" → `expect(screen.getByText('必填字段')).toBeInTheDocument()`
- "数据加载中，**应该显示**骨架屏" → `expect(screen.getByTestId('skeleton')).toBeInTheDocument()`

使用 `@testing-library/react` 的查询优先级：
1. `getByRole` — 最优先，最接近用户体验
2. `getByLabelText` / `getByPlaceholderText` — 表单场景
3. `getByText` — 文本内容
4. `getByTestId` — 最后手段，需要组件显式添加 `data-testid`

## 配置 Schema 测试 — 断言约束，不断言完整结构

测试配置 schema 和验证逻辑时，**不要断言完整的输出对象**。

**禁止：**

```ts
// ❌ 完整对象匹配 — 新增字段就挂
expect(config).toEqual({ providers: {...}, models: {...}, agents: {...} })

// ❌ 硬编码版本号
expect(config.version).toBe('1.0.0')
```

**必须 — 断言验证规则：**

- "缺少必填字段时，**应该拒绝**并返回错误" → 测试验证失败路径
- "提供无效枚举值时，**应该拒绝**" → 测试边界条件
- "合并冲突时，**应该优先使用**用户配置而非模板" → 测试合并策略
- "JSONC 文件中注释**必须保留**" → 测试注释保留行为

## Mock 规范

### 外部依赖

```ts
// ✅ 正确：在模块边界 mock
vi.mock('@/lib/configReader', () => ({
  readConfig: vi.fn().mockResolvedValue(mockConfig),
}))

// ❌ 错误：直接修改导入的对象
import * as configReader from '@/lib/configReader'
configReader.readConfig = vi.fn() // 可能影响其他测试
```

### Monaco Editor

Monaco Editor 在测试环境中无法初始化，必须 mock：

```ts
vi.mock('@monaco-editor/react', () => ({
  default: vi.fn().mockReturnValue(null),
  loader: { config: vi.fn() },
}))
```

### dnd-kit

拖拽相关组件在测试中不需要真实 DnD 上下文：

```ts
// 测试可排序列表时，mock DndContext 为简单的 children 渲染
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => children,
  useSensor: vi.fn(),
  useSensors: vi.fn(() => ({})),
}))
```

## Next.js 测试注意事项

### Server Component vs Client Component

- Server Component（无 `"use client"`）不能用 `@testing-library/react` 直接渲染
- 测试 Server Component 时，只测试它传递给 Client Component 的 props
- Client Component 可以正常测试

### API Routes

```ts
// 测试 API route 时，使用 NextRequest 模拟
import { GET } from '@/app/api/config/route'
import { NextRequest } from 'next/server'

it('应该返回配置数据', async () => {
  const request = new NextRequest('http://localhost/api/config')
  const response = await GET(request)
  expect(response.status).toBe(200)
})
```

### 文件系统 Mock

API route 中读取/写入配置文件时，mock `fs` 模块：

```ts
vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue(JSON.stringify(mockConfig)),
  writeFile: vi.fn().mockResolvedValue(undefined),
}))
```

## Footer
