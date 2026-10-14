export type CommandCallback = (this: void, ...args: string[]) => void;

declare const string: { match(this: void, value: string, pattern: string): string | undefined };
declare const IsSecureCmd: ((this: void, command: string) => boolean | undefined) | undefined;
declare function getmetatable(this: void, value: object): unknown;

/** Whitespace separates arguments; quotes preserve spaces and empty values. */
function parseArguments(message: string): string[] {
    const args: string[] = [];
    let value = "";
    let quote: string | undefined;
    let started = false;
    for (let index = 0; index < message.length; index += 1) {
        const character = message.charAt(index);
        if (quote !== undefined) {
            const next = message.charAt(index + 1);
            if (character === "\\" && (next === quote || next === "\\")) {
                value += next;
                index += 1;
            } else if (character === quote) quote = undefined;
            else value += character;
        } else if (character === '"' || character === "'") {
            quote = character;
            started = true;
        } else if (string.match(character, "%s") !== undefined) {
            if (started) args.push(value);
            value = "";
            started = false;
        } else {
            value += character;
            started = true;
        }
    }
    if (quote !== undefined) error("wuira.registerCommand: unterminated quoted argument");
    if (started) args.push(value);
    return args;
}

/** Native slash registration, with an idempotent cleanup and no shared module state. */
export function registerCommand(command: string, callback: CommandCallback): () => void {
    if (issecretvalue(command) || typeof command !== "string" || string.match(command, "^/%a[%w_-]*$") === undefined) {
        error("wuira.registerCommand: use a slash followed by a command name, without arguments");
    }
    if (typeof callback !== "function") error("wuira.registerCommand: callback must be a function");
    const normalized = command.toLowerCase();
    const lookup = normalized.toUpperCase();
    const hash = _G.hash_SlashCmdList as Record<string, unknown> | undefined;
    const chatTypes = _G.hash_ChatTypeInfoList as Record<string, unknown> | undefined;
    if (IsSecureCmd?.(lookup) || hash?.[lookup] !== undefined || chatTypes?.[lookup] !== undefined) {
        error("wuira.registerCommand: command already registered: " + normalized);
    }
    // Commands awaiting the client's next hash import are visible only through SLASH_* globals.
    for (const [key, value] of Object.entries(_G)) {
        if (key.startsWith("SLASH_") && !issecretvalue(value) && typeof value === "string" && value.toUpperCase() === lookup) {
            error("wuira.registerCommand: command already registered: " + normalized);
        }
    }
    let sequence = typeof _G.__wuiraCommandSequence === "number" ? _G.__wuiraCommandSequence as number : 0;
    let id: string;
    do { sequence += 1; id = "WUIRA_COMMAND_" + sequence; }
    while (SlashCmdList[id] !== undefined || _G["SLASH_" + id + "1"] !== undefined);
    _G.__wuiraCommandSequence = sequence;
    const globalKey = "SLASH_" + id + "1";
    let current: CommandCallback | undefined = callback;
    const handler: (this: void, message: string) => void = message => {
        if (current !== undefined) current(...parseArguments(message));
    };
    _G[globalKey] = normalized;
    SlashCmdList[id] = handler;
    let disposed = false;
    return () => {
        if (disposed) return;
        disposed = true;
        current = undefined;
        const currentHash = _G.hash_SlashCmdList as Record<string, unknown> | undefined;
        const currentChatTypes = _G.hash_ChatTypeInfoList as Record<string, unknown> | undefined;
        const ownsEntry = SlashCmdList[id] === handler;
        if (ownsEntry) {
            delete SlashCmdList[id];
            if (_G[globalKey] === normalized) delete _G[globalKey];
            // Forever moves imported handlers to SlashCmdList's __index proxy.
            const meta = getmetatable(SlashCmdList);
            if (typeof meta === "object" && meta !== null) {
                const proxy = (meta as { __index?: unknown }).__index;
                if (typeof proxy === "object" && proxy !== null && (proxy as Record<string, unknown>)[id] === handler) {
                    delete (proxy as Record<string, unknown>)[id];
                }
            }
            if (currentChatTypes?.[lookup] === id) delete currentChatTypes[lookup];
        }
        if (currentHash?.[lookup] === handler) delete currentHash[lookup];
    };
}
