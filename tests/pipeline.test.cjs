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
      local powerReads,nativeManaAlpha=0,1
      CurveConstants = {ScaleTo100={}}
      function UnitHealthPercent(unit,predicted,curve)
        assert(unit == "player" and predicted and curve == CurveConstants.ScaleTo100)
        return healthPercent
      end
      function UnitPowerPercent(unit,powerType,predicted,curve)
        assert(unit == "player" and powerType == 0 and predicted)
        if curve == CurveConstants.ScaleTo100 then return manaPercent end
        assert(curve.points)
        return nativeManaAlpha
      end
      function UnitHealth(unit) assert(unit == "player"); return health end
      function UnitHealthMax(unit) assert(unit == "player"); return maxHealth end
      function UnitPower(unit,powerType) assert(unit == "player" and powerType == 0); powerReads=powerReads+1; return mana end
      function UnitPowerMax(unit,powerType) assert(unit == "player" and powerType == 0); return maxMana end
      function issecretvalue(value) return type(value) == "table" and rawget(value,"secret") == true end
      local frames = {}
      local nativeFrames = {}
      local function emit(event,...)
        for _,frame in ipairs(nativeFrames) do
          if frame.events and frame.events[event] and frame.onEvent then frame.onEvent(frame,event,...) end
        end
      end
      function CreateFrame(kind, name, parent, template)
        assert((kind == "Frame" or kind == "StatusBar" or kind == "Button" or kind == "Cooldown") and (name == nil or kind == "Button"))
        local frame = { kind = kind, name=name, parent = parent, template = template, textures = {},events={} }
        if name then _G[name]=frame end
        function frame:GetName() return self.name end
        function frame:SetCooldownFromDurationObject(duration,clear) self.cooldownDuration=duration; self.clearIfZero=clear end
        function frame:SetDrawSwipe(value) self.drawSwipe=value end
        function frame:SetDrawEdge(value) self.drawEdge=value end
        function frame:SetDrawBling(value) self.drawBling=value end
        function frame:SetHideCountdownNumbers(value) self.hideNumbers=value end
        function frame:SetSwipeColor(...) self.swipeColor={...} end
        function frame:Clear() self.cooldownDuration=nil end
        function frame:GetCountdownFontString() return self.fontString or self:CreateFontString() end
        function frame:SetAlpha(value) self.alpha=value end
        function frame:SetMinMaxValues(min,max) self.min,self.max=min,max end
        function frame:SetValue(value) self.value=value end
        function frame:SetTimerDuration(duration,interpolation,direction)
          self.timer=duration; self.timerCalls=(self.timerCalls or 0)+1
          assert(interpolation == 0 and direction == 1)
        end
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
        function frame:CreateFontString()
          local text = {}
          self.fontString=text
          function text:SetAllPoints(parent) self.parent=parent end
          function text:SetFont(font,size,flags) self.font,self.size=font,size; return true end
          function text:SetJustifyH(align) self.align=align end
          function text:SetJustifyV() end
          function text:SetTextColor(...) self.color={...} end
          function text:SetText(value) self.text=value end
          return text
        end
        function frame:EnableMouse(enabled) self.mouseEnabled = enabled end
        function frame:GetWidth() return self.width end
        function frame:GetHeight() return self.height end
        function frame:RegisterEvent(event) self.events = self.events or {}; self.events[event] = true end
        function frame:UnregisterAllEvents() self.events = {} end
        function frame:SetScript(script, handler)
          self.scripts=self.scripts or {}; self.scripts[script]=handler
          if script == "OnUpdate" then self.onUpdate = handler elseif script == "OnEvent" then self.onEvent = handler end
        end
        function frame:IsShown() return self.shown == true end
        function frame:SetFrameStrata(value) self.strata=value end
        function frame:SetMovable(value) self.movable=value end
        function frame:SetClampedToScreen(value) self.clamped=value end
        function frame:RegisterForDrag(...) self.dragButtons={...} end
        function frame:StartMoving() self.moving=true end
        function frame:StopMovingOrSizing() self.moving=false end
        function frame:EnableKeyboard(value) self.keyboard=value end
        function frame:SetPropagateKeyboardInput(value) self.propagate=value end
        function frame:GetCenter()
          local x,y=0,0
          if self.relative and self.relative.GetCenter then x,y=self.relative:GetCenter() end
          return x+(self.x or 0),y+(self.y or 0)
        end
        function frame:SetClipsChildren(value) self.clipsChildren=value end
        function frame:GetFrameLevel() return self.frameLevel or 0 end
        function frame:SetFrameLevel(value) self.frameLevel=value end
        function frame:SetPoint(point, relative, relativePoint, x, y)
          assert(type(point) == "string" and type(relativePoint) == "string")
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
        function frame:GetParent() return self.parent end
        function frame:HookScript(script, handler) assert(script == "OnShow"); self.onShowHook=handler end
        function frame:ClearAllPoints() end
        function frame:SetAllPoints(parent) assert(parent == self.parent) end
        function frame:SetBackdrop(info) self.backdrop = info end
        function frame:SetBackdropBorderColor(r,g,b,a) self.borderColor = {r,g,b,a} end
        frames[#frames + 1] = frame
        nativeFrames[#nativeFrames + 1] = frame
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
      do
        local nativeCreate = CreateFrame
        CreateFrame = function(kind,name,parent,template)
          if kind ~= "EditBox" then return nativeCreate(kind,name,parent,template) end
          local frame = nativeCreate("Frame",name,parent)
          function frame:SetAutoFocus(value) self.autoFocus=value end
          function frame:SetMultiLine(value) self.multiLine=value end
          function frame:SetFont(path,size,flags)
            assert(type(path)=='string' and type(size)=='number' and type(flags)=='string','Forever EditBox:SetFont requires flags')
            return true
          end
          function frame:SetTextInsets(...) self.insets={...} end
          function frame:SetMaxBytes(value) self.maxBytes=value end
          function frame:SetText(value) self.text=value end
          function frame:GetText() return self.text end
          function frame:HighlightText() self.selected=true end
          function frame:SetFocus() self.focused=true end
          function frame:ClearFocus() self.focused=false end
          return frame
        end
        local TextInput = __wuiraModules.require("ui.TextInput").TextInput
        local escaped = 0
        local input = setmetatable({},TextInput.prototype)
        input:____constructor(UIParent,{text="share string",maxBytes=100,onEscape=function() escaped=escaped+1 end})
        assert(input.Value=="share string" and not input.Frame.autoFocus and input.Frame.maxBytes==100)
        input:Focus(true)
        assert(input.Frame.focused and input.Frame.selected)
        input.Frame.scripts.OnEscapePressed(input.Frame)
        assert(escaped==1 and not input.Frame.focused)
        input:Dispose(); input:Dispose()
        assert(not input.Frame.shown and input.Frame.scripts.OnEscapePressed==nil)
        table.remove(frames)
        table.remove(nativeFrames)
        CreateFrame = nativeCreate
      end
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
      assert(#frames == 7)
      local healthEvents,manaEvents=frames[6],frames[7]
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
      emit("UNIT_HEALTH","target")
      assert(demoBar.value == 650)
      emit("UNIT_HEALTH","player")
      assert(demoBar.value == 300 and demoBar.max == 1200)
      mana,maxMana = 70,250
      emit("UNIT_MAXPOWER","player")
      assert(manaBar.value == 70 and manaBar.max == 250 and demoBar.value == 300)
      health = {secret=true}
      emit("UNIT_HEALTH","player")
      assert(demoBar.value == health) -- Opaque data goes straight to native display, never through compute.
      frames = {box} -- Keep subsequent geometry assertions independent of the demo decoration.
      local Renderer = __wuiraModules.require("wuira").Wuira
      local function mount(_, element, parent) return Renderer.Mount(nil, element, nil, parent) end
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
      local function new(class, ...)
        local instance = setmetatable({}, class.prototype)
        instance:____constructor(...)
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
      emit("UNIT_HEALTH","player")
      assert(overridden.min == 10 and overridden.max == 100 and overridden.value == 25)
      assert(healthEvents.events.UNIT_HEALTH and manaEvents.events.UNIT_POWER_UPDATE)
      Renderer.Unmount(nil,box)
      assert(next(demoBar.events) == nil and demoBar.onEvent == nil and not demoBar.shown)
      assert(next(manaBar.events) == nil and manaBar.onEvent == nil and not box.shown)
      local Background = __wuiraModules.require("ui.decorations.Background").Background
      local Border = __wuiraModules.require("ui.decorations.Border").Border
      local Glow = __wuiraModules.require("ui.decorations.Glow").Glow
      local API = __wuiraModules.require("wuira").wuira
      local factory = __wuiraModules.require("ui.primitives.jsx").UI.createElement
      assert(API == __wuiraModules.require("wuira").Wuira and API.App == API.App)
      local AppClass = __wuiraModules.require("WuiraApp").WuiraApp
      local firstApp,secondApp=new(AppClass),new(AppClass)
      local sharedAppView=factory(nil,"cell",{width=12,height=12})
      local firstRoot=firstApp:Mount(sharedAppView)
      local secondRoot=secondApp:Mount(sharedAppView)
      secondApp:Unmount(firstRoot);assert(firstRoot.shown and secondRoot.shown,"application cleanup cannot cross ownership")
      firstApp:Unmount(firstRoot);assert(not firstRoot.shown and secondRoot.shown)
      assert(not pcall(function() secondApp:Mount(sharedAppView) end),"one mounted instance per application")
      secondApp:Unmount(secondRoot)
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
      local function flowTest(direction,grow,widths,heights,expected,justify)
        local children = {}
        for i=1,#widths do children[i] = child(widths[i],heights[i]) end
        local first = #frames+1
        local frame = API.Mount(nil,node("flow",{width=50,height=50,direction=direction,grow=grow,gap=5,justify=justify},children))
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
      flowTest("horizontal",true,{20,25,10},{10,15,8},{{0,0},{25,0},{20,20}},"center")
      flowTest("vertical",true,{10,15,8},{20,25,10},{{0,0},{0,25},{20,20}},"center")
      flowTest("horizontal",false,{10,10},{10,10},{{25,0},{40,0}},"end")
      flowTest("horizontal",true,{80,10},{10,10},{{0,0},{20,15}},"center")
      do
      local function verifyForEach()
        local each=__wuiraModules.require("ui.ForEach").ForEach
        local count=0
        local repeated=factory(nil,each,{items={10,20}},function(_,width,index)
          count=count+1
          return factory(nil,"cell",{width=width,height=index+1})
        end)
        local view=factory(nil,"flow",{width=100,height=20,direction="horizontal",gap=3},repeated)
        assert(#view.children==2 and count==2 and view.children[2].props.height==2)
        local before=#frames
        local root=API.Mount(nil,view)
        assert(#frames==before+3 and frames[before+2].parent==root and frames[before+3].x==13,'ForEach creates siblings without a wrapper frame')
        API.Unmount(nil,root)
        local empty=factory(nil,each,{items={}},function() error('empty loop called') end)
        local root=API.Mount(nil,factory(nil,"flow",{width=100,height=20},empty))
        assert(#frames==before+4,'empty loops add no native frames')
        API.Unmount(nil,root)
        local nested=factory(nil,each,{items={1,2}},function(_,value)
          return factory(nil,each,{items={value,value+2}},function(_,width) return factory(nil,"cell",{width=width,height=1}) end)
        end)
        local flattened=factory(nil,"flow",{width=100,height=20},nested,factory(nil,"cell",{width=5,height=1}))
        assert(#flattened.children==5 and flattened.children[1].props.width==1 and flattened.children[2].props.width==3 and flattened.children[3].props.width==2)
        assert(not pcall(factory,nil,"cell",{width=100,height=20},repeated),'Cell still accepts one child')
        assert(not pcall(factory,nil,"flow",{},function() end),'native layouts reject render functions')
        assert(not pcall(each,nil,{items={1}}),'loop render callback required')
        local cycle={kind='group',props={},children={}}
        cycle.children[1]=cycle
        assert(not pcall(factory,nil,"flow",{},cycle),'group cycles rejected')
        local allowed=false
        local legacy=true
        local view=factory(nil,"cell",{width=10,height=10,condition=function() return allowed end,visible=function() return legacy end})
        local conditional=API.Mount(nil,view)
        local driver=frames[#frames]
        assert(not conditional.shown)
        allowed=true; driver.onUpdate(driver,.1); assert(conditional.shown)
        legacy=false; driver.onUpdate(driver,.1); assert(not conditional.shown)
        legacy=true; allowed={secret=true}; driver.onUpdate(driver,.1); assert(not conditional.shown)
        allowed=true; driver.onUpdate(driver,.1); assert(conditional.shown)
        API.Unmount(nil,conditional)
        assert(driver.onUpdate==nil,'condition driver cleaned up')
        local hidden=API.Mount(nil,factory(nil,"cell",{width=10,height=10,condition=false}))
        assert(not hidden.shown)
        API.Unmount(nil,hidden)
      end
      verifyForEach()
      end
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
      do
        local Encoding = __wuiraModules.require("index").Encoding
        assert(Encoding == __wuiraModules.require("platform.Encoding").Encoding)
        assert(not pcall(function() Encoding:Encode({}) end), "missing native codec")
        local payload = {spellId=635, enabled=true, rows={1,2}}
        local steps,deserialized = {},0
        C_EncodingUtil = {
          SerializeCBOR=function(value) assert(value==payload);steps[#steps+1]="serialize";return "cbor" end,
          CompressString=function(value) assert(value=="cbor");steps[#steps+1]="compress";return "packed" end,
          EncodeBase64=function(value) assert(value=="packed");steps[#steps+1]="encode";return "encoded" end,
          DecodeBase64=function(value) if value~="encoded" then return nil end;steps[#steps+1]="decode";return "packed" end,
          DecompressString=function(value) assert(value=="packed");steps[#steps+1]="decompress";return "cbor" end,
          DeserializeCBOR=function(value) assert(value=="cbor");steps[#steps+1]="deserialize";deserialized=deserialized+1;return payload end,
        }
        local encoded = Encoding:Encode(payload)
        assert(encoded=="encoded" and Encoding:Decode(encoded)==payload)
        assert(table.concat(steps,",")=="serialize,compress,encode,decode,decompress,deserialize")
        assert(not pcall(function() Encoding:Decode("broken") end))
        for _,limit in ipairs({0,-1,math.huge,0/0}) do assert(not pcall(function() Encoding:Decode(encoded,limit) end)) end
        assert(not pcall(function() Encoding:Decode(string.rep("x",11),10) end))
        local originalSecret=issecretvalue
        issecretvalue=function(value) return value=="encoded" or originalSecret(value) end
        assert(not pcall(function() Encoding:Decode(encoded) end), "secret strings rejected")
        issecretvalue=originalSecret
        C_EncodingUtil.DecompressString=function() return string.rep("x",11) end
        assert(not pcall(function() Encoding:Decode(encoded,10) end) and deserialized==1, "oversized data not deserialized")
        C_EncodingUtil.DecompressString=function() return nil end
        assert(not pcall(function() Encoding:Decode(encoded) end))
        C_EncodingUtil.CompressString=function() return nil end
        assert(not pcall(function() Encoding:Encode(payload) end))
        C_EncodingUtil.CompressString=function() return "packed" end
        C_EncodingUtil.EncodeBase64=function() return nil end
        assert(not pcall(function() Encoding:Encode(payload) end))
        C_EncodingUtil=nil
      end
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
      local storeAPI = __wuiraModules.require("store.index")
      local Memory = {prototype={}}
      Memory.prototype.__index=Memory.prototype
      function Memory.prototype:____constructor() self.Width=220; self.nested={value=1}; self.bindings={} end
      local Other = {prototype={}}
      Other.prototype.__index=Other.prototype
      function Other.prototype:____constructor() self.Width=99 end
      local Persisted = {Token="luma.settings",prototype=Memory.prototype}
      local options = {addon="LumaTest",variable="LumaTestDB"}
      C_AddOns = nil
      LumaTestDB = {["luma.settings"]={Width="bad",nested={value=5}}}
      local registry = new(storeAPI.StoreRegistry,options)
      assert(not registry.IsReady and not pcall(function() return registry:get(Persisted) end))
      assert(registry:get(Memory).Width == 220 and registry:get(Other).Width == 99)
      local ready = false
      registry:onReady(function() ready=true end)
      listener = frames[#frames]
      listener.onEvent(listener,"ADDON_LOADED","OtherAddon")
      assert(not ready)
      listener.onEvent(listener,"ADDON_LOADED","LumaTest")
      assert(ready and registry.IsReady and listener.onEvent == nil)
      assert(registry:get(Persisted).Width == 220 and registry:get(Persisted).nested.value == 5)
      local notifications = 0
      local stop = registry:subscribe(Persisted,function(_,snapshot)
        notifications=notifications+1
        snapshot.Width=999
      end)
      assert(notifications == 0)
      local snapshot = registry:get(Persisted)
      snapshot.nested.value=999
      assert(registry:get(Persisted).nested.value == 5)
      local draftReference
      registry:set(Persisted,function(_,draft)
        draft.Width=240; draft.nested.value=6; draft.bindings["679"]="CTRL-K"; draftReference=draft
        return draft
      end)
      draftReference.Width=888
      assert(notifications == 1 and registry:get(Persisted).Width == 240)
      assert(LumaTestDB["luma.settings"].Width == 240)
      assert(not pcall(function() registry:set(Persisted,function(_,draft)
        draft.Width=500; error("abort")
      end) end))
      assert(notifications == 1 and registry:get(Persisted).Width == 240)
      assert(not pcall(function() registry:set(Persisted,function(_,draft)
        draft.nested.loop=draft; return draft
      end) end))
      assert(notifications == 1)
      stop()
      registry:set(Persisted,function(_,draft) draft.Width=260; return draft end)
      assert(notifications == 1)
      registry:set(Memory,function(_,draft) draft.Width=230; return draft end)
      assert(LumaTestDB.Memory == nil and registry:get(Other).Width == 99)
      C_AddOns={IsAddOnLoaded=function() return true end}
      local reloaded = new(storeAPI.StoreRegistry,options)
      assert(reloaded:get(Persisted).Width == 260 and reloaded:get(Memory).Width == 220)
      assert(reloaded:get(Persisted).bindings["679"] == "CTRL-K")
      local Collision = {Token="luma.settings",prototype=Memory.prototype}
      assert(not pcall(function() reloaded:get(Collision) end))
      registry:Dispose()
      local swingAPI = __wuiraModules.require("datasources.SwingTimer")
      local now = 10
      function GetTime() return now end
      C_SwingTimer = {}
      Enum = {PlayerSwingType={MainHand=0,OffHand=1,Ranged=2},StatusBarInterpolation={Immediate=0},StatusBarTimerDirection={RemainingTime=1}}
      C_DurationUtil={CreateDuration=function()
        return {SetTimeFromStart=function(self,start,duration) self.start,self.duration=start,duration end}
      end}
      local swing = new(swingAPI.SwingTimer,"MainHand")
      local swingEvents = frames[#frames]
      assert(not swing.HasTiming and swing.Value == 0)
      swingEvents.onEvent(swingEvents,"PLAYER_SWING",3,1)
      assert(not swing.HasTiming)
      swingEvents.onEvent(swingEvents,"PLAYER_SWING",3,0)
      assert(swing.HasTiming and swing.Value == 3 and swing.Max.Value == 3)
      now=11.5
      assert(swing.Value == 1.5 and swing.Percent.Value == 50)
      local swingView = factory(nil,"progress",{width=100,height=12,source=swing})
      local swingFrame = API.Mount(nil,swingView)
      assert(swingFrame.timer.start == 10 and swingFrame.timer.duration == 3)
      local calls = swingFrame.timerCalls
      API.Unmount(nil,swingFrame)
      swingEvents.onEvent(swingEvents,"PLAYER_SWING",2,0)
      assert(swingFrame.timerCalls == calls and swing.Value == 2)
      swingEvents.onEvent(swingEvents,"PLAYER_SWING",{secret=true},0)
      assert(swing:IsSecret() and not pcall(function() return swing.Value end))
      swingEvents.onEvent(swingEvents,"PLAYER_SWING",2,0)
      assert(not swing:IsSecret())
      now=20
      assert(swing.Value == 0)
      swingEvents.onEvent(swingEvents,"WEAPON_SLOT_CHANGED")
      assert(not swing.HasTiming and swing.Max.Value == 0)
      swing:Dispose()
      assert(swingEvents.onEvent == nil and next(swingEvents.events) == nil)
      local labelView = factory(nil,"label",{width=100,height=20,text="Health",fontSize=11})
      local labelFrame = API.Mount(nil,labelView)
      assert(labelFrame.fontString.text == "Health" and labelFrame.fontString.size == 11)
      API.Unmount(nil,labelFrame)
      local textureAPI = __wuiraModules.require("datasources.TextureSource")
      local textureID = 123
      local textureSource = new(textureAPI.TextureSource,function() return textureID end,{"UNIT_AURA"},"player")
      local iconFrame = API.Mount(nil,factory(nil,"icon",{width=24,height=24,textureSource=textureSource}))
      assert(iconFrame.textures[1].path == 123)
      textureID=456
      iconFrame.onEvent(iconFrame,"UNIT_AURA","target")
      assert(iconFrame.textures[1].path == 123)
      iconFrame.onEvent(iconFrame,"UNIT_AURA","player")
      assert(iconFrame.textures[1].path == 456)
      API.Unmount(nil,iconFrame)
      local timerAPI = __wuiraModules.require("datasources.TimerSource")
      local nativeDuration = {duration=10,start=0}
      local timerSource = new(timerAPI.TimerSource,function() return nativeDuration end,{"SPELL_UPDATE_COOLDOWN"})
      local timerFrame = API.Mount(nil,factory(nil,"progress",{width=100,height=10,source=timerSource}))
      assert(timerFrame.timer == nativeDuration)
      assert(timerFrame.min == 0 and timerFrame.max == 1)
      nativeDuration=nil
      timerFrame.onEvent(timerFrame,"SPELL_UPDATE_COOLDOWN")
      assert(timerFrame.value == 0)
      API.Unmount(nil,timerFrame)
      local remaining = 2
      nativeDuration = {GetRemainingDuration=function() return remaining end}
      assert(timerSource.IsActive)
      local text = "Holy Light"
      local activeView = factory(nil,"label",{width=100,height=20,
        text=function() return text end,visible=function() return timerSource.IsActive end})
      local activeFrame = API.Mount(nil,activeView)
      local driver = frames[#frames]
      assert(activeFrame.shown and activeFrame.fontString.text == "Holy Light")
      remaining=0
      driver.onUpdate(driver,0.05)
      assert(not activeFrame.shown and not timerSource.IsActive)
      remaining=1
      text="Flash of Light"
      driver.onUpdate(driver,0.05)
      assert(activeFrame.shown and activeFrame.fontString.text == "Flash of Light")
      API.Unmount(nil,activeFrame)
      assert(driver.onUpdate == nil and not driver.shown)
      do
      local function verifyTotemTimer()
        local timerClass=__wuiraModules.require("datasources.TotemTimer").TotemTimer
        local oldSpell=C_Spell
        C_Spell={GetSpellName=function(id) assert(id == 26573); return "Consecration" end}
        local effects={}
        local remaining=8
        local duration={GetRemainingDuration=function() return remaining end}
        function GetNumTotemSlots() return 4 end
        function GetTotemInfo(slot)
          local effect=effects[slot]
          if not effect then return false,"",0,0,0,1,0 end
          -- Secret numerical timings must never be compared or reconstructed.
          return true,effect.name,{secret=true},{secret=true},123,1,effect.id
        end
        function GetTotemDuration(slot) assert(slot == 2); return duration end
        local source=new(timerClass,26573)
        assert(source.Status == "inactive" and not source.IsActive)
        effects[1]={name="Unrelated ground effect",id=999}
        local view=factory(nil,"progress",{width=220,height=2,source=source,
          background=false,backdrop=false,visible=function() return source.IsActive end})
        local bar=API.Mount(nil,view)
        local visibility=frames[#frames]
        assert(not bar.shown)
        effects[2]={name="Consecration",id=20116} -- Different rank, discovered outside slot 1.
        emit("PLAYER_TOTEM_UPDATE",2)
        visibility.onUpdate(visibility,.05)
        assert(bar.timer == duration and bar.shown and source.Status == "active")
        remaining=0
        visibility.onUpdate(visibility,.05)
        assert(not bar.shown) -- Native timer expiration requires no totem removal event.
        remaining=8
        effects[2]={name="Consecration",id={secret=true}}
        emit("PLAYER_TOTEM_UPDATE",2)
        visibility.onUpdate(visibility,.05)
        assert(bar.shown and bar.timer == duration) -- Public identity permits opaque timing.
        effects[2]={name={secret=true},id={secret=true}}
        emit("PLAYER_TOTEM_UPDATE",2)
        visibility.onUpdate(visibility,.05)
        assert(not bar.shown and source.Status == "restricted")
        effects[2]=nil
        emit("PLAYER_TOTEM_UPDATE",2)
        assert(source.Status == "inactive")
        API.Unmount(nil,bar)
        assert(next(bar.events) == nil and bar.onEvent == nil)
        GetTotemDuration=nil
        assert(source.Status == "unavailable")
        GetTotemInfo=nil; GetNumTotemSlots=nil; C_Spell=oldSpell
      end
      verifyTotemTimer()
      end
      local stock = __wuiraModules.require("platform.BlizzardUI").BlizzardUI
      do
      local function verifyKnownSpells()
        local oldBook,oldSpell,oldEnum=C_SpellBook,C_Spell,Enum
        Enum={SpellBookSpellBank={Player=0},SpellBookItemType={Spell=1}}
        local reads=0
        local items={
          {spellID=20287,name="Seal of Righteousness",itemType=1,isPassive=false},
          {spellID=20287,name="Seal of Righteousness",itemType=1,isPassive=false}, -- Duplicate entry.
          {spellID=21082,name="Seal of the Crusader",itemType=2}, -- Future spell.
          {spellID=20375,name="Seal of Command",itemType=1,isOffSpec=true},
          {spellID=20216,name="Divine Favor",itemType=1,isPassive=true},
        }
        C_SpellBook={
          GetNumSpellBookSkillLines=function() reads=reads+1; return 1 end,
          GetSpellBookSkillLineInfo=function(line) assert(line == 1); return {itemIndexOffset=0,numSpellBookItems=#items} end,
          GetSpellBookItemInfo=function(slot,bank) assert(bank == 0); return items[slot] end,
        }
        C_Spell={GetSpellName=function(id)
          if id == 21084 then return "Seal of Righteousness" end
          return "Other spell"
        end}
        local class=__wuiraModules.require("datasources.KnownSpells").KnownSpells
        local source=new(class)
        local frame=frames[#frames]
        assert(frame.onUpdate == nil and source.Status == "ready")
        assert(#source.Value == 2 and source:Has(21084) and source:Has(20287))
        assert(not source:Has(21082) and not source:Has(20375))
        assert(#source.Entries == 2 and source:Find(21084).id == 20287)
        assert(source:Find("Divine Favor").isPassive == true and source:Find(20287).isPassive == false)
        assert(#source:Filter('sEAL*')==1 and source:Filter('sEAL*')[1].id==20287)
        assert(#source:Filter('*Favor')==1 and #source:Filter('Seal of Righteousnes?')==1 and #source:Filter('Seal')==0)
        assert(#source:Filter('*')==2 and not pcall(source.Filter,source,{secret=true}))
        local metadata=source.Entries
        metadata[1].name="Modified"
        assert(source:Find("Divine Favor").name == "Divine Favor")
        local count=reads
        local filtered=source:Filter('Seal*'); filtered[1].name='Changed'
        assert(source:Filter('Seal*')[1].name=='Seal of Righteousness' and reads==count,'filters copy the cache without native reads')
        local snapshot=source.Value
        snapshot[1]=0
        assert(source.Value[1] ~= 0 and reads == count) -- Read copies cached data, never the book.
        local changes=0
        local stop=source:onChange(function(_,value) changes=changes+1; assert(#value > 0) end)
        assert(changes == 0)
        emit("SPELLS_CHANGED")
        assert(changes == 0 and reads == count+1)
        items[3].itemType=1
        emit("LEARNED_SPELL_IN_SKILL_LINE",21082,1,false)
        assert(changes == 1 and source:Has(21082))
        items[4].isOffSpec=false
        emit("PLAYER_TALENT_UPDATE")
        assert(changes == 2 and source:Has(20375))
        emit("PLAYER_LEVEL_UP",40)
        assert(changes == 2)
        items[5].isPassive=false
        emit("SPELLS_CHANGED")
        assert(changes == 3 and source:Find(20216).isPassive == false)
        items[1].spellID={secret=true}
        emit("SPELLS_CHANGED")
        assert(source.Status == "restricted" and #source.Entries == 0 and source:Find(21084) == nil and not pcall(function() return source.Value end))
        items[1].spellID=20287
        emit("PLAYER_ENTERING_WORLD")
        assert(source.Status == "ready" and changes == 4)
        stop()
        items[3].itemType=2
        emit("SPELLS_CHANGED")
        assert(changes == 4)
        items[5].name='Spell [x].+%-(A)^$'
        emit('SPELLS_CHANGED')
        assert(#source:Filter('Spell [x].+%-(A)^$')==1,'glob escapes Lua pattern metacharacters')
        source:Dispose()
        assert(next(frame.events) == nil and frame.onEvent == nil)
        C_SpellBook=nil
        function IsPassiveSpell(slot,bank) assert(slot == 1 and bank == "spell"); return false end
        function GetNumSpellTabs() return 1 end
        function GetSpellTabInfo() return "Holy",123,0,2 end
        function GetSpellBookItemInfo(slot,bank)
          assert(bank == "spell")
          if slot == 1 then return "SPELL",633 end
          return "FUTURESPELL",879
        end
        local legacy=new(class)
        assert(#legacy.Value == 1 and legacy.Value[1] == 633)
        assert(legacy.Entries[1].isPassive == false)
        legacy:Dispose()
        GetNumSpellTabs=nil; GetSpellTabInfo=nil; GetSpellBookItemInfo=nil; IsPassiveSpell=nil
        C_SpellBook,C_Spell,Enum=oldBook,oldSpell,oldEnum
      end
      verifyKnownSpells()
      ${fs.readFileSync(path.join(__dirname, "editmode-layouts.lua"), "utf8")}
      end
      PlayerFrame=CreateFrame("Frame",nil,UIParent)
      TargetFrame=CreateFrame("Frame",nil,UIParent)
      FocusFrame=CreateFrame("Frame",nil,UIParent)
      MainMenuBar=CreateFrame("Frame",nil,UIParent)
      MainMenuBar:RegisterEvent("ACTIONBAR_UPDATE_STATE")
      local nativeHandler=function() end
      MainMenuBar:SetScript("OnEvent",nativeHandler)
      combat=true
      local restore=stock.Hide(nil,{player=true,target=true,focus=true,actionBars=true})
      local stockListener=frames[#frames]
      assert(PlayerFrame.parent == UIParent)
      combat=false
      stockListener.onEvent(stockListener,"PLAYER_REGEN_ENABLED")
      local hiddenParent=PlayerFrame.parent
      assert(hiddenParent ~= UIParent and not hiddenParent.shown)
      assert(TargetFrame.parent == hiddenParent and FocusFrame.parent == hiddenParent)
      assert(MainMenuBar.parent == hiddenParent and MainMenuBar.onEvent == nativeHandler)
      assert(MainMenuBar.events.ACTIONBAR_UPDATE_STATE)
      MainMenuBar:SetParent(UIParent)
      MainMenuBar.onShowHook(MainMenuBar)
      assert(MainMenuBar.parent == hiddenParent)
      MultiBarBottomLeft=CreateFrame("Frame",nil,UIParent)
      stockListener.onEvent(stockListener,"ADDON_LOADED")
      assert(MultiBarBottomLeft.parent == hiddenParent)
      combat=true
      restore()
      assert(PlayerFrame.parent == hiddenParent)
      combat=false
      stockListener.onEvent(stockListener,"PLAYER_REGEN_ENABLED")
      assert(PlayerFrame.parent == UIParent and TargetFrame.parent == UIParent and FocusFrame.parent == UIParent)
      assert(MainMenuBar.parent == UIParent and MultiBarBottomLeft.parent == UIParent)
      assert(next(stockListener.events) == nil and stockListener.onEvent == nil)
      -- Optional channels do not allocate or read until requested and consumed.
      local healReads,absorbReads,conditionCalls=0,0,0
      local incoming,shield=300,200
      function UnitGetIncomingHeals(unit) assert(unit == "player"); healReads=healReads+1; return incoming end
      function UnitGetTotalAbsorbs(unit) assert(unit == "player"); absorbReads=absorbReads+1; return shield end
      health=50
      local plainHP=new(HP)
      local plainFrame=API.Mount(nil,factory(nil,"progress",{width=100,height=10,source=plainHP}))
      assert(plainHP.HealPrediction == nil and plainHP.AbsorbPrediction == nil)
      assert(not plainFrame.events.UNIT_HEAL_PREDICTION and not plainFrame.events.UNIT_ABSORB_AMOUNT_CHANGED)
      assert(healReads == 0 and absorbReads == 0)
      API.Unmount(nil,plainFrame)
      local predictedHP=new(HP):UseHealPrediction():UseAbsorbPrediction()
      local firstHealChannel=predictedHP.HealPrediction
      predictedHP:UseHealPrediction():UseAbsorbPrediction()
      assert(firstHealChannel == predictedHP.HealPrediction and healReads == 0 and absorbReads == 0)
      predictedHP:When(function(_,value) conditionCalls=conditionCalls+1; return value >= 20 end)
      predictedHP:When(function(_,value) return value < 100 end)
      health=10
      local before=#frames
      local predictedFrame=API.Mount(nil,factory(nil,"progress",{width=100,height=10,source=predictedHP,
        healPrediction={texture="heal-path"},absorbPrediction={texture="shield-path"}}))
      local healFrame,shieldFrame=frames[before+2],frames[before+3]
      assert(#frames == before+4 and not predictedFrame.shown and predictedFrame.value == nil)
      assert(healReads == 0 and absorbReads == 0 and predictedFrame.onUpdate == nil)
      local predictedListener=frames[before+4]
      assert(predictedListener.events.UNIT_HEAL_PREDICTION and predictedListener.events.UNIT_ABSORB_AMOUNT_CHANGED)
      health=40
      emit("UNIT_HEALTH","target")
      assert(not predictedFrame.shown and healReads == 0)
      emit("UNIT_HEALTH","player")
      assert(predictedFrame.shown and predictedFrame.value == 40 and predictedFrame.clipsChildren)
      assert(healFrame.value == 300 and shieldFrame.value == 200 and healFrame.max == maxHealth)
      assert(healFrame.fillTexture == "heal-path" and shieldFrame.fillTexture == "shield-path")
      assert(healFrame.relative == predictedFrame.fill and healFrame.relativeAnchor == "TOPRIGHT")
      assert(shieldFrame.parent == predictedFrame and shieldFrame.reverse)
      incoming,shield={secret=true},{secret=true}
      emit("UNIT_HEAL_PREDICTION","player")
      assert(healFrame.value == incoming and shieldFrame.value == shield)
      assert(not pcall(function() return predictedHP.HealPrediction.Value end))
      local priorConditions,priorHealReads=conditionCalls,healReads
      health={secret=true}
      emit("UNIT_HEALTH","player")
      assert(not predictedFrame.shown and conditionCalls == priorConditions and healReads == priorHealReads)
      health=110
      emit("UNIT_HEALTH","player")
      assert(not predictedFrame.shown and healReads == priorHealReads) -- chained conditions are AND
      health,incoming,shield=25,0,0
      emit("UNIT_HEALTH","player")
      assert(predictedFrame.shown and healFrame.value == 0 and shieldFrame.value == 0)
      assert(predictedHP.Value == 25 and predictedHP.HealPrediction.Value == 0)
      API.Unmount(nil,predictedFrame)
      assert(predictedFrame.onEvent == nil and next(predictedFrame.events) == nil and not healFrame.shown)
      local hiddenHP=new(HP):When(function() return true end)
      local hiddenFrame=API.Mount(nil,factory(nil,"progress",{width=100,height=10,source=hiddenHP,visible=function() return false end}))
      emit("UNIT_HEALTH","player")
      assert(not hiddenFrame.shown) -- source activation must not override a cell predicate
      API.Unmount(nil,hiddenFrame)
      local onlyHeal=new(HP):UseHealPrediction()
      local onlyHealFrame=API.Mount(nil,factory(nil,"progress",{width=100,height=10,source=onlyHeal,healPrediction=false}))
      assert(onlyHeal.AbsorbPrediction == nil and not onlyHealFrame.events.UNIT_ABSORB_AMOUNT_CHANGED)
      assert(onlyHealFrame.shown)
      API.Unmount(nil,onlyHealFrame)
      for _,vertical in ipairs({false,true}) do
        for _,reverse in ipairs({false,true}) do
          local count=#frames
          local orientedFrame=API.Mount(nil,factory(nil,"progress",{width=100,height=10,
            source=new(HP):UseHealPrediction():UseAbsorbPrediction(),
            orientation=vertical and "vertical" or "horizontal",reverse=reverse}))
          local h,a=frames[count+2],frames[count+3]
          local point=vertical and (reverse and "TOPLEFT" or "BOTTOMLEFT") or (reverse and "TOPRIGHT" or "TOPLEFT")
          local relative=vertical and (reverse and "BOTTOMLEFT" or "TOPLEFT") or (reverse and "TOPLEFT" or "TOPRIGHT")
          assert(h.anchor == point and h.relativeAnchor == relative and h.reverse == reverse and a.reverse ~= reverse)
          assert(h.orientation == orientedFrame.orientation and a.orientation == orientedFrame.orientation)
          API.Unmount(nil,orientedFrame)
        end
      end
      local unsupportedHeals,unsupportedAbsorbs=UnitGetIncomingHeals,UnitGetTotalAbsorbs
      UnitGetIncomingHeals,UnitGetTotalAbsorbs=nil,nil
      local unsupportedHP=new(HP):UseHealPrediction():UseAbsorbPrediction()
      assert(not unsupportedHP.HealPrediction.IsAvailable and not unsupportedHP.AbsorbPrediction.IsAvailable)
      local unsupportedCount=#frames
      local unsupportedFrame=API.Mount(nil,factory(nil,"progress",{width=100,height=10,source=unsupportedHP}))
      assert(#frames == unsupportedCount+2 and unsupportedFrame.shown)
      assert(not unsupportedFrame.events.UNIT_HEAL_PREDICTION and not unsupportedFrame.events.UNIT_ABSORB_AMOUNT_CHANGED)
      API.Unmount(nil,unsupportedFrame)
      UnitGetIncomingHeals,UnitGetTotalAbsorbs=unsupportedHeals,unsupportedAbsorbs
      local restrictedCalls=0
      local filteredTimer=new(timerAPI.TimerSource,function() return nativeDuration end,{"SPELL_UPDATE_COOLDOWN"})
      filteredTimer:When(function(_,value) restrictedCalls=restrictedCalls+1; return value ~= nil end)
      nativeDuration=nil
      local conditionalTimer=API.Mount(nil,factory(nil,"progress",{width=100,height=10,source=filteredTimer}))
      assert(not conditionalTimer.shown)
      nativeDuration={GetRemainingDuration=function() return 1 end}
      conditionalTimer.onEvent(conditionalTimer,"SPELL_UPDATE_COOLDOWN")
      assert(conditionalTimer.shown and conditionalTimer.timer == nativeDuration)
      local restrictedCount=restrictedCalls
      nativeDuration={secret=true}
      conditionalTimer.onEvent(conditionalTimer,"SPELL_UPDATE_COOLDOWN")
      assert(not conditionalTimer.shown and restrictedCalls == restrictedCount)
      API.Unmount(nil,conditionalTimer)
      -- A resource shares one native listener across observers, bars, and its regen accessory.
      do
      local Mana=resources.Mana
      mana,maxMana=100,250
      local trackedMana=new(Mana,"player"):UseRegenTimer()
      local changes,otherChanges=0,0
      local nativeBefore=#nativeFrames
      local unsubscribe=trackedMana:onChange(function(_,value) changes=changes+1; assert(value == mana) end)
      local unsubscribeOther=trackedMana:onChange(function() otherChanges=otherChanges+1 end)
      assert(#nativeFrames == nativeBefore+1)
      local trackedEvents=nativeFrames[#nativeFrames]
      local readsBefore=powerReads
      mana=90
      emit("UNIT_POWER_UPDATE","player","MANA")
      assert(changes == 1 and otherChanges == 1 and powerReads == readsBefore+1)
      emit("UNIT_POWER_UPDATE","player","MANA")
      assert(changes == 1 and otherChanges == 1)
      mana={secret=true}
      emit("UNIT_POWER_UPDATE","player","MANA")
      assert(changes == 1 and otherChanges == 1)
      unsubscribe()
      mana=80
      emit("UNIT_POWER_UPDATE","player","MANA")
      assert(changes == 1 and otherChanges == 2)
      unsubscribeOther()
      assert(next(trackedEvents.events) == nil)
      local timers={}
      C_Timer={NewTimer=function(delay,callback)
        local timer={due=now+delay,callback=callback,cancelled=false}
        function timer:Cancel() self.cancelled=true end
        timers[#timers+1]=timer
        return timer
      end}
      local function advance(time)
        now=time
        for _,timer in ipairs(timers) do
          if not timer.cancelled and timer.due <= now then timer.cancelled=true; timer.callback() end
        end
      end
      C_CurveUtil={CreateCurve=function()
        local curve={points={}}
        function curve:SetType(value) self.type=value end
        function curve:AddPoint(x,y) self.points[#self.points+1]={x,y} end
        return curve
      end}
      Enum.LuaCurveType={Step=1}
      local spellCost=10
      C_Spell={GetSpellPowerCost=function(id) assert(id == 635); return {{type=0,cost=spellCost}} end}
      local resourceBar=API.Mount(nil,factory(nil,"progress",{width=220,height=14,source=trackedMana}))
      local beforeTimer=#nativeFrames
      local tickBar=API.Mount(nil,factory(nil,"progress",{width=218,height=2,source=trackedMana.RegenTimer}))
      assert(#nativeFrames == beforeTimer+1 and not tickBar.shown and tickBar.onUpdate == nil)
      now=100
      emit("UNIT_SPELLCAST_SUCCEEDED","player","cast-id",635)
      assert(trackedMana.RegenTimer.Phase == "fiveSecondRule" and tickBar.shown and tickBar.timer.duration == 5)
      local initialStart,initialCalls=tickBar.timer.start,tickBar.timerCalls
      spellCost=0
      now=101
      emit("UNIT_SPELLCAST_SUCCEEDED","player","cast-id",635)
      emit("UNIT_POWER_UPDATE","player","MANA")
      assert(tickBar.timer.start == initialStart and tickBar.timerCalls == initialCalls)
      advance(105)
      assert(trackedMana.RegenTimer.Phase == "estimatedTick" and tickBar.timer.start == 105 and tickBar.timer.duration == 2)
      now=106
      emit("UNIT_POWER_UPDATE","player","MANA")
      advance(107)
      assert(trackedMana.RegenTimer.Phase == "estimatedTick" and tickBar.timer.start == 107)
      advance(109)
      assert(not trackedMana.RegenTimer.IsActive and not tickBar.shown)
      mana=maxMana
      emit("UNIT_POWER_UPDATE","player","MANA")
      assert(not tickBar.shown)
      mana,spellCost=70,10
      emit("UNIT_SPELLCAST_SUCCEEDED","player","cast-id",635)
      assert(tickBar.shown and tickBar.timer.duration == 5)
      mana=maxMana
      emit("UNIT_POWER_UPDATE","player","MANA")
      assert(not tickBar.shown and not trackedMana.RegenTimer.IsActive and timers[#timers].cancelled)
      mana,spellCost={secret=true},{secret=true}
      nativeManaAlpha=0
      emit("UNIT_SPELLCAST_SUCCEEDED","player","cast-id",635)
      assert(tickBar.shown and tickBar.alpha == 0) -- Native alpha masks full secret mana.
      nativeManaAlpha=1
      emit("UNIT_POWER_UPDATE","player","MANA")
      assert(tickBar.alpha == 1)
      API.Unmount(nil,tickBar)
      assert(timers[#timers].cancelled and not trackedMana.RegenTimer.IsActive)
      assert(trackedEvents.events.UNIT_POWER_UPDATE) -- The mana bar still consumes the source.
      API.Unmount(nil,resourceBar)
      assert(next(trackedEvents.events) == nil and trackedEvents.onEvent == nil)
      local anchorView=factory(nil,"cell",{width=220,height=14},factory(nil,"progress",{
        width="inherit",height=2,anchor="BOTTOMLEFT",relativeAnchor="BOTTOMLEFT",offset={x=0,y=1}}))
      local anchorFrame=API.Mount(nil,anchorView)
      local anchorChild=frames[#frames]
      assert(anchorChild.anchor == "BOTTOMLEFT" and anchorChild.relative == anchorFrame and anchorChild.y == -1)
      API.Unmount(nil,anchorFrame)
      end
      -- Stock action removal is explicit, backed up before mutation, and rejects unsafe restores.
      do
      local actionAPI=__wuiraModules.require("platform.ActionBars").ActionBars
      local slots={[1]={"spell",635},[2]={"item",5512},[72]={"macro",1}}
      local cursor
      local pickups=0
      function GetActionInfo(slot) local entry=slots[slot]; if entry then return entry[1],entry[2],entry[3] end end
      function GetCursorInfo() if cursor then return cursor[1],cursor[2] end end
      function PickupAction(slot) pickups=pickups+1; cursor=slots[slot]; slots[slot]=nil; emit("CURSOR_CHANGED") end
      function ClearCursor() cursor=nil end
      function PlaceAction(slot) assert(cursor); slots[slot]=cursor; cursor=nil end
      function PickupSpell(id) cursor={"spell",id} end
      function PickupItem(id) cursor={"item",id} end
      function PickupMacro(id) cursor={"macro",id} end
      combat=false
      local backup=actionAPI.Capture(actionAPI)
      assert(#backup == 3 and pickups == 0)
      slots[3]={"flyout",9}
      assert(not pcall(actionAPI.Capture,actionAPI) and pickups == 0 and slots[1])
      slots[3]={"spell",17}
      assert(not pcall(actionAPI.Clear,actionAPI,backup) and pickups == 0 and slots[1])
      slots[3]=nil
      combat=true
      assert(not pcall(actionAPI.Clear,actionAPI,backup) and pickups == 0)
      combat=false
      cursor={"item",99}
      assert(not pcall(actionAPI.Clear,actionAPI,backup) and pickups == 0)
      cursor=nil
      actionAPI.Clear(actionAPI,backup)
      assert(next(slots) == nil and cursor == nil and pickups == 3)
      slots[2]={"item",999}
      assert(not pcall(actionAPI.Restore,actionAPI,backup) and slots[1] == nil and slots[2][2] == 999)
      slots[2]=nil
      actionAPI.Restore(actionAPI,backup)
      assert(slots[1][2] == 635 and slots[2][2] == 5512 and slots[72][2] == 1 and cursor == nil)
      local previousConsole=console
      local errors,reloads=0,0
      console={log=function() end,warn=function() end,error=function() errors=errors+1 end}
      SlashCmdList={}
      function ReloadUI() reloads=reloads+1 end
      local controller=CreateFrame("Frame",nil,UIParent)
      ActionBarController=controller
      ActionBarButtonEventsFrame=CreateFrame("Frame",nil,UIParent)
      ActionBarButtonEventsFrame:RegisterEvent("ACTIONBAR_UPDATE_COOLDOWN")
      controller:RegisterEvent("ACTIONBAR_SLOT_CHANGED")
      controller:SetScript("OnUpdate",function() end)
      local nativeChild=CreateFrame("Frame",nil,MainMenuBar)
      ActionButton1=nativeChild
      local detached=0
      C_ActionBar={UnregisterActionUIButton=function(button) assert(button == nativeChild); detached=detached+1 end}
      nativeChild:RegisterEvent("ACTIONBAR_UPDATE_STATE")
      nativeChild:SetScript("OnUpdate",function() end)
      function MainMenuBar:GetChildren() return nativeChild end
      local emptyOptions={addon="ActionTest",variable="WuiraActionTest",clearCommand="/cleartestbars",restoreCommand="/restoretestbars"}
      local hardware=false
      function PickupAction(slot)
        assert(hardware,"PickupAction requires user input")
        pickups=pickups+1; cursor=slots[slot]; slots[slot]=nil; emit("CURSOR_CHANGED")
      end
      C_AddOns={IsAddOnLoaded=function() return true end}
      local stopFirst=actionAPI.InstallEmptyMode(actionAPI,emptyOptions)
      emit("PLAYER_ENTERING_WORLD")
      assert(reloads == 0 and slots[1] and errors == 0) -- Events never mutate slots or reload.
      assert(WuiraActionTest["wuira.native-action-bars"].phase == "ready")
      SlashCmdList.WUIRA_CLEAR_ACTIONTEST("") -- A new backup must survive reload first.
      assert(slots[1] and errors == 0)
      stopFirst()
      local stopSecond=actionAPI.InstallEmptyMode(actionAPI,emptyOptions)
      emit("PLAYER_ENTERING_WORLD")
      assert(slots[1] and errors == 0 and reloads == 0)
      assert(next(controller.events) == nil and controller.onEvent == nil and controller.onUpdate == nil)
      assert(next(nativeChild.events) == nil and nativeChild.onUpdate == nil)
      assert(next(ActionBarButtonEventsFrame.events) == nil)
      assert(detached > 0)
      assert(MainMenuBar:GetParent() ~= UIParent)
      SlashCmdList.WUIRA_CLEAR_ACTIONTEST("") -- Simulate a refused native call.
      assert(slots[1] and errors == 1 and MainMenuBar:GetParent() ~= UIParent)
      emit("CURSOR_CHANGED")
      emit("PLAYER_REGEN_ENABLED")
      assert(errors == 1) -- A blocked operation is never retried by later events.
      emit("ADDON_ACTION_BLOCKED","ActionTest","PickupAction()")
      assert(errors == 2)
      hardware=true
      SlashCmdList.WUIRA_CLEAR_ACTIONTEST("")
      hardware=false
      assert(next(slots) == nil and errors == 2)
      assert(WuiraActionTest["wuira.native-action-bars"].phase == "disabled")
      hardware=true
      SlashCmdList.WUIRA_RESTORE_ACTIONTEST("")
      hardware=false
      assert(reloads == 0 and WuiraActionTest["wuira.native-action-bars"].phase == "restored")
      stopSecond()
      local stopRestored=actionAPI.InstallEmptyMode(actionAPI,emptyOptions)
      emit("PLAYER_ENTERING_WORLD")
      assert(slots[1][2] == 635 and slots[2][2] == 5512 and errors == 2)
      assert(WuiraActionTest["wuira.native-action-bars"].phase == "restored")
      stopRestored()
      console=previousConsole
      end
      -- Secure buttons use native attributes, preserve template clicks and respect combat ownership.
      do
      local function verifySecureButtons()
      local originalCreateFrame=CreateFrame
      local templateClick=function() end
      local originalParentProtection=UIParent.IsProtected
      function UIParent:IsProtected() return true end
      function CreateFrame(kind,name,parent,template)
        local frame=originalCreateFrame(kind,name,parent,template)
        function frame:IsProtected()
          return self.protected or (self.parent and self.parent ~= UIParent and self.parent.IsProtected and self.parent:IsProtected()) or false
        end
        local show,hide=frame.Show,frame.Hide
        function frame:Show() assert(not combat or not self:IsProtected()); show(self) end
        function frame:Hide() assert(not combat or not self:IsProtected()); hide(self) end
        if kind == "Button" then
          assert(template == "SecureActionButtonTemplate")
          frame.protected,frame.attributes,frame.onClick=true,{},templateClick
          local ancestor=parent
          while ancestor and ancestor ~= UIParent do ancestor.protected=true; ancestor=ancestor.parent end
          function frame:RegisterForClicks(click) assert(not combat); self.click=click end
          function frame:SetAttribute(key,value) assert(not combat); self.attributes[key]=value end
          function frame:SetID(id) assert(not combat); self.id=id end
        end
        return frame
      end
      combat=false
      local visible=true
      local before=#frames
      local secureView=factory(nil,"cell",{width=100,height=40,condition=function() return visible end},
        factory(nil,"secureButton",{action={type="spell",spell=635,unit="player"}},
          factory(nil,"label",{text="Heal"})))
      local root=API.Mount(nil,secureView)
      local button,label=frames[before+2],frames[before+3]
      local driver=frames[#frames]
      assert(button.kind == "Button" and button.template == "SecureActionButtonTemplate" and button.mouseEnabled)
      assert(button.width == 100 and button.height == 40 and label.parent == button and not label.mouseEnabled)
      assert(button.click == "LeftButtonUp" and button.id == 0 and button.attributes.useOnKeyDown == false)
      assert(button.attributes.type1 == "spell" and button.attributes.spell1 == 635 and button.attributes.unit1 == "player")
      assert(button.attributes.type2 == nil and button.onClick == templateClick)
      combat=true
      local count=#frames
      assert(not pcall(API.Mount,nil,factory(nil,"secureButton",{width=10,height=10})))
      assert(not pcall(API.Mount,nil,factory(nil,"cell",{width=10,height=10}),nil,button))
      assert(#frames == count) -- Preflight rejects the entire tree before creating any frames.
      local ordinary=API.Mount(nil,factory(nil,"cell",{width=10,height=10}))
      API.Unmount(nil,ordinary) -- A protected UIParent does not freeze ordinary UI in combat.
      visible=false
      driver.onUpdate(driver,.1)
      assert(root.shown and button.shown) -- Ordinary ancestors are protected too.
      secureView.child.props.action.spell=17
      assert(button.attributes.spell1 == 635) -- Mutating props cannot rewrite secure actions.
      combat=false
      emit("PLAYER_REGEN_ENABLED")
      assert(not root.shown)
      visible=true
      driver.onUpdate(driver,.1)
      assert(root.shown)
      combat=true
      API.Unmount(nil,root)
      assert(root.shown and button.attributes.type1 == "spell")
      combat=false
      emit("PLAYER_REGEN_ENABLED")
      assert(not root.shown and not button.shown and not button.mouseEnabled and button.attributes.type1 == nil)
      assert(button.onClick == templateClick)
      assert(next(frames[before+4].events) == nil)
      local cases={
        {{type="item",item=5512},"item2","item:5512"},
        {{type="macro",macro="My Utility"},"macro2","My Utility"},
        {{type="action",slot=25},"action2",25},
        {{type="target",unit="focus"},"unit2","focus"},
      }
      for _,case in ipairs(cases) do
        local frame=API.Mount(nil,factory(nil,"secureButton",{width=20,height=20,button="RightButton",action=case[1]}))
        assert(frame.attributes.type2 == case[1].type and frame.attributes[case[2]] == case[3])
        assert(frame.attributes.type1 == nil and frame.click == "RightButtonUp")
        API.Unmount(nil,frame)
      end
      local count=#frames
      for _,invalid in ipairs({{type="spell",spell=0},{type="action",slot=-1},{type="target"},{type="macro",macro=""},{type="spell",spell={secret=true}}}) do
        assert(not pcall(API.Mount,nil,factory(nil,"secureButton",{width=10,height=10,action=invalid})))
      end
      assert(not pcall(API.Mount,nil,factory(nil,"secureButton",{width=10,height=10,clickThrough=true})))
      assert(#frames == count)
      local inert=API.Mount(nil,factory(nil,"secureButton",{width=10,height=10}))
      assert(inert.attributes.type1 == nil and inert.mouseEnabled)
      API.Unmount(nil,inert)
      local lateVisible=true
      local host=API.Mount(nil,factory(nil,"cell",{width=40,height=40,visible=function() return lateVisible end}))
      local hostDriver=frames[#frames]
      local lateButton=API.Mount(nil,factory(nil,"secureButton",{width=20,height=20}),nil,host)
      combat=true
      lateVisible=false
      hostDriver.onUpdate(hostDriver,.1)
      assert(host.shown) -- A later, separately mounted secure child protects its existing host.
      API.Unmount(nil,host)
      API.Unmount(nil,lateButton)
      combat=false
      emit("PLAYER_REGEN_ENABLED")
      assert(not host.shown and not lateButton.shown)
      local oldSpell,oldOverride,oldClear=C_Spell,SetOverrideBindingClick,ClearOverrideBindings
      local opaqueCooldown={secret=true}
      C_Spell={
        GetSpellName=function(id) assert(id == 679); return "Holy Strike" end,
        GetSpellTexture=function(id) assert(id == 679); return 12345 end,
        GetSpellCooldownDuration=function(identifier,ignoreGCD)
          assert(identifier == "Holy Strike" and ignoreGCD == true)
          return opaqueCooldown
        end,
      }
      function SetOverrideBindingClick(owner,priority,key,name,button)
        assert(not combat and not priority and _G[name] == owner)
        owner.override={key=key,name=name,button=button}
      end
      function ClearOverrideBindings(owner) assert(not combat); owner.override=nil end
      local spellClass=__wuiraModules.require("datasources.SpellSource").SpellSource
      local spell=construct(spellClass,679)
      local opacity=1
      local count=#frames
      local action=API.Mount(nil,factory(nil,"secureButton",{width=40,height=40,
        action=spell.Action,binding="2",cooldown=spell.Cooldown,finishGlow=true,alpha=function() return opacity end},
        factory(nil,"icon",{textureSource=spell.Texture,margin=1})))
      local opacityDriver=frames[#frames]
      local radial,hotkey
      for index=count+1,#frames do
        local candidate=frames[index]
        if candidate.kind == "Cooldown" then radial=candidate end
        if candidate.fontString and candidate.fontString.text == "2" then hotkey=candidate end
      end
      assert(action.attributes.spell1 == "Holy Strike" and action.override.key == "2")
      assert(action.override.button == "LeftButton" and action.onClick == templateClick)
      assert(radial and radial.cooldownDuration == opaqueCooldown and radial.drawBling and radial.drawSwipe)
      assert(not radial.hideNumbers and radial.clearIfZero and radial.fontString.size == 13)
      assert(hotkey and hotkey.frameLevel > radial.frameLevel)
      assert(frames[count+2].texture.path == 12345)
      combat=true
      opacity=.4
      opacityDriver.onUpdate(opacityDriver,.05)
      assert(action.alpha == .4 and action.attributes.type1 == "spell" and action.override.key == "2")
      opacity={secret=true}
      opacityDriver.onUpdate(opacityDriver,.05)
      assert(action.alpha == .4) -- Restricted opacity never enters Lua comparisons.
      opacity=1
      opacityDriver.onUpdate(opacityDriver,.05)
      assert(action.alpha == 1)
      opaqueCooldown={secret=true}
      emit("SPELL_UPDATE_COOLDOWN")
      assert(radial.cooldownDuration == opaqueCooldown and action.override.key == "2")
      API.Unmount(nil,action)
      assert(action.override ~= nil) -- Protected bindings remain intact until combat ends.
      combat=false
      emit("PLAYER_REGEN_ENABLED")
      assert(action.override == nil and not radial.drawBling and radial.cooldownDuration == nil)
      C_Spell,SetOverrideBindingClick,ClearOverrideBindings=oldSpell,oldOverride,oldClear
      UIParent.IsProtected=originalParentProtection
      CreateFrame=originalCreateFrame
      end
      verifySecureButtons()
      end
      -- Generic hover controls caller-owned content without menu-specific positioning.
      do
      local function verifyCommands()
        local previousSlash,previousHash,previousChat,previousSecure=SlashCmdList,hash_SlashCmdList,hash_ChatTypeInfoList,IsSecureCmd
        SlashCmdList={}; hash_SlashCmdList={}; hash_ChatTypeInfoList={}
        function IsSecureCmd(command) return command == "/RELOAD" end
        local value,calls=nil,0
        local stop=API.registerCommand(nil,"/WuiraTest",function(...) value={...}; calls=calls+1 end)
        local id,handler=next(SlashCmdList)
        assert(_G["SLASH_"..id.."1"] == "/wuiratest")
        handler("Keep Case and  spacing")
        assert(#value == 4 and value[1] == "Keep" and value[2] == "Case" and value[3] == "and" and value[4] == "spacing" and calls == 1)
        handler(""); assert(#value == 0 and calls == 2)
        handler("  "..string.char(9).."  "); assert(#value == 0 and calls == 3)
        handler([[one "two words" 'Three Words' "" pre"fixed value"post Türkçe]])
        assert(#value == 6 and value[1] == "one" and value[2] == "two words" and value[3] == "Three Words" and value[4] == "" and value[5] == "prefixed valuepost" and value[6] == "Türkçe")
        local slash=string.char(92)
        handler('"say '..slash..'"hello'..slash..'"" "a'..slash..slash..'b" C:'..slash..'Temp')
        assert(#value == 3 and value[1] == 'say "hello"' and value[2] == 'a'..slash..'b' and value[3] == 'C:'..slash..'Temp' and calls == 5)
        assert(not pcall(handler,[["unclosed]])); assert(calls == 5)
        assert(not pcall(API.registerCommand,nil,"/WUIRATEST",function() end))
        assert(not pcall(API.registerCommand,nil,"/reload",function() end))
        for _,invalid in ipairs({"", "test", "/", "//test", "/test sub", "/test"..string.char(10).."other"}) do
          assert(not pcall(API.registerCommand,nil,invalid,function() end))
        end
        assert(not pcall(API.registerCommand,nil,"/invalidcallback",123))
        -- Model Forever's import: the raw table is wiped and handlers move into its proxy.
        local proxy={[id]=handler}
        setmetatable(SlashCmdList,{__index=proxy})
        rawset(SlashCmdList,id,nil)
        hash_SlashCmdList["/WUIRATEST"]=handler
        hash_ChatTypeInfoList["/WUIRATEST"]=id
        stop(); stop()
        assert(_G["SLASH_"..id.."1"] == nil and SlashCmdList[id] == nil and proxy[id] == nil)
        assert(hash_SlashCmdList["/WUIRATEST"] == nil and hash_ChatTypeInfoList["/WUIRATEST"] == nil)
        handler("stale callback"); assert(calls == 5)
        local replacement=API.registerCommand(nil,"/wuiratest",function() end)
        stop() -- Old cleanup must not remove a new registration with the same alias.
        local newId,newHandler=next(SlashCmdList)
        assert(newId ~= id and _G["SLASH_"..newId.."1"] == "/wuiratest")
        local other=function() end
        hash_SlashCmdList["/WUIRATEST"]=other
        hash_ChatTypeInfoList["/WUIRATEST"]="OTHER"
        replacement()
        assert(hash_SlashCmdList["/WUIRATEST"] == other and hash_ChatTypeInfoList["/WUIRATEST"] == "OTHER")
        hash_SlashCmdList["/WUIRATEST"]=nil; hash_ChatTypeInfoList["/WUIRATEST"]=nil
        _G.SLASH_EXISTING_ADDON1="/existing-addon"
        assert(not pcall(API.registerCommand,nil,"/existing-addon",function() end))
        _G.SLASH_EXISTING_ADDON1=nil
        local first=API.registerCommand(nil,"/wuira-one",function() end)
        local oldSequence=_G.__wuiraCommandSequence
        _G.__wuiraCommandSequence=0 -- Another embedded copy must still avoid existing IDs.
        local second=API.registerCommand(nil,"/wuira-two",function() end)
        local count=0; for _ in pairs(SlashCmdList) do count=count+1 end
        assert(count == 2)
        first(); second()
        _G.__wuiraCommandSequence=oldSequence
        SlashCmdList,hash_SlashCmdList,hash_ChatTypeInfoList,IsSecureCmd=previousSlash,previousHash,previousChat,previousSecure
      end
      verifyCommands()
      end
      do
      local function verifyEditors()
        local oldCenter=UIParent.GetCenter
        function UIParent:GetCenter() return 0,0 end
        combat=false
        do
          local Window=__wuiraModules.require('ui.Window').Window
          local window=new(Window,{width=640,height=480})
          local header
          assert(not window.IsOpen and not window.Frame.keyboard)
          window:Open(factory(nil,'cell',{onMount=function(_,frame)
            header=frame
            return window:BindDragHandle(frame)
          end}))
          assert(window.IsOpen and window.Frame.keyboard and header.parent==window.Frame)
          header.scripts.OnDragStart(header); assert(window.Frame.moving)
          header.scripts.OnDragStop(header); assert(not window.Frame.moving)
          local originalHeader=header
          assert(not pcall(function() window:Open(function() error('broken replacement') end) end))
          assert(window.IsOpen and originalHeader.shown and window.Frame.keyboard,'failed render retains the current window')
          assert(not pcall(function() window:Open(factory(nil,'cell',{onMount=function() error('broken mount') end})) end))
          assert(window.IsOpen and originalHeader.shown,'failed mount retains the current content')
          window:Open(factory(nil,'cell',{onMount=function(_,frame) header=frame end}))
          assert(window.IsOpen and header.shown and not originalHeader.shown,'window recovers without reload')
          window.Frame.scripts.OnKeyDown(window.Frame,'A'); assert(window.Frame.propagate)
          window.Frame.scripts.OnKeyDown(window.Frame,'ESCAPE')
          assert(not window.IsOpen and not window.Frame.keyboard and not header.shown and header.scripts.OnDragStart==nil)
          window:Open(factory(nil,'cell',{}))
          function window.Frame:IsProtected() return true end
          combat=true
          local propagate=window.Frame.propagate
          window.Frame.scripts.OnKeyDown(window.Frame,'ESCAPE')
          assert(window.IsOpen and window.Frame.propagate==propagate,'protected windows defer close without keyboard writes')
          combat=false; emit('PLAYER_REGEN_ENABLED'); assert(not window.IsOpen)
          window:Dispose(); window:Dispose()
          assert(next(window.Frame.events)==nil and window.Frame.scripts.OnKeyDown==nil)
          assert(not pcall(window.Open,window,factory(nil,'cell',{})))
          assert(not pcall(new,Window,{width=0,height=10}))
        end
        local clicks,cleanups=0,0
        local control=API.Mount(nil,factory(nil,"button",{width=100,height=30,
          onClick=function() clicks=clicks+1 end,
          onMount=function(_,frame)
            assert(frame.width == 100 and frame.mouseEnabled)
            return function() cleanups=cleanups+1 end
          end}))
        assert(control.kind == "Button" and control.template == nil)
        control.scripts.OnClick(control)
        assert(clicks == 1)
        API.Unmount(nil,control); API.Unmount(nil,control)
        assert(cleanups == 1 and control.scripts.OnClick == nil)
        local target=CreateFrame("Frame",nil,UIParent)
        target:SetSize(100,40); target:SetPoint("CENTER",UIParent,"CENTER",10,-20)
        local originalPoint=target.SetPoint
        function target:SetPoint(...) assert(not combat,"Protected target moved during combat"); originalPoint(self,...) end
        local saved
        local moverClass=__wuiraModules.require("ui.FrameMover").FrameMover
        local mover=new(moverClass,target,{label="Test",onMove=function(_,position) saved=position end})
        local proxy=mover.Frame
        assert(proxy.parent == UIParent and proxy.relative == UIParent and proxy.shown)
        proxy.scripts.OnDragStart(proxy)
        proxy.x,proxy.y=50,-30
        proxy.onUpdate(proxy,.016)
        assert(target.x == 50 and target.y == -30)
        proxy.scripts.OnDragStop(proxy)
        assert(saved.x == 50 and saved.y == 30 and not proxy.moving and proxy.onUpdate == nil)
        proxy.scripts.OnDragStart(proxy)
        proxy.x,proxy.y=80,-40
        proxy.onUpdate(proxy,.016)
        combat=true
        emit("PLAYER_REGEN_DISABLED")
        assert(not proxy.shown and not proxy.mouseEnabled and target.x == 80 and saved.x == 80)
        assert(next(proxy.events) == nil)
        combat=false
        local oldShift,oldControl,oldAlt=IsShiftKeyDown,IsControlKeyDown,IsAltKeyDown
        function IsShiftKeyDown() return true end
        function IsControlKeyDown() return true end
        function IsAltKeyDown() return false end
        local captureClass=__wuiraModules.require("ui.KeybindCapture").KeybindCapture
        local capture,cancelled
        capture=construct(captureClass,function() cancelled=true; capture:SetActive(false) end)
        local keyboard=frames[#frames]
        local binding,calls=nil,0
        local stop=capture:AddTarget(target,function(_,key)
          calls=calls+1; binding=key
          capture:SetActive(true) -- Model a synchronous action-tree rebuild.
        end)
        local overlay=frames[#frames]
        assert(not overlay.shown and overlay.relative == UIParent)
        capture:SetActive(true)
        assert(overlay.shown and keyboard.keyboard)
        overlay.scripts.OnEnter(overlay)
        keyboard.scripts.OnKeyDown(keyboard,"K")
        assert(binding == "CTRL-SHIFT-K" and calls == 1 and not keyboard.propagate)
        overlay.scripts.OnEnter(overlay)
        keyboard.scripts.OnKeyDown(keyboard,"DELETE")
        assert(binding == nil and calls == 2 and not keyboard.propagate)
        keyboard.scripts.OnKeyDown(keyboard,"ESCAPE")
        assert(cancelled and not keyboard.keyboard and not overlay.shown)
        capture:SetActive(true)
        combat=true
        emit("PLAYER_REGEN_DISABLED")
        assert(not keyboard.keyboard and not overlay.shown)
        combat=false
        stop(); capture:Dispose()
        assert(overlay.scripts.OnEnter == nil and keyboard.scripts.OnKeyDown == nil)
        IsShiftKeyDown,IsControlKeyDown,IsAltKeyDown=oldShift,oldControl,oldAlt
        local oldSettings,oldPanel=Settings,SettingsPanel
        local category={GetID=function() return 42 end}
        local registered,opened
        Settings={
          RegisterCanvasLayoutCategory=function(frame,name) assert(name == "Test settings"); return category end,
          RegisterAddOnCategory=function(value) registered=value end,
          OpenToCategory=function(id) opened=id end,
        }
        SettingsPanel=CreateFrame("Frame",nil,UIParent); SettingsPanel:Show()
        local settingsClass=__wuiraModules.require("platform.AddonSettings").AddonSettings
        local settings=new(settingsClass,"Test settings",factory(nil,"cell",{width=100,height=100}))
        assert(registered == category and not settings.Frame.shown)
        settings:Open(); assert(opened == 42)
        settings:Close(); assert(not SettingsPanel.shown)
        Settings,SettingsPanel=oldSettings,oldPanel
        UIParent.GetCenter=oldCenter
      end
      verifyEditors()
      end
      do
      local originalCreateFrame=CreateFrame
      local secureContext=false
      local function runSnippet(frame,body)
        local previous=secureContext
        secureContext=true
        assert(load("return function(self) "..body.." end"))()(frame)
        secureContext=previous
      end
      function CreateFrame(...)
        local frame=originalCreateFrame(...)
        frame.attributes,frame.refs,frame.hooks={},{},{}
        function frame:SetFrameStrata(strata) self.strata=strata end
        function frame:SetFrameRef(name,target) self.refs[name]=target end
        function frame:GetFrameRef(name) return self.refs[name] end
        function frame:SetAttribute(name,value) self.attributes[name]=value end
        function frame:GetAttribute(name) return self.attributes[name] end
        function frame:HookScript(name,callback) self.hooks[name]=callback end
        function frame:GetChildren() end
        function frame:RegisterAutoHide(delay) self.autoHideDelay=delay; self.autoHideFrames={} end
        function frame:AddToAutoHide(target) self.autoHideFrames[target]=true end
        function frame:Show()
          assert(not combat or secureContext,"Protected popup Show outside secure handler")
          self.shown=true
          if self.attributes._onshow then runSnippet(self,self.attributes._onshow) end
        end
        function frame:Hide()
          assert(not combat or secureContext,"Protected popup Hide outside secure handler")
          self.shown=false
        end
        return frame
      end
      combat=false
      local menu=CreateFrame("Frame",nil,UIParent)
      menu:SetSize(260,40)
      function menu:GetScale() return 1 end
      function menu:GetNumPoints() return 1 end
      function menu:GetPoint() return "BOTTOMRIGHT",UIParent,"BOTTOMRIGHT",-20,10 end
      menu:RegisterEvent("UPDATE_BINDINGS")
      local click=function() end
      menu.nativeClick=click
      local hover=__wuiraModules.require("ui.HoverTracker").HoverTracker
      local tracker=construct(hover,{regions={menu},hideDelay=.25})
      local handle,popup=tracker.Trigger,tracker.Popup
      assert(menu.parent == UIParent and not popup.shown) -- No skin, layout, size or reparenting.
      assert(handle.width == nil and popup.width == nil)
      assert(menu.nativeClick == click and menu.events.UPDATE_BINDINGS)
      combat=true
      runSnippet(handle,handle.attributes._onenter)
      assert(popup.shown and popup.autoHideDelay == .25)
      assert(popup.autoHideFrames[handle] and popup.autoHideFrames[menu])
      tracker:Dispose()
      assert(popup.shown) -- Protected cleanup waits for combat to end.
      combat=false
      emit("PLAYER_REGEN_ENABLED")
      assert(menu.parent == UIParent)
      assert(not handle.shown and not popup.shown and menu.nativeClick == click and menu.events.UPDATE_BINDINGS)
      local microClass=__wuiraModules.require("skins.MicroBar").MicroBar
      local bar=construct(microClass)
      MicroMenu=nil
      local renders,hoverStates=0,{}
      local mounted
      bar:render(function(defaultBar)
        assert(defaultBar == bar)
        renders=renders+1
        mounted=defaultBar:mount(factory(nil,"cell",{width=20,height=10}),"CENTER")
        defaultBar:OnHover(function(value) hoverStates[#hoverStates+1]=value end)
        return defaultBar
      end)
      assert(renders == 0) -- render waits for the native frame to exist.
      local pointerInside=false
      function menu:IsMouseOver() return pointerInside end
      MicroMenu=menu
      emit("ADDON_LOADED","Blizzard_MicroMenu")
      assert(renders == 1 and mounted.parent == menu and mounted.anchor == "CENTER")
      emit("PLAYER_ENTERING_WORLD")
      assert(renders == 1 and menu.nativeClick == click and menu.events.UPDATE_BINDINGS)
      pointerInside=true
      menu.hooks.OnEnter()
      menu.hooks.OnEnter()
      pointerInside=false
      menu.hooks.OnLeave()
      assert(#hoverStates == 2 and hoverStates[1] and not hoverStates[2])
      combat=true
      bar:Dispose()
      assert(mounted.shown) -- Skin cleanup also waits for protected children to be mutable.
      combat=false
      emit("PLAYER_REGEN_ENABLED")
      assert(not mounted.shown and menu.nativeClick == click and menu.events.UPDATE_BINDINGS)
      MicroMenu=nil
      CreateFrame=originalCreateFrame
      end
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
