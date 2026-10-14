import type { MountedTree } from "./types";

/** A separate driver keeps updates running even while the visual root is hidden. */
export function startUpdates(parent: wuiraNativeFrame, tree: MountedTree, updates: (() => void)[]): void {
    if (updates.length === 0) return;
    const driver = CreateFrame("Frame", undefined, parent);
    tree.frames.push(driver);
    let elapsed = 0;
    driver.SetScript("OnUpdate", (_frame, delta) => {
        elapsed += delta;
        if (elapsed < 0.05) return;
        elapsed = 0;
        for (const update of updates) update();
    });
    for (const update of updates) update();
    driver.Show();
}
