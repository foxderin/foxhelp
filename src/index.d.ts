import { Computed, Context, Schema, Session } from 'koishi';
declare module 'koishi' {
    interface Events {
        'foxhelp/command'(output: string[], command: Command, session: Session<never, never>): void;
        'foxhelp/option'(output: string, option: Argv.OptionVariant, command: Command, session: Session<never, never>): string;
    }
    namespace Command {
        interface Config {
            /** hide all options by default */
            hideOptions?: boolean;
            /** hide command */
            hidden?: Computed<boolean>;
            /** localization params */
            params?: object;
        }
    }
    namespace Argv {
        interface OptionConfig {
            /** hide option */
            hidden?: Computed<boolean>;
            /** localization params */
            params?: object;
        }
    }
}
export interface Config {
    shortcut?: boolean;
    options?: boolean;
    customImage?: string;
    imageSuffix?: string;
    inviteGroup?: string;
    feedback?: boolean;
    pagination?: {
        enabled?: boolean;
        pageSize?: number;
    };
    statistics?: boolean;
    formatters?: {
        title?: string;
        description?: string;
        aliases?: string;
        usage?: string;
        options?: string;
        examples?: string;
        subcommands?: string;
        footer?: string;
    };
}
export declare const Config: Schema<Config>;
export declare const name = "foxhelp";
export declare function apply(ctx: Context, config: Config): void;
