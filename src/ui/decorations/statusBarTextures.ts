// Blizzard's status bar texture is registered in local Forever LibSharedMedia.
export const statusBarTextures = {
    solid: { label: "Solid", path: "Interface\\Buttons\\WHITE8X8" },
    blizzard: { label: "Blizzard Status Bar", path: "Interface\\TargetingFrame\\UI-StatusBar" },
} as const;

/** Accepts catalog names or a native/custom texture path. */
export function resolveStatusBarTexture(texture: string): string {
    const preset = statusBarTextures[texture as keyof typeof statusBarTextures];
    return preset === undefined ? texture : preset.path;
}
