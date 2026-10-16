-- Executed by pipeline.test.cjs against the compiled framework and a mock WoW runtime.
(function()
    local Nameplates = __wuiraModules.require("skins.Nameplates").Nameplates
    local oldGUID, oldAPI, oldHook, oldReporter = UnitGUID, C_NamePlate, hooksecurefunc, geterrorhandler
    local oldCreate = CreateFrame
    local failures, mounts, cleanups, subscriptions, hooks = {}, {}, 0, 0, 0
    geterrorhandler = function() return function(message) failures[#failures+1] = message end end
    function hooksecurefunc(frame, method, callback)
        hooks = hooks + 1
        local previous = frame[method]
        frame[method] = function(self, ...) previous(self, ...); callback(self, ...) end
    end
    local function native(parent)
        local frame = oldCreate("Frame", nil, parent)
        frame.alpha, frame.scale = 1, 1
        frame:SetSize(100, 20)
        function frame:GetAlpha() return self.alpha end
        function frame:GetScale() return self.scale end
        function frame:SetScale(value) self.scale = value end
        function frame:IsForbidden() return self.forbidden or false end
        function frame:IsProtected() return self.protected or false end
        function frame:GetStatusBarColor() return (table.unpack or unpack)(self.color or {1,1,1,1}) end
        function frame:SetStatusBarColor(...) self.color = {...} end
        return frame
    end
    local a, b = native(UIParent), native(UIParent)
    a.UnitFrame, b.UnitFrame = native(a), native(b)
    a.UnitFrame.healthBar = native(a.UnitFrame)
    a.UnitFrame:RegisterEvent("NATIVE_EVENT")
    local nativeScript = function() end
    a.UnitFrame:SetScript("OnEvent", nativeScript)
    local plates, guids = {}, {}
    C_NamePlate = {
        GetNamePlates = function() local result={} for _,p in pairs(plates) do result[#result+1]=p end return result end,
        GetNamePlateForUnit = function(unit) return plates[unit] end,
    }
    UnitGUID = function(unit) return guids[unit] end
    local function add(unit, plate, guid)
        plates[unit], guids[unit], plate.namePlateUnitToken = plate, guid, unit
        emit("NAME_PLATE_UNIT_ADDED", unit)
    end
    local function remove(unit)
        plates[unit], guids[unit] = nil, nil
        emit("NAME_PLATE_UNIT_REMOVED", unit)
    end
    local function render(ctx)
        subscriptions = subscriptions + 1
        ctx:OnDispose(function() subscriptions=subscriptions-1 end)
        return factory(nil,"cell",{width=80,height=12,onMount=function(_,frame)
            mounts[#mounts+1]=frame
            return function() cleanups=cleanups+1 end
        end})
    end
    add("nameplate1", a, "A") -- Existing plates are discovered at registration.
    local selected, lastContext = 0
    local first = Nameplates.Apply(nil, function(info) selected=selected+1; return info.GUID == "A" end, function(ctx)
        lastContext=ctx
        ctx:Alpha(ctx.Native, .4)
        ctx:Size(ctx.Native.healthBar, 150, 10)
        ctx:BarColor(ctx.Native.healthBar, .2, .3, .4, 1)
        ctx:Scale(ctx.Native, 1.2)
    end)
    first:Replace(function() return true end, render):Apply(function() return true end, function() error("unreachable") end)
    assert(a.UnitFrame.alpha == .4 and a.UnitFrame.healthBar.width == 150 and #mounts == 0, "Apply wins over later Replace: "..tostring(failures[1]))
    local other = Nameplates.Replace(nil, function() return true end, render)
    assert(a.UnitFrame.alpha == .4 and #mounts == 0, "global registration order")
    local reads = selected
    emit("UNIT_HEALTH", "nameplate1")
    assert(selected == reads, "health updates do not poll selectors")
    add("nameplate2", b, "B")
    assert(#mounts == 1 and mounts[1].parent == b and b.UnitFrame.alpha == 0)
    add("nameplate2", b, "B")
    assert(#mounts == 1, "duplicate add does not remount")
    first:Dispose()
    assert(a.UnitFrame.healthBar.width == 100 and a.UnitFrame.scale == 1 and a.UnitFrame.healthBar.color[1] == 1)
    assert(a.UnitFrame.alpha == 0 and #mounts == 3 and not mounts[1].shown, "next group takes ownership")
    assert(subscriptions == 2 and cleanups == 1)
    assert(not pcall(function() lastContext:Alpha(a.UnitFrame, .2) end), "old context is inert")
    a.UnitFrame:SetAlpha(.7)
    assert(a.UnitFrame.alpha == 0, "native alpha writes remain suppressed")
    combat=true
    remove("nameplate1")
    assert(a.UnitFrame.alpha == .7 and subscriptions == 1 and not mounts[2].shown, "ordinary visuals clean up during combat")
    combat=false
    assert(a.UnitFrame.events.NATIVE_EVENT and a.UnitFrame.onEvent == nativeScript, "native scripts/events survive")
    local prior = mounts[#mounts]
    -- Recycle a carrier without waiting for its old removed event.
    plates.nameplate2, guids.nameplate2 = nil, nil
    add("nameplate3", b, "C")
    assert(not prior.shown and subscriptions == 1 and #mounts == 4)
    local latest=mounts[#mounts]
    guids.nameplate3="D"
    emit("UNIT_NAME_UPDATE", "nameplate3")
    assert(not latest.shown and subscriptions == 1 and #mounts == 5, "same token, new GUID")
    other:Dispose(); other:Dispose()
    assert(b.UnitFrame.alpha == 1 and subscriptions == 0 and cleanups == 5)
    assert(hooks == 2, "one hook per pooled native visual")
    -- Disposal of a losing group leaves the winning group's bindings untouched.
    local winner=Nameplates.Replace(nil,function() return true end,render)
    local losing=Nameplates.Apply(nil,function() return true end,function() error("unreachable") end)
    local count=#mounts
    losing:Dispose(); assert(#mounts == count and subscriptions == 1)
    winner:Dispose()
    -- Apply failure rolls back every owned change and subscription, even if a cleanup throws.
    local errors=#failures
    local broken=Nameplates.Apply(nil,function() return true end,function(ctx)
        ctx:Alpha(ctx.Native,.25)
        subscriptions=subscriptions+1
        ctx:OnDispose(function() subscriptions=subscriptions-1 end)
        ctx:OnDispose(function() error("bad cleanup") end)
        error("bad customize")
    end)
    assert(b.UnitFrame.alpha == 1 and subscriptions == 0 and #failures == errors+2)
    broken:Dispose()
    errors=#failures
    local badMount=Nameplates.Replace(nil,function() return true end,function(ctx)
        subscriptions=subscriptions+1; ctx:OnDispose(function() subscriptions=subscriptions-1 end)
        return factory(nil,"cell",{onMount=function() error("bad mount") end})
    end)
    assert(b.UnitFrame.alpha == 1 and subscriptions == 0 and #failures == errors+1, "mount rollback preserves native visuals")
    badMount:Dispose()
    local secure=Nameplates.Replace(nil,function() return true end,function() return factory(nil,"secureButton",{}) end)
    assert(b.UnitFrame.alpha == 1, "secure JSX is rejected before mount")
    secure:Dispose()
    local calls=0
    b.forbidden=true
    local restricted=Nameplates.Apply(nil,function() calls=calls+1; return true end,function() error("unreachable") end)
    assert(calls == 0)
    b.forbidden=false; b.UnitFrame.protected=true; restricted:Refresh(); assert(calls == 0)
    b.UnitFrame.protected=false; guids.nameplate3={secret=true}; restricted:Refresh(); assert(calls == 0)
    guids.nameplate3="D"; restricted:Dispose()
    -- Selector secrets/errors do not fall through to a less specific rule.
    local secret=Nameplates.Apply(nil,function() return {secret=true} end,function() error("unreachable") end)
    secret:Replace(function() calls=calls+1; return true end,render)
    assert(calls == 0 and b.UnitFrame.alpha == 1)
    secret:Dispose()
    -- External preset changes require explicit refresh; factory runs freshly per binding.
    local enabled=false
    local dynamic=Nameplates.Replace(nil,function() return enabled end,render)
    assert(subscriptions == 0)
    enabled=true; dynamic:Refresh(); assert(subscriptions == 1)
    enabled=false; dynamic:Refresh(); assert(subscriptions == 0 and b.UnitFrame.alpha == 1)
    dynamic:Dispose()
    -- Real HP source bindings are detached before a pooled carrier moves to another unit.
    local oldHealth, oldMax = UnitHealth, UnitHealthMax
    local readsByUnit, bars = {}, {}
    UnitHealth=function(unit) readsByUnit[unit]=(readsByUnit[unit] or 0)+1; return 30 end
    UnitHealthMax=function() return 100 end
    local resources=Nameplates.Replace(nil,function() return true end,function(ctx)
        return factory(nil,"progress",{source=new(HP,ctx.Unit),onMount=function(_,bar) bars[#bars+1]=bar end})
    end)
    assert(bars[1].value == 30)
    plates.nameplate3,guids.nameplate3=nil,nil
    add("nameplate4",b,"E")
    assert(#bars == 2 and not bars[1].shown)
    local oldReads=readsByUnit.nameplate3
    emit("UNIT_HEALTH","nameplate3"); assert(readsByUnit.nameplate3 == oldReads, "old HP source no longer receives events")
    local freshReads=readsByUnit.nameplate4
    emit("UNIT_HEALTH","nameplate4"); assert(readsByUnit.nameplate4 > freshReads)
    resources:Dispose()
    freshReads=readsByUnit.nameplate4
    emit("UNIT_HEALTH","nameplate4"); assert(readsByUnit.nameplate4 == freshReads)
    UnitHealth,UnitHealthMax=oldHealth,oldMax
    -- Returning one cached JSX object is rejected on its second simultaneous mount.
    add("nameplate5",a,"F")
    local cached=factory(nil,"cell",{width=10,height=10})
    local shared=Nameplates.Replace(nil,function() return true end,function() return cached end)
    assert((a.UnitFrame.alpha == 0 and b.UnitFrame.alpha ~= 0) or (b.UnitFrame.alpha == 0 and a.UnitFrame.alpha ~= 0))
    shared:Dispose(); remove("nameplate5")
    -- A throwing JSX unmount cleanup cannot strand a tree or native suppression.
    local root
    local throwing=Nameplates.Replace(nil,function() return true end,function()
        return factory(nil,"cell",{onMount=function(_,frame) root=frame; return function() error("unmount failed") end end})
    end)
    throwing:Dispose(); assert(not root.shown and b.UnitFrame.alpha == 1)
    -- No stale listeners or suppression after the final group disappears.
    b.UnitFrame:SetAlpha(.6); assert(b.UnitFrame.alpha == .6)
    -- Clients exposing GetUnit rather than namePlateUnitToken can still be scanned.
    b.namePlateUnitToken=nil
    function b:GetUnit() return "nameplate4" end
    local scanned=Nameplates.Apply(nil,function() return true end,function(ctx) ctx:Alpha(ctx.Native,.3) end)
    assert(b.UnitFrame.alpha == .3)
    b.UnitFrame:SetAlpha(.8)
    scanned:Dispose(); assert(b.UnitFrame.alpha == .8, "cleanup preserves subsequent external writes")
    b.GetUnit=nil
    local priorErrors=#failures
    emit("PLAYER_TARGET_CHANGED"); assert(#failures == priorErrors)
    UnitGUID, C_NamePlate, hooksecurefunc, geterrorhandler = oldGUID, oldAPI, oldHook, oldReporter
end)()
