import { Argv, Command, Computed, Context, FieldCollector, h, Schema, Session } from 'koishi'
import zhCN from './locales/zh-CN.yml'
import enUS from './locales/en-US.yml'

declare module 'koishi' {
  interface Events {
    'foxhelp/command'(output: string[], command: Command, session: Session<never, never>): void
    'foxhelp/option'(output: string, option: Argv.OptionVariant, command: Command, session: Session<never, never>): string
  }

  namespace Command {
    interface Config {
      /** hide all options by default */
      hideOptions?: boolean
      /** hide command */
      hidden?: Computed<boolean>
      /** localization params */
      params?: object
    }
  }

  namespace Argv {
    interface OptionConfig {
      /** hide option */
      hidden?: Computed<boolean>
      /** localization params */
      params?: object
    }
  }
}

interface HelpOptions {
  showHidden?: boolean
  page?: number
  pageSize?: number
  feedback?: boolean
}

interface HelpStats {
  totalCommands: number
  totalUsage: number
  lastUsed: Date
}

export interface Config {
  shortcut?: boolean
  options?: boolean
  customImage?: string
  imageSuffix?: string
  inviteGroup?: string
  feedback?: boolean
  pagination?: {
    enabled?: boolean
    pageSize?: number
  }
  statistics?: boolean
  formatters?: {
    title?: string
    description?: string
    aliases?: string
    usage?: string
    options?: string
    examples?: string
    subcommands?: string
    footer?: string
  }
}

export const Config: Schema<Config> = Schema.object({
  shortcut: Schema.boolean().default(true).description('是否启用快捷调用。'),
  options: Schema.boolean().default(true).description('是否为每个指令添加 `-h, --help` 选项。'),
  customImage: Schema.string().description('自定义帮助图片URL。'),
  imageSuffix: Schema.string().description('图片后缀文本。'),
  inviteGroup: Schema.string().description('邀请群组链接。'),
  feedback: Schema.boolean().default(false).description('是否启用反馈功能。'),
  pagination: Schema.object({
    enabled: Schema.boolean().default(true).description('是否启用分页显示。'),
    pageSize: Schema.number().default(10).description('每页显示的命令数量。'),
  }).description('分页配置'),
  statistics: Schema.boolean().default(false).description('是否启用统计信息显示。'),
  formatters: Schema.object({
    title: Schema.string().description('标题格式模板。'),
    description: Schema.string().description('描述格式模板。'),
    aliases: Schema.string().description('别名格式模板。'),
    usage: Schema.string().description('用法格式模板。'),
    options: Schema.string().description('选项格式模板。'),
    examples: Schema.string().description('示例格式模板。'),
    subcommands: Schema.string().description('子命令格式模板。'),
    footer: Schema.string().description('页脚格式模板。'),
  }).description('输出格式配置'),
})

function executeHelp(session: Session<never, never>, name: string) {
  if (!session.app.$commander.get('foxhelp')) return
  return session.execute({
    name: 'foxhelp',
    args: [name],
  })
}

export const name = 'foxhelp'

function applyFormatter(template: string | undefined, content: string, session: Session): string {
  if (!template) return content
  return template.replace('{content}', content).replace('{time}', new Date().toLocaleString())
}

