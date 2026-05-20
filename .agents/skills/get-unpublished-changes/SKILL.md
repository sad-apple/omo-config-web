---
name: get-unpublished-changes
description: "对比 HEAD 与最新 git tag，列出所有未发布的变更。触发词：unpublished changes, changelog, what changed, whats new, 未发布变更, 变更日志"
---

立即输出分析结果。不要提问。不要开场白。

## 关键：不要只复制 commit message！

对于每个 commit，你必须：
1. 阅读实际的 diff 来理解**改了什么**
2. 用通俗语言描述**真正的变更内容**
3. 解释**为什么重要**（如果不明显的话）

## 步骤：
1. 获取最新 tag：`git describe --tags --abbrev=0 2>/dev/null || echo "no tags"`
2. 运行 `git diff {latest-tag}..HEAD` 查看实际变更
3. 按类型（feat/fix/refactor/docs）分组，使用**真实描述**
4. 标注破坏性变更（breaking changes）
5. 推荐版本升级类型（major/minor/patch）

## 输出格式：
- feat: "新增了 X，实现了 Y"（而不是"添加 X 功能"）
- fix: "修复了 X 导致 Y 的问题，现在 Z"（而不是"修复 X bug"）
- refactor: "将 X 从 A 改为 B，现在支持 C"（而不是"重命名 X"）

<version-context>
<latest-tag>
!`git describe --tags --abbrev=0 2>/dev/null || echo "no tags"`
</latest-tag>
<local-version>
!`node -p "require('./package.json').version" 2>/dev/null || echo "unknown"`
</local-version>
</version-context>

<git-context>
<commits-since-tag>
!`git describe --tags --abbrev=0 2>/dev/null | xargs -I{} git log "{}"..HEAD --oneline 2>/dev/null || echo "no commits since last tag"`
</commits-since-tag>
<diff-stat>
!`git describe --tags --abbrev=0 2>/dev/null | xargs -I{} git diff "{}"..HEAD --stat 2>/dev/null || echo "no diff available"`
</diff-stat>
</git-context>

<output-format>
## 未发布变更（{latest-tag} → HEAD）

### ✨ 新功能 (feat)
| 模块 | 变更内容 |
|-------|--------------|
| X | 实际变更描述 |

### 🐛 修复 (fix)
| 模块 | 变更内容 |
|-------|--------------|
| X | 实际变更描述 |

### ♻️ 重构 (refactor)
| 模块 | 变更内容 |
|-------|--------------|
| X | 实际变更描述 |

### 📝 文档 (docs)
| 模块 | 变更内容 |
|-------|--------------|
| X | 实际变更描述 |

### ⚠️ 破坏性变更
无 或 列出具体变更

### 文件变更统计
{diff-stat}

### 建议版本升级
- **推荐类型**：patch | minor | major
- **理由**：推荐原因
</output-format>
