const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
function run(script, args, cwd) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(result.stderr, "", result.stderr);
  return result.stdout;
}

test("Cell positions use screen coordinates, parent offsets and explicit references", () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "wuira-cell-"));
  try {
    run(path.join(root, "node_modules/typescript-to-lua/dist/tstl.js"), ["-p", "tsconfig.json", "--outDir", path.join(fixture, "dist")], root);
    const files = fs.readdirSync(path.join(fixture, "dist"), { recursive: true }).filter(file => file.endsWith(".lua") && !file.startsWith("__"));
    const loads = ["__loader.lua", ...files].map(file => `dofile(${JSON.stringify("dist/" + file.replace(/\\/g, "/"))})`);
    const script = `
      require = nil
      UIParent = {}
      local health,maxHealth,mana,maxMana = 650,1000,120,200
      local healthPercent,manaPercent = 65,60
      CurveConstants = {ScaleTo100={}}
      function UnitHealthPercent(unit,predicted,curve)
        assert(unit == "player" and predicted and curve == CurveConstants.ScaleTo100)
        return healthPercent
      end
      function UnitPowerPercent(unit,powerType,predicted,curve)
        assert(unit == "player" and powerType == 0 and predicted and curve == CurveConstants.ScaleTo100)
        return manaPercent
      end
      function UnitHealth(unit) assert(unit == "player"); return health end
      function UnitHealthMax(unit) assert(unit == "player"); return maxHealth end
      function UnitPower(unit,powerType) assert(unit == "player" and powerType == 0); return mana end
      function UnitPowerMax(unit,powerType) assert(unit == "player" and powerType == 0); return maxMana end
      function issecretvalue(value) return type(value) == "table" and rawget(value,"secret") == true end
      local frames = {}
      function CreateFrame(kind, name, parent, template)
        assert((kind == "Frame" or kind == "StatusBar") and name == nil)
        local frame = { kind = kind, parent = parent, template = template, textures = {} }
        function frame:SetMinMaxValues(min,max) self.min,self.max=min,max end
        function frame:SetValue(value) self.value=value end
        function frame:SetStatusBarTexture(path) self.fillTexture=path end
        function frame:SetStatusBarColor(r,g,b,a) self.fillColor={r,g,b,a} end
        function frame:SetOrientation(orientation) self.orientation=orientation end
        function frame:SetReverseFill(reverse) self.reverse=reverse end
        function frame:GetStatusBarTexture()
          self.fill = self.fill or {}
          function self.fill:SetHorizTile(value) self.tileX=value end
          function self.fill:SetVertTile(value) self.tileY=value end
          function self.fill:SetBlendMode(value) self.blend=value end
          function self.fill:SetTexCoord(l,r,t,b) self.uv={l,r,t,b} end
          return self.fill
        end
        function frame:SetSize(w, h) self.width, self.height = w, h end
        function frame:EnableMouse(enabled) self.mouseEnabled = enabled end
        function frame:GetWidth() return self.width end
        function frame:GetHeight() return self.height end
        function frame:RegisterEvent(event) self.events = self.events or {}; self.events[event] = true end
        function frame:UnregisterAllEvents() self.events = {} end
        function frame:SetScript(_, handler) self.onEvent = handler end
        function frame:SetPoint(point, relative, relativePoint, x, y)
          assert((point == "TOPLEFT" and relativePoint == "TOPLEFT") or (point == "CENTER" and relativePoint == "CENTER"))
          self.anchor,self.relativeAnchor = point,relativePoint
          self.relative = relative
          self.x, self.y = x, y
        end
        function frame:CreateTexture(name, layer)
          assert(name == nil)
          local texture = { layer = layer, parent = self }
          function texture:SetAllPoints(target) assert(target == self.parent) end
          function texture:SetColorTexture(r, g, b, a) self.color = {r, g, b, a} end
          function texture:SetTexture(path) self.path = path end
          function texture:SetVertexColor(r,g,b,a) self.color = {r,g,b,a} end
          function texture:SetBlendMode(mode) self.blend = mode end
          function texture:SetHorizTile(value) self.tileX=value end
          function texture:SetVertTile(value) self.tileY=value end
          function texture:SetTexCoord(l,r,t,b) self.uv={l,r,t,b} end
          function texture:SetSize(w,h) self.width,self.height = w,h end
          function texture:SetPoint(_,relative,_,x,y) self.x,self.y=x,y end
          function texture:SetParent(parent) self.parent = parent end
          function texture:ClearAllPoints() end
          function texture:Show() self.shown = true end
          function texture:Hide() self.shown = false end
          self.textures[#self.textures+1] = texture
          self.texture = texture
          return texture
        end
        function frame:Show() self.shown = true end
        function frame:Hide() self.shown = false end
        function frame:SetParent(parent) self.parent = parent end
        function frame:ClearAllPoints() end
        function frame:SetAllPoints(parent) assert(parent == self.parent) end
        function frame:SetBackdrop(info) self.backdrop = info end
        function frame:SetBackdropBorderColor(r,g,b,a) self.borderColor = {r,g,b,a} end
        frames[#frames + 1] = frame
        return frame
      end
      ${loads.join("\n")}
      -- Test fixture is independent of the user's editable index.tsx example.
      local function construct(class,props)
        local instance = setmetatable({},class.prototype)
        instance:____constructor(props)
        return instance
      end
      local factory = __wuiraModules.require("ui.primitives.jsx").UI.createElement
      local resources = __wuiraModules.require("datasources.Resources")
      local bgClass = __wuiraModules.require("ui.decorations.Background").Background
      local borderClass = __wuiraModules.require("ui.decorations.Border").Border
      local demo = factory(nil,"cell",{width=160,height=80,padding=10,decorations={
        background=construct(bgClass,{texture="tooltip",color={r=1,g=1,b=1}}),
        border=construct(borderClass,{texture="tooltip",thickness=16,color={r=1,g=1,b=1}})
      }},factory(nil,"flow",{direction="vertical",gap=4},{
        factory(nil,"progress",{source=construct(resources.HP,"player"),height=24,margin=2,color={r=0.1,g=0.75,b=0.4}}),
        factory(nil,"progress",{source=construct(resources.Mana,"player"),height=24,margin=2,color={r=0.15,g=0.4,b=1}})
      }))
      __wuiraModules.require("wuira").wuira.Mount(nil,demo,"CENTER")
      assert(#frames == 5)
      local box = frames[1]
      assert(box.parent == UIParent and box.width == 160 and box.height == 80)
      assert(box.x == 0 and box.y == 0 and box.shown and box.anchor == "CENTER" and box.relativeAnchor == "CENTER")
      assert(box.relative == UIParent)
      local layoutFrame = frames[2]
      assert(layoutFrame.width == 140 and layoutFrame.height == 60 and layoutFrame.parent == box)
      assert(layoutFrame.x == 10 and layoutFrame.y == -10)
      local demoBar = frames[3]
      assert(box.kind == "Frame" and demoBar.kind == "StatusBar")
      assert(demoBar.min == 0 and demoBar.max == 1000 and demoBar.value == 650)
      assert(demoBar.orientation == "HORIZONTAL" and demoBar.reverse == false and demoBar.fillColor[2] == 0.75)
      assert(demoBar.parent == layoutFrame and demoBar.relative == layoutFrame)
      assert(demoBar.width == 136 and demoBar.height == 24 and demoBar.x == 2 and demoBar.y == -2)
      local manaBar = frames[4]
      assert(manaBar.kind == "StatusBar" and manaBar.max == 200 and manaBar.value == 120)
      assert(manaBar.width == 136 and manaBar.height == 24 and manaBar.x == 2 and manaBar.y == -34)
      assert(box.mouseEnabled == false and demoBar.mouseEnabled == false and manaBar.mouseEnabled == false)
      assert(box.texture.path == "Interface\\\\Tooltips\\\\UI-Tooltip-Background", tostring(box.texture.path))
      assert(frames[5].parent == box and frames[5].template == "BackdropTemplate")
      assert(frames[5].backdrop.edgeFile == "Interface\\\\Tooltips\\\\UI-Tooltip-Border")
      assert(frames[5].backdrop.edgeSize == 16 and frames[5].shown)
      assert(frames[5].mouseEnabled == false)
      health,maxHealth = 300,1200
      demoBar.onEvent(demoBar,"UNIT_HEALTH","target")
      assert(demoBar.value == 650)
      demoBar.onEvent(demoBar,"UNIT_HEALTH","player")
      assert(demoBar.value == 300 and demoBar.max == 1200)
      mana,maxMana = 70,250
      manaBar.onEvent(manaBar,"UNIT_MAXPOWER","player")
      assert(manaBar.value == 70 and manaBar.max == 250 and demoBar.value == 300)
      health = {secret=true}
      demoBar.onEvent(demoBar,"UNIT_HEALTH","player")
      assert(demoBar.value == health) -- Opaque data goes straight to native display, never through compute.
      frames = {box} -- Keep subsequent geometry assertions independent of the demo decoration.
      local mount = __wuiraModules.require("ui.mount").mount
      local nested = mount(nil, { kind = "cell", props = {width=40,height=20,mode="absolute",x=5,y=7}, child =
        {kind="cell",props={width=10,height=10,mode="relative",offset={x=3,y=4}}}
      }, box)
      assert(nested.parent == box and nested.relative == UIParent and nested.x == 5 and nested.y == -7)
      assert(frames[3].parent == nested and frames[3].relative == nested)
      assert(frames[3].x == 3 and frames[3].y == -4 and frames[3].texture == nil)
      local target = {kind="cell",props={width=10,height=10,mode="relative",offset={x=0,y=0}}}
      local middle = {kind="cell",props={width=10,height=10,mode="relative",offset={x=0,y=0}},child=target}
      target.props.relativeTo = middle
      local tree = {kind="cell",props={width=50,height=50,mode="absolute",x=0,y=0},child=middle}
      mount(nil, tree)
      assert(frames[6].relative == frames[5])
      local bad = {kind="cell",props={width=10,height=10,mode="relative",offset={x=0,y=0},relativeTo={props={}}}}
      assert(not pcall(mount, nil, bad))
      local a = {kind="cell",props={width=10,height=10,mode="relative",offset={x=0,y=0}}}
      local b = {kind="cell",props={width=10,height=10,mode="relative",offset={x=0,y=0},relativeTo=a}}
      a.child = b
      a.props.relativeTo = b
      assert(not pcall(mount, nil, a))
      local ok = pcall(mount, nil, {kind="unknown"})
      assert(not ok)
      local function new(class, props, children)
        local instance = setmetatable({}, class.prototype)
        instance:____constructor(props, children)
        return instance
      end
      local HP = __wuiraModules.require("datasources.Resources").HP
      local hpSource = new(HP,"player")
      assert(hpSource:IsSecret())
      assert(not pcall(function() return hpSource.Value end))
      health = 500
      assert(not hpSource:IsSecret() and hpSource.Value == 500 and hpSource.Max.Value == 1200)
      assert(hpSource.Min.Value == 0 and hpSource.Percent.Value == 65)
      local overridden = CreateFrame("StatusBar",nil,UIParent)
      hpSource:BindTo(overridden,{min=10,max=100,current=25})
      overridden.onEvent(overridden,"UNIT_HEALTH","player")
      assert(overridden.min == 10 and overridden.max == 100 and overridden.value == 25)
      assert(demoBar.events.UNIT_HEALTH and manaBar.events.UNIT_POWER_UPDATE)
      __wuiraModules.require("ui.mount").unmount(nil,box)
      assert(next(demoBar.events) == nil and demoBar.onEvent == nil and not demoBar.shown)
      assert(next(manaBar.events) == nil and manaBar.onEvent == nil and not box.shown)
      local Background = __wuiraModules.require("ui.decorations.Background").Background
      local Border = __wuiraModules.require("ui.decorations.Border").Border
      local Glow = __wuiraModules.require("ui.decorations.Glow").Glow
      local API = __wuiraModules.require("wuira").wuira
      local factory = __wuiraModules.require("ui.primitives.jsx").UI.createElement
      local measure = __wuiraModules.require("ui.layout.measureLayout").measureLayout
      local function node(kind,props,children) return factory(nil,kind,props,children or {}) end
      local function child(w,h) return node("cell",{width=w,height=h}) end
      local bg = new(Background,{color={r=0.1,g=0.2,b=0.3,a=0}})
      local border = new(Border,{color={r=1,g=1,b=1},thickness=2})
      local glow = new(Glow,{texture="glow.tga",color={r=1,g=0,b=0},spread=4})
      local view = node("cell",{width=100,height=50,decorations={background=bg,border=border,glow=glow}})
      local decorated = API.Mount(nil,view)
      assert(#decorated.textures == 6 and decorated.textures[1].color[4] == 0)
      assert(decorated.textures[2].width == 100 and decorated.textures[2].height == 2)
      assert(decorated.textures[6].blend == "ADD" and decorated.textures[6].width == 108)
      assert(not pcall(API.Mount,nil,view))
      local shared = node("cell",{width=20,height=20,decorations={background=bg}})
      assert(not pcall(API.Mount,nil,shared))
      assert(decorated.textures[1].shown)
      API.Unmount(nil,decorated)
      for _,texture in ipairs(decorated.textures) do assert(not texture.shown) end
      local remounted = API.Mount(nil,view)
      assert(#remounted.textures == 0 and decorated.textures[1].parent == remounted)
      API.Unmount(nil,remounted)
      local custom = node("cell",{width=10,height=10,decorations={background=new(Background,{texture={path="custom.tga"},color={r=1,g=1,b=1}})}})
      local customFrame = API.Mount(nil,custom)
      assert(customFrame.texture.path == "custom.tga")
      API.Unmount(nil,customFrame)
      local native = node("cell",{width=100,height=50,decorations={border=new(Border,{texture="dialog",color={r=1,g=1,b=1}})}})
      local nativeFrame = API.Mount(nil,native)
      local backdrop = frames[#frames]
      assert(backdrop.template == "BackdropTemplate" and backdrop.backdrop.edgeSize == 32)
      API.Unmount(nil,nativeFrame)
      assert(not backdrop.shown)
      local rounded = node("cell",{width=40,height=30,decorations={border=new(Border,{thickness=2,radius=8,color={r=1,g=1,b=1}})}})
      local roundedFrame = API.Mount(nil,rounded)
      assert(#roundedFrame.textures > 4 and #roundedFrame.textures <= 130)
      for _,texture in ipairs(roundedFrame.textures) do
        assert(texture.width > 0 and texture.x >= 0 and texture.x + texture.width <= 40.0001)
      end
      API.Unmount(nil,roundedFrame)
      local function flowTest(direction,grow,widths,heights,expected)
        local children = {}
        for i=1,#widths do children[i] = child(widths[i],heights[i]) end
        local first = #frames+1
        local frame = API.Mount(nil,node("flow",{width=50,height=50,direction=direction,grow=grow,gap=5},children))
        for i=1,#children do
          local actual = frames[first+i]
          assert(actual.parent == frame and actual.x == expected[i][1] and actual.y == -expected[i][2])
          assert(actual.width == widths[i] and actual.height == heights[i])
        end
        API.Unmount(nil,frame)
        for i=0,#children do assert(not frames[first+i].shown) end
      end
      flowTest("horizontal",true,{20,25,10},{10,15,8},{{0,0},{25,0},{0,20}})
      flowTest("horizontal",false,{40,30},{10,10},{{0,0},{45,0}})
      flowTest("vertical",true,{10,15,8},{20,25,10},{{0,0},{0,25},{20,0}})
      flowTest("horizontal",true,{80,10},{10,10},{{0,0},{0,15}})
      local grid = node("grid",{sizing="content",columns=2,gap=3},{child(10,5),child(20,8),child(12,6)})
      local gridFrame = API.Mount(nil,grid)
      assert(gridFrame.width == 43 and gridFrame.height == 17)
      API.Unmount(nil,gridFrame)
      local nested = node("flow",{sizing="content",direction="horizontal",gap=4},{child(10,5),child(20,8)})
      local outer = node("grid",{sizing="content",columns=1,gap=2},{nested,child(15,6)})
      local outerFrame = API.Mount(nil,outer)
      assert(outerFrame.width == 34 and outerFrame.height == 16)
      API.Unmount(nil,outerFrame)
      assert(not pcall(API.Mount,nil,node("grid",{sizing="content",columns=0})))
      local function inherited(margin) return node("cell",{margin=margin}) end
      local gridSize = measure(nil,node("grid",{width=100,height=60,padding=5,columns=2,gap=4},
        {inherited(1),inherited(1),inherited(1),inherited(1)}))
      assert(gridSize.children[1].width == 41 and gridSize.children[1].height == 21)
      assert(gridSize.placements[2].x == 52 and gridSize.placements[3].y == 32)
      local paddedSize = measure(nil,node("flow",{sizing="content",padding={left=2,right=3,top=4,bottom=5},direction="horizontal",gap=2},
        {node("cell",{width=10,height=5,margin=1}),child(20,8)}))
      assert(paddedSize.width == 39 and paddedSize.height == 17)
      assert(not pcall(measure,nil,node("flow",{sizing="content"},{inherited(0)})))
      local clickable = API.Mount(nil,node("cell",{width=40,height=40,clickThrough=false},child(20,20)))
      assert(clickable.mouseEnabled and frames[#frames].mouseEnabled == false)
      API.Unmount(nil,clickable)
      local static = API.Mount(nil,node("progress",{width=100,height=20,min=10,max=90,current=42,orientation="vertical",reverse=true}))
      assert(static.value == 42 and static.max == 90 and static.orientation == "VERTICAL" and static.reverse)
      API.Unmount(nil,static)
      local styled = node("progress",{width=100,height=20,current=50,
        texture="legacy.tga",color={r=1,g=0,b=0},
        foreground={texture="blizzard",color={r=0,g=1,b=0,a=0.5},tileX=true,tileY=false,
          blendMode="ADD",texCoords={0.1,0.9,0.2,0.8}},
        background={texture="tooltip",color={r=0.1,g=0.2,b=0.3,a=0.4},tileY=true},
        backdrop={texture="dialog",thickness=12,color={r=1,g=1,b=1}}
      })
      local styledFrame = API.Mount(nil,styled)
      assert(styledFrame.fillTexture == "Interface\\\\TargetingFrame\\\\UI-StatusBar")
      assert(styledFrame.fillColor[2] == 1 and styledFrame.fillColor[4] == 0.5)
      assert(styledFrame.fill.tileX and not styledFrame.fill.tileY and styledFrame.fill.blend == "ADD")
      assert(styledFrame.fill.uv[1] == 0.1 and styledFrame.fill.uv[4] == 0.8)
      assert(styledFrame.texture.path == "Interface\\\\Tooltips\\\\UI-Tooltip-Background")
      assert(styledFrame.texture.tileY and styledFrame.texture.color[4] == 0.4)
      local styledBackdrop = frames[#frames]
      assert(styledBackdrop.backdrop.edgeSize == 12)
      API.Unmount(nil,styledFrame)
      assert(not styledFrame.texture.shown and not styledBackdrop.shown)
      local suppressed = node("progress",{width=10,height=10,background=false,backdrop=false,
        decorations={background=new(Background,{color={r=1,g=1,b=1}}),border=new(Border,{color={r=1,g=1,b=1}})}})
      local first = #frames
      local suppressedFrame = API.Mount(nil,suppressed)
      assert(#frames == first+1 and #suppressedFrame.textures == 0)
      API.Unmount(nil,suppressedFrame)
      print("wuira_CELL_OK")
      local auraAPI = __wuiraModules.require("datasources.Auras")
      local helpful = {
        {spellId=1,name="Wisdom",icon=10,sourceUnit="party1"},
        {spellId=2,name="Might",icon=20,sourceUnit="player"},
        {spellId=3,name="Unknown",icon=30},
        {spellId=4,name="Restricted caster",icon=40,sourceUnit={secret=true}},
      }
      local harmful = {{spellId=5,name="Poison",icon=50,sourceUnit="target"}}
      function UnitIsUnit(first,second) return first == second or first == "raid2" end
      C_UnitAuras = {GetAuraDataByIndex=function(unit,index,filter)
        assert(unit == "target")
        if filter == "HELPFUL" then return helpful[index] end
        assert(filter == "HARMFUL")
        return harmful[index]
      end}
      local buffs = new(auraAPI.Buffs,"target")
      local debuffs = new(auraAPI.Debuffs,"target")
      local list = buffs.Value
      assert(#list == 4 and list[1].sourceUnit == "party1" and list[1]:isSourceSelf() == false)
      assert(list[2]:isSourceSelf() == true)
      assert(list[3].sourceStatus == "unknown" and list[3]:isSourceSelf() == nil)
      assert(list[4].sourceStatus == "restricted" and list[4].sourceUnit == nil and list[4]:isSourceSelf() == nil)
      assert(debuffs.Value[1].spellId == 5)
      helpful[2].sourceUnit = "raid2"
      assert(buffs.Value[2]:isSourceSelf() == true)
      helpful[1].spellId = {secret=true}
      assert(buffs:IsSecret() and not pcall(function() return buffs.Value end))
      helpful = {}
      assert(not buffs:IsSecret() and #buffs.Value == 0)
      C_UnitAuras = nil
      assert(not pcall(function() return buffs.Value end))
      local rosterAPI = __wuiraModules.require("datasources.GroupMembers")
      local raid, count = false, 0
      function IsInRaid() return raid end
      function GetNumGroupMembers() return count end
      local group = new(rosterAPI.GroupMembers)
      local party = new(rosterAPI.PartyMembers)
      local raidMembers = new(rosterAPI.RaidMembers)
      assert(#group.Value == 1 and group.Value[1] == "player")
      assert(#party.Value == 0 and #raidMembers.Value == 0)
      count = 3
      assert(table.concat(party.Value, ",") == "player,party1,party2")
      assert(table.concat(group.Value, ",") == "player,party1,party2")
      raid, count = true, 10
      assert(#party.Value == 0 and #raidMembers.Value == 10)
      assert(group.Value[1] == "raid1" and group.Value[10] == "raid10")
      count = {secret=true}
      assert(group:IsSecret() and not pcall(function() return group.Value end))
      count, raid = 0, false
      assert(not group:IsSecret() and #group.Value == 1)
      GetNumGroupMembers = nil
      assert(not pcall(function() return group.Value end))
      local unitAPI = __wuiraModules.require("datasources.UnitInfo")
      local targetGUID, combat, allowed = "A", false, true
      local isPlayer = true
      function UnitIsPlayer(unit) return isPlayer end
      function UnitClass(unit) return "Paladin", "PALADIN", 2 end
      function UnitGUID(unit) return unit == "player" and "SELF" or targetGUID end
      function UnitIsUnit(first,second) return first == second end
      function InCombatLockdown() return combat end
      function CanInspect(unit) return allowed end
      local requests = 0
      function NotifyInspect(unit) requests=requests+1 end
      C_SpecializationInfo = {
        GetNumSpecializationsForClassID=function(id) assert(id == 2); return 3 end,
        GetSpecializationInfo=function(index,inspect,pet,unit,sex,group,classID)
          assert(classID == 2 and not pet)
          if inspect then assert(unit == "target") end
          return index, "Tree"..index, "", 100+index, "DAMAGER", 1, index*5
        end,
      }
      local unitSourceAPI = __wuiraModules.require("datasources.UnitSource")
      local target = new(unitSourceAPI.UnitSource,"target")
      assert(target.Is.PC == true and target.Is.Self == false and target.Value.guid == "A")
      local class = new(unitAPI.ClassSource,target)
      assert(class.Value.token == "PALADIN" and class.Value.id == 2)
      local own = new(unitAPI.Specializations,"player")
      assert(#own.Value == 3 and own.Value[3].pointsSpent == 15)
      local specs = new(unitAPI.SpecSource,target)
      assert(class.target == target and specs.target == target)
      assert(new(auraAPI.Buffs,target).target == target)
      assert(new(resources.HP,target).target == target)
      assert(specs.Value == nil and requests == 0)
      assert(specs:RequestInspect() and specs.Status == "pending" and requests == 1)
      local listener = frames[#frames]
      listener.onEvent(listener,"INSPECT_READY","OTHER")
      assert(specs.Value == nil)
      listener.onEvent(listener,"INSPECT_READY","A")
      assert(specs.Status == "ready" and #specs.Value == 3 and listener.onEvent == nil)
      targetGUID = "B"
      assert(target.Value.guid == "B")
      assert(specs.Value == nil and specs.Status == "idle")
      combat = true
      assert(not specs:RequestInspect() and requests == 1)
      combat = false
      assert(specs:RequestInspect())
      listener = frames[#frames]
      targetGUID = "C"
      listener.onEvent(listener,"INSPECT_READY","B")
      assert(specs.Value == nil and listener.onEvent == nil)
      isPlayer = false
      local previousRequests = requests
      assert(class.Value == nil and specs.Value == nil and not specs:RequestInspect())
      assert(requests == previousRequests)
      isPlayer = {secret=true}
      assert(target.Is.PC == nil)
      assert(class:IsSecret() and specs:IsSecret() and not specs:RequestInspect())
    `;
    const file = path.join(fixture, "verify.lua");
    fs.writeFileSync(file, script);
    assert.equal(run(require.resolve("fengari-node-cli/src/lua-cli.js"), [file], fixture).trim(), "wuira_CELL_OK");
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("split TSX modules load through TOC without a global require", () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "wuira-pipeline-"));
  try {
    fs.cpSync(path.join(root, "src"), path.join(fixture, "src"), { recursive: true });
    fs.unlinkSync(path.join(fixture, "src/index.ts"));

    fs.copyFileSync(path.join(root, "src/ui/Cell.tsx"), path.join(fixture, "src/ui/Cell.tsx"));
    fs.mkdirSync(path.join(fixture, "src/types"), { recursive: true });
    fs.copyFileSync(path.join(root, "src/types/Color.ts"), path.join(fixture, "src/types/Color.ts"));
    fs.copyFileSync(path.join(root, "src/ui/primitives/jsx.ts"), path.join(fixture, "src/ui/primitives/jsx.ts"));
    fs.writeFileSync(path.join(fixture, "addon.toc.in"), "## Interface: 16001\n## Title: Test\n");
    const config = JSON.parse(fs.readFileSync(path.join(root, "tsconfig.json")));
    config.tstl.luaPlugins[0].name = path.join(root, "tools/wow-modules.mjs");
    fs.writeFileSync(path.join(fixture, "tsconfig.json"), JSON.stringify(config));
    fs.writeFileSync(path.join(fixture, "src/handler.ts"), `
      let calls = 0;
      export function click() { calls += 1; return calls; }
    `);
    fs.writeFileSync(path.join(fixture, "src/index.tsx"), `
      import { UI, Element } from "./ui/primitives/jsx";
      import { click } from "./handler";
      import { Cell } from "./ui/Cell";
      import { FlowLayout } from "./ui/FlowLayout";
      import { GridLayout } from "./ui/GridLayout";
      import { DataSource } from "./datasources/DataSource";
      import { HP, Unit } from "./datasources/Resources";
      declare function error(this: void, message: string): never;
      declare function print(this: void, message: string): void;
      function Box(props: { onClick?: () => number; child?: Element }, child?: Element): Element {
        return { kind: "box", props, child };
      }
      const view = <Box onClick={click}><Box /></Box>;
      class Source<T> extends DataSource<T> {
        constructor(value: T) { super(value); }
        update(value: T, secret = false) { this.SetValue(value, secret); }
      }
      const source = new Source(40);
      if (source.IsSecret() || source.Compute(value => value / 80) !== 0.5) error("Normal source failed");
      source.update(50, true);
      if (!source.IsSecret()) error("Explicit restriction lost");
      let called = false;
      let rejected = false;
      try { source.Compute(value => { called = true; return value; }); } catch { rejected = true; }
      if (called || !rejected) error("Secret compute was executed");
      source.update(60);
      if (source.IsSecret() || source.Value !== 60) error("Restriction did not clear");
      const secretValue = { secret: true };
      const detected = new Source(secretValue);
      if (!detected.IsSecret()) error("Native secret marker ignored");
      rejected = false;
      try { const value = detected.Value; } catch { rejected = true; }
      if (!rejected) error("Secret value was exposed");
      class Aggregate extends Source<{ value: object }> {
        protected override HasSecretFields(value: { value: object }) { return issecretvalue(value.value); }
      }
      if (!new Aggregate({value: secretValue}).IsSecret()) error("Secret field ignored");
      const cell = Cell({width: 10, height: 10, mode: "absolute", x: 0, y: 0});
      const flow = FlowLayout({sizing: "content", direction: "horizontal", mode: "absolute", x: 0, y: 0});
      const grid = GridLayout({sizing: "content", columns: 2, mode: "absolute", x: 0, y: 0});
      const flowView = <FlowLayout direction="horizontal"><Cell width={10} height={10} /><Cell width={10} height={10} /></FlowLayout>;
      const gridView = <GridLayout columns={2}>{[<Cell width={10} height={10} />, <Cell width={10} height={10} />]}</GridLayout>;
      const hp = new HP(Unit.Player);
      const sourceView = <progress source={hp} />;
      const staticView = <progress min={0} max={100} current={25} />;
      if (flowView.children?.length !== 2 || gridView.children?.length !== 2) error("Layout children lost");
      if (false) {
        // @ts-expect-error Only one child is supported.
        const invalid = <Box><Box /><Box /></Box>;
        // @ts-expect-error Absolute coordinates cannot also have an offset.
        const position: import("./ui/Cell").CellProps = {width: 10, height: 10, mode: "absolute", x: 0, y: 0, offset: {x: 0, y: 0}};
      }
      if (view.child?.kind !== "box") error("TSX child lost");
      const action = (view.props as { onClick: () => number }).onClick;
      if (action() !== 1 || click() !== 2) error("Import identity lost");
      print("wuira_PIPELINE_OK");
    `);
    run(path.join(root, "node_modules/typescript-to-lua/dist/tstl.js"), ["-p", "tsconfig.json"], fixture);
    const toc = fs.readFileSync(path.join(fixture, "wuira.toc"), "utf8");
    assert.match(toc, /dist\\ui\\primitives\\jsx\.lua/);
    const files = toc.split(/\r?\n/).filter(line => line && !line.startsWith("#"));
    assert.equal(files[0], "dist\\__loader.lua");
    assert.equal(files.at(-1), "dist\\__start.lua");
    const loads = files.map(file => `dofile(${JSON.stringify(file.replace(/\\/g, "/"))})`);
    fs.writeFileSync(path.join(fixture, "verify.lua"), [
      "require = nil",
      'function issecretvalue(value) return type(value) == "table" and rawget(value, "secret") == true end',
      ...loads,
      '__wuiraModules.require("index")',
      'assert(__wuiraModules.require("handler").click() == 3)',
      '__wuiraModules.factories.cycle = function(require) return require("cycle") end',
      'local ok, message = pcall(__wuiraModules.require, "cycle")',
      'assert(not ok and string.find(message, "circular import"))',
    ].join("\n"));
    const output = run(require.resolve("fengari-node-cli/src/lua-cli.js"), ["verify.lua"], fixture);
    assert.equal(output.trim(), "wuira_PIPELINE_OK");

    // A watch rebuild may emit only the changed module. Its TOC must still
    // include unchanged modules, and must stop loading deleted source files.
    const ts = require("typescript");
    const plugin = require("../tools/wow-modules.mjs").default;
    function partialEmit() {
      const configPath = path.join(fixture, "tsconfig.json");
      const parsed = ts.getParsedCommandLineOfConfigFile(configPath, {}, {
        ...ts.sys, onUnRecoverableConfigFileDiagnostic: diagnostic => assert.fail(diagnostic.messageText),
      });
      const program = ts.createProgram(parsed.fileNames, parsed.options);
      const files = [{ outputPath: path.join(fixture, "dist/index.lua"), code: "return {}" }];
      plugin.beforeEmit(program, parsed.options, ts.sys, files);
      return files.find(file => file.outputPath.endsWith("wuira.toc")).code;
    }
    assert.match(partialEmit(), /dist\\handler\.lua/);
    assert.match(partialEmit(), /dist\\ui\\primitives\\jsx\.lua/);
    fs.writeFileSync(path.join(fixture, "src/unused.ts"), "export const unused = 1;");
    assert.match(partialEmit(), /dist\\unused\.lua/);
    fs.unlinkSync(path.join(fixture, "src/unused.ts"));
    assert.doesNotMatch(partialEmit(), /unused\.lua/);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