export function apply(ctx: Context, config: Config) {
  ctx.i18n.define('zh-CN', zhCN)
  ctx.i18n.define('en-US', enUS)

  // 统计数据存储
  const helpStats = new Map<string, HelpStats>()
  
  function updateStats(commandName: string) {
    if (!config.statistics) return
    const stats = helpStats.get(commandName) || {
      totalCommands: 0,
      totalUsage: 0,
      lastUsed: new Date()
    }
    stats.totalUsage++
    stats.lastUsed = new Date()
    helpStats.set(commandName, stats)
  }

  function getStatsText(session: Session) {
    if (!config.statistics) return ''
    const totalUsage = Array.from(helpStats.values()).reduce((sum, stat) => sum + stat.totalUsage, 0)
    const totalCommands = helpStats.size
    return session.text('.statistics', [totalUsage, totalCommands])
  }

  function handleFeedback(session: Session, config: Config) {
    const feedbackText = session.text('.feedback-prompt')
    if (config.inviteGroup) {
      return feedbackText + '\n' + session.text('.feedback-group', [config.inviteGroup])
    }
    return feedbackText
  }

  function enableHelp(command: Command) {
    command[Context.current] = ctx
    command.option('help', '-h', {
      hidden: true,
      // @ts-ignore
      notUsage: true,
      descPath: 'commands.foxhelp.options.help',
    })
  }

  ctx.schema.extend('command', Schema.object({
    hideOptions: Schema.boolean().description('是否隐藏所有选项。').default(false).hidden(),
    hidden: Schema.computed(Schema.boolean()).description('在帮助菜单中隐藏指令。').default(false),
    params: Schema.any().description('帮助信息的本地化参数。').hidden(),
  }), 900)

  ctx.schema.extend('command-option', Schema.object({
    hidden: Schema.computed(Schema.boolean()).description('在帮助菜单中隐藏选项。').default(false),
    params: Schema.any().description('帮助信息的本地化参数。').hidden(),
  }), 900)

  if (config.options !== false) {
    ctx.$commander._commandList.forEach(enableHelp)
    ctx.on('command-added', enableHelp)
  }

  ctx.before('command/execute', (argv) => {
    const { command, options, session } = argv
    if (options['help'] && command._options.help) {
      return executeHelp(session, command.name)
    }

    if (command['_actions'].length) return
    return executeHelp(session, command.name)
  })

  const $ = ctx.$commander
  function findCommand(target: string, session: Session<never, never>) {
    const command = $.resolve(target, session)
    if (command?.ctx.filter(session)) return command

    // shortcuts
    const data = ctx.i18n
      .find('commands.(name).shortcuts.(variant)', target)
      .map(item => ({ ...item, command: $.resolve(item.data.name, session) }))
      .filter(item => item.command?.match(session))
    const perfect = data.filter(item => item.similarity === 1)
    if (!perfect.length) return data
    return perfect[0].command
  }

  const createCollector = <T extends 'user' | 'channel'>(key: T): FieldCollector<T> => (argv, fields) => {
    const { args: [target], session } = argv
    const result = findCommand(target, session)
    if (!Array.isArray(result)) {
      session.collect(key, { ...argv, command: result, args: [], options: { help: true } }, fields)
      return
    }
    for (const { command } of result) {
      session.collect(key, { ...argv, command, args: [], options: { help: true } }, fields)
    }
  }

  async function inferCommand(target: string, session: Session) {
    const result = findCommand(target, session)
    if (!Array.isArray(result)) return result

    const expect = $.available(session).filter((name) => {
      return name && session.app.i18n.compare(name, target)
    })
    for (const item of result) {
      if (expect.includes(item.data.name)) continue
      expect.push(item.data.name)
    }
    const cache = new Map<string, Promise<boolean>>()
    const name = await session.suggest({
      expect,
      prefix: session.text('.not-found'),
      suffix: session.text('internal.suggest-command'),
      filter: (name) => {
        const command = $.resolve(name, session)
        if (!command) return false
        return ctx.permissions.test(`command:${command.name}`, session, cache)
      },
    })
    return $.resolve(name, session)
  }

  const cmd = ctx.command('foxhelp [command:string]', { authority: 0, ...config })
    .userFields(['authority'])
    .userFields(createCollector('user'))
    .channelFields(createCollector('channel'))
    .option('showHidden', '-H')
    .option('page', '-p <page:number>')
    .option('pageSize', '-s <size:number>')
    .option('feedback', '-f')
    .action(async ({ session, options }, target) => {
      // 处理反馈选项
      if (options.feedback) {
        return handleFeedback(session, config)
      }

      // 转换选项类型
      const helpOptions: HelpOptions = {
        showHidden: !!options.showHidden,
        page: options.page ? Number(options.page) : 1,
        pageSize: options.pageSize ? Number(options.pageSize) : config.pagination?.pageSize || 10,
        feedback: !!options.feedback
      }

      if (!target) {
        updateStats('global')
        const prefix = session.resolve(session.app.koishi.config.prefix)[0] ?? ''
        const commands = $._commandList.filter(cmd => cmd.parent === null)
        const output = await formatCommands('.global-prolog', session, commands, helpOptions)
        
        // 添加自定义图片
        if (config.customImage) {
          output.unshift(h.image(config.customImage).toString())
        }
        
        // 添加统计信息
        const statsText = getStatsText(session)
        if (statsText) output.push(statsText)
        
        // 添加页脚
        const epilog = session.text('.global-epilog', [prefix])
        if (epilog) output.push(epilog)
        
        // 添加邀请群组链接
        if (config.inviteGroup) {
          output.push(session.text('.invite-group', [config.inviteGroup]))
        }
        
        // 添加图片后缀
        if (config.imageSuffix) {
          output.push(config.imageSuffix)
        }
        
        return output.filter(Boolean).join('\n')
      }

      updateStats(target)
      const command = await inferCommand(target, session)
      if (!command) return
      if (!await ctx.permissions.test(`command:${command.name}`, session)) {
        return session.text('internal.low-authority')
      }
      return showHelp(command, session, helpOptions)
    })

  if (config.shortcut !== false) cmd.shortcut('foxhelp', { i18n: true, fuzzy: true })
}

