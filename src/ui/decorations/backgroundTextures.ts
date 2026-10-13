// Known background paths registered by local Forever LibSharedMedia.
export const backgroundTextures = {
    solid: { label: "Solid", path: "Interface\\Buttons\\WHITE8X8" },
    tooltip: { label: "Blizzard Tooltip", path: "Interface\\Tooltips\\UI-Tooltip-Background" },
    dialog: { label: "Blizzard Dialog", path: "Interface\\DialogFrame\\UI-DialogBox-Background" },
    dialogDark: { label: "Blizzard Dialog Dark", path: "Interface\\DialogFrame\\UI-DialogBox-Background-Dark" },
    dialogGold: { label: "Blizzard Dialog Gold", path: "Interface\\DialogFrame\\UI-DialogBox-Gold-Background" },
} as const;

export type BackgroundTexture = keyof typeof backgroundTextures | { path: string };
