import { Store, StoreRegistry } from "../store";
import type { SavedStoreOptions } from "../store";
import { BlizzardUI } from "./BlizzardUI";

type NativeReturns<T extends unknown[]> = T & { readonly __tstlMultiReturn: unknown };
declare function InCombatLockdown(this: void): boolean;
declare function GetActionInfo(this: void, slot: number): NativeReturns<[string | undefined, number | undefined, string | undefined]>;
declare function GetCursorInfo(this: void): NativeReturns<[string | undefined]>;
declare function PickupAction(this: void, slot: number): void;
declare function PlaceAction(this: void, slot: number): void;
declare function ClearCursor(this: void): void;
declare const PickupSpell: ((this: void, id: number) => void) | undefined;
declare const PickupItem: ((this: void, id: number) => void) | undefined;
declare const PickupMacro: ((this: void, id: number) => void) | undefined;
declare const _G: Record<string, unknown>;
declare const SlashCmdList: Record<string, (this: void, text: string) => void>;

export interface ActionSlot {
    slot: number;
    type: "spell" | "item" | "macro";
    id: number;
    subtype?: string;
}

export interface EmptyActionBarsOptions extends SavedStoreOptions {
    clearCommand: string;
    restoreCommand: string;
}
class ActionBarBackup extends Store {
    public static readonly Token = "wuira.native-action-bars";
    public phase: "capture" | "ready" | "disabled" | "restore" | "restored" = "capture";
    public slots: ActionSlot[] = [];
}

/** Explicit destructive action-slot operations. Persist Capture() before Clear(). */
export class ActionBars {
    private constructor() {}
    // The installed Forever action-bar implementation enumerates these 180 slots.
    public static readonly SlotCount = 180;

    private static AssertReady(): void {
        if (InCombatLockdown()) error("ActionBars: changes must wait until combat ends");
        const [cursor] = GetCursorInfo();
        if (issecretvalue(cursor) || cursor !== undefined) error("ActionBars: clear the cursor before changing action slots");
    }
    private static Pickup(entry: Readonly<ActionSlot>): void {
        const spell = C_Spell?.PickupSpell ?? PickupSpell;
        const item = C_Item?.PickupItem ?? PickupItem;
        if (entry.type === "spell" && spell !== undefined) spell(entry.id);
        else if (entry.type === "item" && item !== undefined) item(entry.id);
        else if (entry.type === "macro" && PickupMacro !== undefined) PickupMacro(entry.id);
        else error("ActionBars: unsupported restore API for " + entry.type);
    }
    private static Validate(entry: Readonly<ActionSlot>): void {
        if (!Number.isInteger(entry.slot) || entry.slot < 1 || entry.slot > this.SlotCount
            || !Number.isInteger(entry.id) || entry.id <= 0) error("ActionBars: invalid backup entry");
        if ((entry.type === "spell" && (C_Spell?.PickupSpell ?? PickupSpell) !== undefined)
            || (entry.type === "item" && (C_Item?.PickupItem ?? PickupItem) !== undefined)
            || (entry.type === "macro" && PickupMacro !== undefined)) return;
        error("ActionBars: cannot safely restore action type " + entry.type);
    }
    public static Capture(): ActionSlot[] {
        this.AssertReady();
        const entries: ActionSlot[] = [];
        for (let slot = 1; slot <= this.SlotCount; slot += 1) {
            const [type, id, subtype] = GetActionInfo(slot);
            if (issecretvalue(type) || issecretvalue(id) || issecretvalue(subtype)) error("ActionBars: secret slot data cannot be backed up");
            if (type === undefined) continue;
            if (type !== "spell" && type !== "item" && type !== "macro") error("ActionBars: unsupported action type " + type + "; no slots were cleared");
            const entry: ActionSlot = { slot, type, id: id!, subtype };
            this.Validate(entry);
            entries.push(entry);
        }
        return entries;
    }
    public static Clear(backup: readonly Readonly<ActionSlot>[]): void {
        this.AssertReady();
        const current = this.Capture();
        const covered = new Map<number, Readonly<ActionSlot>>();
        for (const entry of backup) { this.Validate(entry); covered.set(entry.slot, entry); }
        for (const entry of current) {
            const saved = covered.get(entry.slot);
            if (saved === undefined || saved.type !== entry.type || saved.id !== entry.id) error("ActionBars: backup does not cover the current slot contents");
        }
        for (const entry of current) {
            PickupAction(entry.slot);
            const [remaining] = GetActionInfo(entry.slot);
            if (issecretvalue(remaining) || remaining !== undefined) error("ActionBars: client refused to clear slot " + entry.slot);
            ClearCursor();
        }
    }
    /** Restore only into empty or identical slots; never replace newly assigned actions. */
    public static Restore(backup: readonly Readonly<ActionSlot>[]): void {
        this.AssertReady();
        for (const entry of backup) {
            this.Validate(entry);
            const [type, id] = GetActionInfo(entry.slot);
            if (issecretvalue(type) || issecretvalue(id)) error("ActionBars: restricted slot cannot be restored");
            if (type !== undefined && (type !== entry.type || id !== entry.id)) error("ActionBars: restore would overwrite slot " + entry.slot);
        }
        for (const entry of backup) {
            const [type] = GetActionInfo(entry.slot);
            if (type !== undefined) continue;
            this.Pickup(entry);
            const [cursor] = GetCursorInfo();
            if (issecretvalue(cursor) || cursor === undefined) error("ActionBars: client refused to pick up action " + entry.id);
            PlaceAction(entry.slot);
            const [placedType, placedId] = GetActionInfo(entry.slot);
            if (issecretvalue(placedType) || issecretvalue(placedId) || placedType !== entry.type || placedId !== entry.id) {
                error("ActionBars: client refused to restore slot " + entry.slot);
            }
            ClearCursor();
        }
    }