function* getCommands(session: Session<'authority'>, commands: Command[], showHidden = false): Generator<Command> {
  for (const command of commands) {
    if (!showHidden && session.resolve(command.config.hidden)) continue
    if (command.match(session) && Object.keys(command._aliases).length) {
      yield command
    } else {
      yield* getCommands(session, command.children, showHidden)
    }
  }
}

async function formatCommands(path: string, session: Session<'authority'>, children: Command[], options: HelpOptions) {
  const cache = new Map<string, Promise<boolean>>()
  // Step 1: filter commands by visibility
  children = Array.from(getCommands(session, children, options.showHidden))
  // Step 2: filter commands by permission
  children = (await Promise.all(children.map(async (command) => {
    return [command, await session.app.permissions.test(`command:${command.name}`, session, cache)] as const
  }))).filter(([, result]) => result).map(([command]) => command)
  // Step 3: sort commands by name
  children.sort((a, b) => a.displayName > b.displayName ? 1 : -1)
  if (!children.length) return []

  // Step 4: 分页处理
  const totalCommands = children.length
  const pageSize = options.pageSize || 10
  const currentPage = options.page || 1
  const totalPages = Math.ceil(totalCommands / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalCommands)
  const pagedChildren = children.slice(startIndex, endIndex)

  const prefix = session.resolve(session.app.koishi.config.prefix)[0] ?? ''
  const output = pagedChildren.map(({ name, displayName, config }) => {
    let output = '    ' + prefix + displayName.replace(/\./g, ' ')
    output += '  ' + session.text([`commands.${name}.description`, ''], config.params)
    return output
  })
  
  const hints: string[] = []
  if (totalPages > 1) {
    hints.push(session.text('.pagination-info', [currentPage, totalPages, totalCommands]))
  }
  
  const hintText = hints.length
    ? session.text('general.paren', [hints.join(session.text('general.comma'))])
    : ''
  output.unshift(session.text(path, [hintText]))
  
  // 添加分页导航
  if (totalPages > 1) {
    const navigation = []
    if (currentPage > 1) {
      navigation.push(session.text('.prev-page', [currentPage - 1]))
    }
    if (currentPage < totalPages) {
      navigation.push(session.text('.next-page', [currentPage + 1]))
    }
    if (navigation.length > 0) {
      output.push(session.text('.navigation', [navigation.join(' | ')]))
    }
  }
  
  return output
}

