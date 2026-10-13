// Paths registered by LibSharedMedia in locally installed Forever addons.
// This is a known catalog, not an exhaustive inventory of client assets.
export const borderTextures = {
    solid: { label: "Solid", path: "", edgeSize: 1 },
    tooltip: { label: "Blizzard Tooltip", path: "Interface\\Tooltips\\UI-Tooltip-Border", edgeSize: 16 },
    dialog: { label: "Blizzard Dialog", path: "Interface\\DialogFrame\\UI-DialogBox-Border", edgeSize: 32 },
    dialogGold: { label: "Blizzard Dialog Gold", path: "Interface\\DialogFrame\\UI-DialogBox-Gold-Border", edgeSize: 32 },
    achievementWood: { label: "Blizzard Achievement Wood", path: "Interface\\AchievementFrame\\UI-Achievement-WoodBorder", edgeSize: 16 },
    chatBubble: { label: "Blizzard Chat Bubble", path: "Interface\\Tooltips\\ChatBubble-Backdrop", edgeSize: 16 },
    party: { label: "Blizzard Party", path: "Interface\\CHARACTERFRAME\\UI-Party-Border", edgeSize: 16 },
} as const;

export type BorderTexture = keyof typeof borderTextures | { path: string; edgeSize: number };
