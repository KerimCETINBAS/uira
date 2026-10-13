declare function print(this: void, message: string): void;

/** Local client output only; never sends chat messages to other players. */
export class Console {
    private constructor() {}

    public static Echo(message: string): void {
        print(`|cff60d9c5[wuira]|r ${message}`);
    }
}
