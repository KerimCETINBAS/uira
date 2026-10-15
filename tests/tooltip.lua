do
 local Tooltip=__wuiraModules.require('ui.decorations.Tooltip').Tooltip
 local previousTooltip=GameTooltip
 local function nativeTooltip()
  local tip={lines={}}
  function tip:SetOwner(owner,anchor) self.owner,self.anchor=owner,anchor end
  function tip:IsOwned(owner) return self.owner==owner end
  function tip:ClearLines() self.lines={};self.text=nil end
  function tip:SetText(text,r,g,b,a,wrap) self.text,self.color,self.wrap=text,{r,g,b,a},wrap end
  function tip:AddLine(text,r,g,b,wrap) table.insert(self.lines,{text=text,r=r,g=g,b=b,wrap=wrap}) end
  function tip:Show() self.shown=true end
  function tip:Hide() self.shown=false;self.hides=(self.hides or 0)+1 end
  for _,name in ipairs({'SetSpellByID','SetItemByID','SetUnit','SetHyperlink','SetAction'}) do tip[name]=function(self,value) self.route,self.value=name,value end end
  return tip
 end
 local function fire(frame,event)
  if frame.scripts and frame.scripts[event] then frame.scripts[event](frame) end
  for _,hook in ipairs(frame.hooks and frame.hooks[event] or {}) do hook(frame) end
 end
 GameTooltip=nativeTooltip()
 local enters,leaves=0,0
 local decoration=new(Tooltip,{text='Hello',lines={{text='Details',color={r=.1,g=.2,b=.3}}}})
 local before=#frames
 local host=API.Mount(nil,factory(nil,'cell',{width=40,height=20,decorations={tooltip=decoration},onMount=function(_,frame)
  frame:SetScript('OnEnter',function() enters=enters+1 end)
  frame:SetScript('OnLeave',function() leaves=leaves+1 end)
 end}))
 assert(#frames==before+1 and not host.mouseEnabled and host:IsMouseMotionEnabled(),'tooltip adds only motion input, no frames or click interception')
 fire(host,'OnEnter');assert(enters==1 and GameTooltip.text=='Hello' and GameTooltip.anchor=='ANCHOR_RIGHT')
 assert(GameTooltip.lines[1].text=='Details' and GameTooltip.lines[1].g==.2 and GameTooltip.wrap==true)
 fire(host,'OnLeave');assert(leaves==1 and not GameTooltip.shown,'native leave script is preserved')
 fire(host,'OnEnter');fire(host,'OnHide');assert(not GameTooltip.shown,'hiding the cell dismisses its tooltip')
 fire(host,'OnEnter');GameTooltip:SetOwner(UIParent,'ANCHOR_LEFT');GameTooltip:Show()
 fire(host,'OnLeave');assert(GameTooltip.shown,'late leave preserves another owner')
 API.Unmount(nil,host);assert(not host:IsMouseMotionEnabled(),'cleanup restores motion state')
 local hides=GameTooltip.hides;fire(host,'OnEnter');assert(GameTooltip.hides==hides and GameTooltip.owner==UIParent,'disposed hooks are inert')
 local route,value='SetSpellByID',635
 local forwarded=new(Tooltip,{show=function(_,tip,owner) assert(owner.attributes.type1=='spell');tip[route](tip,value) end})
 local button=API.Mount(nil,factory(nil,'secureButton',{width=20,height=20,action={type='spell',spell=635,unit='player'},decorations={tooltip=forwarded}}))
 local attrs=button.attributes;local motionChanges=button.motionChanges;combat=true
 for _,entry in ipairs({{'SetSpellByID',635},{'SetItemByID',5512},{'SetUnit','player'},{'SetHyperlink','spell:635'},{'SetAction',2}}) do
  route,value=entry[1],entry[2];fire(button,'OnEnter');assert(GameTooltip.route==route and GameTooltip.value==value);fire(button,'OnLeave')
 end
 assert(button.attributes==attrs and button.attributes.type1=='spell' and button.onClick==templateClick and button.motionChanges==motionChanges,'hover does not modify secure actions or motion settings')
 combat=false;forwarded:dispose();assert(button:IsMouseMotionEnabled(),'tooltip cleanup preserves original button motion state');API.Unmount(nil,button)
 local custom=nativeTooltip();local title='First'
 local dynamic=new(Tooltip,{target=function() return custom end,anchor='ANCHOR_LEFT',text=function() return title end})
 host=API.Mount(nil,factory(nil,'cell',{width=20,height=20,decorations={tooltip=dynamic}}))
 fire(host,'OnEnter');assert(custom.shown and custom.text=='First' and custom.anchor=='ANCHOR_LEFT')
 title='Second';fire(host,'OnLeave');fire(host,'OnEnter');assert(custom.text=='Second','text resolves on hover without polling')
 title=nil;fire(host,'OnEnter');assert(not custom.shown,'no content hides the tooltip')
 API.Unmount(nil,host)
 local skipped=new(Tooltip,{show=function() return false end})
 host=API.Mount(nil,factory(nil,'cell',{width=20,height=20,decorations={tooltip=skipped}}))
 fire(host,'OnEnter');assert(not GameTooltip.shown);API.Unmount(nil,host)
 local failed=new(Tooltip,{show=function() error('tooltip callback failed') end})
 host=API.Mount(nil,factory(nil,'cell',{width=20,height=20,decorations={tooltip=failed}}))
 assert(not pcall(fire,host,'OnEnter') and not GameTooltip.shown,'failed callbacks release tooltip ownership');API.Unmount(nil,host)
 GameTooltip=nil
 host=API.Mount(nil,factory(nil,'cell',{width=20,height=20,decorations={tooltip=new(Tooltip,{text='No API'})}}))
 fire(host,'OnEnter');API.Unmount(nil,host)
 GameTooltip=previousTooltip
end