function getOptionVisibility(option: Argv.OptionConfig, session: Session<'authority'>) {
  if (session.user && option.authority > session.user.authority) return false
  return !session.resolve(option.hidden)
}

function getOptions(command: Command, session: Session<'authority'>, config: HelpOptions) {
  if (command.config.hideOptions && !config.showHidden) return []
  const options = config.showHidden
    ? Object.values(command._options)
    : Object.values(command._options).filter(option => getOptionVisibility(option, session))
  if (!options.length) return []

  const output: string[] = []
  Object.values(command._options).forEach((option) => {
    function pushOption(option: Argv.OptionVariant, name: string) {
      if (!config.showHidden && !getOptionVisibility(option, session)) return
      let line = `${h.escape(option.syntax)}`
      const description = session.text(option.descPath ?? [`commands.${command.name}.options.${name}`, ''], option.params)
      if (description) line += '  ' + description
      line = command.ctx.chain('foxhelp/option', line, option, command, session)
      output.push('    ' + line)
    }

    if (!('value' in option)) pushOption(option, option.name)
    for (const value in option.variants) {
      pushOption(option.variants[value], `${option.name}.${value}`)
    }
  })

  if (!output.length) return []
  output.unshift(session.text('.available-options'))
  return output
}

async function showHelp(command: Command, session: Session<'authority'>, options: HelpOptions) {
  // 获取配置中的格式化器
  const formatters = session.app.config.formatters || {}
  
  const titleText = session.text('.command-title', [command.displayName.replace(/\./g, ' ') + command.declaration])
  const output = [applyFormatter(formatters.title, titleText, session)]

  const description = session.text([`commands.${command.name}.description`, ''], command.config.params)
  if (description) {
    output.push(applyFormatter(formatters.description, description, session))
  }

  if (session.app.database) {
    const argv: Argv = { command, args: [], options: { help: true } }
    const userFields = session.collect('user', argv)
    await session.observeUser(userFields)
    if (!session.isDirect) {
      const channelFields = session.collect('channel', argv)
      await session.observeChannel(channelFields)
    }
  }

  if (Object.keys(command._aliases).length > 1) {
    const aliasText = session.text('.command-aliases', [Array.from(Object.keys(command._aliases).slice(1)).join('，')])
    output.push(applyFormatter(formatters.aliases, aliasText, session))
  }

  session.app.emit(session, 'foxhelp/command', output, command, session)

  if (command._usage) {
    const usageText = typeof command._usage === 'string' ? command._usage : await command._usage(session)
    output.push(applyFormatter(formatters.usage, usageText, session))
  } else {
    const text = session.text([`commands.${command.name}.usage`, ''], command.config.params)
    if (text) output.push(applyFormatter(formatters.usage, text, session))
  }

  const optionsOutput = getOptions(command, session, options)
  if (optionsOutput.length > 0) {
    const optionsText = optionsOutput.join('\n')
    output.push(applyFormatter(formatters.options, optionsText, session))
  }

  if (command._examples.length) {
    const examplesText = session.text('.command-examples') + '\n' + command._examples.map(example => '    ' + example).join('\n')
    output.push(applyFormatter(formatters.examples, examplesText, session))
  } else {
    const text = session.text([`commands.${command.name}.examples`, ''], command.config.params)
    if (text) {
      const examplesText = text.split('\n').map(line => '    ' + line).join('\n')
      output.push(applyFormatter(formatters.examples, examplesText, session))
    }
  }

  const subcommands = await formatCommands('.subcommand-prolog', session, command.children, options)
  if (subcommands.length > 0) {
    const subcommandsText = subcommands.join('\n')
    output.push(applyFormatter(formatters.subcommands, subcommandsText, session))
  }

  // 添加页脚
  if (formatters.footer) {
    output.push(applyFormatter(formatters.footer, '', session))
  }

  return output.filter(Boolean).join('\n')
}
