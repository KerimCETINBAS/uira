declare const _G: Record<string, unknown>;
declare function print(this: void, message: string): void;
declare function tostring(this: void, value: unknown): string;

declare global {
    const console: {
        log(this: void, ...values: unknown[]): void;
        info(this: void, ...values: unknown[]): void;
        warn(this: void, ...values: unknown[]): void;
        error(this: void, ...values: unknown[]): void;
    };
}

function write(color: string, values: unknown[]): void {
    print(`${color}${values.map(value => tostring(value)).join(" ")}|r`);
}

// Explicit side-effect import installs the WoW console; no Node runtime is used.
_G.console = {
    log: function(this: void, ...values: unknown[]) { write("|cffffffff", values); },
    info: function(this: void, ...values: unknown[]) { write("|cff60d9c5", values); },
    warn: function(this: void, ...values: unknown[]) { write("|cffffcc00", values); },
    error: function(this: void, ...values: unknown[]) { write("|cffff5555", values); },
};
export {};
