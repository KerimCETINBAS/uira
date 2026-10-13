-- Private module registry; never replace the client's global require.
local factories, cache, loading = {}, {}, {}
local function requireModule(name)
    if cache[name] ~= nil then return cache[name] end
    if loading[name] then error("wuira: circular import: " .. name) end
    local factory = factories[name]
    if not factory then error("wuira: missing module: " .. name) end
    loading[name] = true
    local ok, result = pcall(factory, requireModule)
    loading[name] = nil
    if not ok then error(result) end
    if result == nil then result = true end
    cache[name] = result
    return result
end
__wuiraModules = { factories = factories, require = requireModule }