    /** Hide stock bars independently of slot changes. Clear/restore run only from slash commands.
     * Declare options.variable in SavedVariablesPerCharacter in the addon's TOC.
     */
    public static InstallEmptyMode(options: EmptyActionBarsOptions): () => void {
        const store = new StoreRegistry(options);
        const listener = CreateFrame("Frame", undefined, UIParent);
        let worldReady = false;
        let busy = false;
        let initialized = false;
        let backupPersisted = false;
        let disposed = false;
        let stopSuppressing: (() => void) | undefined;
        let stage = "initialization";
        const diagnostics = CreateFrame("Frame", undefined, UIParent) as unknown as {
            RegisterEvent(event: string): void;
            UnregisterAllEvents(): void;
            SetScript(script: "OnEvent", handler: ((this: void, frame: wuiraNativeFrame, event: string, addon?: string, api?: string) => void) | undefined): void;
        };
        diagnostics.RegisterEvent("ADDON_ACTION_BLOCKED");
        diagnostics.RegisterEvent("ADDON_ACTION_FORBIDDEN");
        diagnostics.SetScript("OnEvent", (_frame, event, addon, api) => {
            if (busy || addon === options.addon) console.error("Action bars:", stage, event, addon, api);
        });
        const attempt = () => {
            if (disposed || initialized || busy || !worldReady || !store.IsReady || InCombatLockdown()) return;
            busy = true;
            try {
                const settings = store.get(ActionBarBackup);
                backupPersisted = settings.phase !== "capture";
                if (settings.phase !== "restored" && settings.phase !== "restore") {
                    stage = "disable native bars";
                    // A refused slot operation must never prevent hiding the stock UI.
                    try { stopSuppressing = BlizzardUI.DisableActionBars(); }
                    catch (failure) { console.error("Native action bar suppression stopped:", failure); }
                }
                stage = "capture backup";
                if (settings.phase === "capture") {
                    const slots = this.Capture();
                    store.set(ActionBarBackup, draft => { draft.slots = slots; draft.phase = "ready"; return draft; });
                    console.log("Action bars backed up. Use /reload to save the backup, then " + options.clearCommand + " outside combat to clear slots.");
                } else if (settings.phase === "restore") {
                    console.log("Use " + options.restoreCommand + " outside combat to restore action slots.");
                } else if (settings.phase !== "restored") {
                    console.log("Native action bars disabled. Use " + options.clearCommand + " outside combat to clear their slots.");
                }
            } catch (failure) { console.error("Action bars:", stage, failure); }
            finally {
                // Never retry a blocked operation automatically on cursor/event changes.
                initialized = true;
                listener.UnregisterAllEvents();
                busy = false;
            }
        };
        listener.RegisterEvent("PLAYER_ENTERING_WORLD");
        listener.RegisterEvent("PLAYER_REGEN_ENABLED");
        listener.SetScript("OnEvent", (_frame, event) => {
            if (event === "PLAYER_ENTERING_WORLD") worldReady = true;
            attempt();
        });
        store.onReady(attempt);
        const clearCommand = "WUIRA_CLEAR_" + options.addon.toUpperCase();
        const restoreCommand = "WUIRA_RESTORE_" + options.addon.toUpperCase();
        if (SlashCmdList[clearCommand] !== undefined || SlashCmdList[restoreCommand] !== undefined) error("ActionBars: command already registered");
        const run = (restore: boolean) => {
            if (disposed || busy) return;
            if (InCombatLockdown()) { console.warn("Change action bars after combat ends."); return; }
            if (!initialized || !store.IsReady || !backupPersisted) { console.warn("Use /reload to persist the action bar backup first."); return; }
            busy = true;
            stage = restore ? "restore slots" : "clear slots";
            try {
                const settings = store.get(ActionBarBackup);
                if (restore) {
                    this.Restore(settings.slots);
                    store.set(ActionBarBackup, draft => { draft.phase = "restored"; return draft; });
                    console.log("Action slots restored. Use /reload to restore native bar handlers and visibility.");
                } else {
                    this.Clear(settings.slots);
                    store.set(ActionBarBackup, draft => { draft.phase = "disabled"; return draft; });
                    console.log("Native action slots cleared.");
                }
            } catch (failure) { console.error("Action bars:", stage, failure); }
            finally { busy = false; }
        };
        _G["SLASH_" + clearCommand + "1"] = options.clearCommand;
        _G["SLASH_" + restoreCommand + "1"] = options.restoreCommand;
        SlashCmdList[clearCommand] = () => run(false);
        SlashCmdList[restoreCommand] = () => run(true);
        return () => {
            disposed = true;
            stopSuppressing?.();
            store.Dispose();
            listener.UnregisterAllEvents();
            listener.SetScript("OnEvent", undefined);
            diagnostics.UnregisterAllEvents();
            diagnostics.SetScript("OnEvent", undefined);
            _G["SLASH_" + clearCommand + "1"] = undefined;
            _G["SLASH_" + restoreCommand + "1"] = undefined;
            delete SlashCmdList[clearCommand];
            delete SlashCmdList[restoreCommand];
        };
    }
}
