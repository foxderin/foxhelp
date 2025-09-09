# FoxHelp - 增强版帮助插件

一个为 Koishi 设计的功能强大的帮助插件，支持自定义格式、图片、反馈系统、统计信息和分页显示等高级功能。

## ✨ 主要功能

### 🎨 自定义格式化
- **格式模板**：支持为标题、描述、别名、用法、选项、示例、子命令和页脚设置自定义格式模板
- **动态变量**：模板中可使用 `{content}` 和 `{time}` 变量

### 🖼️ 图片支持
- **自定义图片**：为帮助信息添加自定义图片
- **图片后缀**：在图片后添加自定义文本

### 📊 统计功能
- **使用统计**：跟踪命令使用次数和涉及的命令数量
- **最后使用时间**：记录每个命令的最后使用时间

### 📄 分页显示
- **智能分页**：当命令数量较多时自动分页显示
- **自定义页面大小**：可配置每页显示的命令数量
- **分页导航**：提供上一页/下一页导航提示

### 💬 反馈系统
- **反馈选项**：用户可通过 `-f` 选项获取反馈信息
- **群组邀请**：支持显示群组邀请链接

## 🚀 使用方法

### 基本用法
```bash
foxhelp              # 显示所有可用命令
foxhelp <command>     # 显示特定命令的帮助
foxhelp -H            # 显示隐藏的命令和选项
foxhelp -p 2          # 显示第2页的命令列表
foxhelp -s 5          # 每页显示5个命令
foxhelp -f            # 显示反馈信息
```

### 高级选项
- `-H, --showHidden`: 显示隐藏的命令和选项
- `-p, --page <number>`: 指定页码
- `-s, --pageSize <number>`: 每页显示数量
- `-f, --feedback`: 提供反馈

## ⚙️ 配置选项

```yaml
# 基础配置
shortcut: true        # 是否启用快捷调用
options: true         # 是否为每个指令添加 -h, --help 选项

# 图片配置
customImage: "https://example.com/help.png"  # 自定义帮助图片URL
imageSuffix: "感谢使用！"                     # 图片后缀文本

# 反馈配置
feedback: true                               # 是否启用反馈功能
inviteGroup: "https://example.com/group"     # 邀请群组链接

# 统计配置
statistics: true      # 是否启用统计信息显示

# 分页配置
pagination:
  enabled: true       # 是否启用分页显示
  pageSize: 10        # 每页显示的命令数量

# 格式化配置
formatters:
  title: "🎯 {content}"                      # 标题格式
  description: "📝 {content}"               # 描述格式
  aliases: "🔗 {content}"                   # 别名格式
  usage: "💡 用法：{content}"               # 用法格式
  options: "⚙️ 选项：\n{content}"           # 选项格式
  examples: "📋 示例：\n{content}"          # 示例格式
  subcommands: "📂 子命令：\n{content}"     # 子命令格式
  footer: "⏰ 生成时间：{time}"              # 页脚格式
```

## 🌍 多语言支持

插件支持以下语言：
- 中文简体 (zh-CN)
- 中文繁体 (zh-TW)
- 英语 (en-US)
- 日语 (ja-JP)
- 法语 (fr-FR)
- 俄语 (ru-RU)
- 德语 (de-DE)

## 📈 统计信息显示

当启用统计功能时，帮助信息会显示：
- 总使用次数
- 涉及的命令数量
- 每个命令的使用统计

## 🔧 开发者信息

### 事件系统
插件提供以下事件：
- `foxhelp/command`: 命令帮助生成时触发
- `foxhelp/option`: 选项描述生成时触发

### 扩展模式
插件扩展了 Koishi 的模块声明，为命令和选项添加了额外的配置选项：
- `hideOptions`: 隐藏所有选项
- `hidden`: 在帮助菜单中隐藏
- `params`: 本地化参数

## 📄 许可证

MIT License

## 👨‍💻 作者

foxderin <admin@glassfoxowo.com>

## 🔗 链接

- [GitHub Repository](https://github.com/foxderin/foxhelp)
- [Issue Tracker](https://github.com/foxderin/foxhelp/issues)
