do
  local Layouts = __wuiraModules.require('datasources.EditModeLayouts').EditModeLayouts
  C_EditMode = nil
  local source = new(Layouts)
  assert(source.Status == 'unavailable' and #source.Layouts == 0)
  local data = { activeLayout=2, layouts={
    {layoutName='Modern',layoutType=0,interfaceStyle=1},
    {layoutName='Raid',layoutType=1}, {layoutName='Solo',layoutType=2}
  }}
  local reads,changes = 0,0
  C_EditMode = {GetLayouts=function(...) assert(select('#',...)==0);reads=reads+1;return data end}
  local stop=source:onChange(function(_,snapshot) changes=changes+1;assert(type(snapshot.layouts)=='table') end)
  emit('EDIT_MODE_LAYOUTS_UPDATED')
  assert(source.Status=='ready' and source.Active.index==2 and source.Active.key=='1::Raid' and changes==1)
  local key=source.Active.key
  local detached=source.Value;detached.layouts[2].name='Changed';detached.active.name='Changed'
  assert(source.Active.name=='Raid' and source.Layouts[2].name=='Raid','native snapshot is detached')
  local payload={activeLayout=3,layouts=data.layouts}
  local before=reads;emit('EDIT_MODE_LAYOUTS_UPDATED',payload)
  assert(source.Active.name=='Solo' and reads==before,'event payload is authoritative without another API read')
  emit('EDIT_MODE_LAYOUTS_UPDATED',data);changes=1
  local before=reads;local value=source.Value;value=source.Value
  assert(reads==before,'getters do not poll the API')
  emit('EDIT_MODE_LAYOUTS_UPDATED');assert(changes==1,'unchanged events do not emit')
  table.remove(data.layouts,1);data.activeLayout=1;emit('EDIT_MODE_LAYOUTS_UPDATED')
  assert(source.Active.index==1 and source.Active.key==key and changes==2,'key survives index shifts')
  data.layouts[1].layoutName='Raid renamed';emit('EDIT_MODE_LAYOUTS_UPDATED')
  assert(source.Active.key~=key,'renames require explicit rebinding')
  data.activeLayout=2;emit('PLAYER_SPECIALIZATION_CHANGED');assert(source.Active.name=='Solo')
  data.activeLayout={secret=true};emit('EDIT_MODE_LAYOUTS_UPDATED')
  assert(source.Status=='restricted' and source:IsSecret() and not pcall(function() return source.Value end))
  C_EditMode=nil;emit('PLAYER_ENTERING_WORLD')
  assert(source.Status=='unavailable' and source.Active==nil,'missing API clears stale selection')
  stop();before=changes
  C_EditMode={GetLayouts=function() return {activeLayout=1,layouts={{layoutName='Raid',layoutType=1}}} end}
  emit('EDIT_MODE_LAYOUTS_UPDATED');assert(changes==before,'unsubscribe stops callbacks')
  source:Dispose();source:Dispose();before=reads;emit('EDIT_MODE_LAYOUTS_UPDATED');assert(reads==before)
  assert(not pcall(function() source:onChange(function() end) end),'disposed source rejects subscriptions')
  C_EditMode=nil
end
