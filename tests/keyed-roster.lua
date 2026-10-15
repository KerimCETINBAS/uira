do
  local saved = {}
  local names = {'InCombatLockdown','UnitHealth','UnitHealthMax','UnitHealthPercent',
    'IsInRaid','GetNumGroupMembers','UnitGUID','UnitFullName','UnitExists','GetRaidRosterInfo'}
  for _,name in ipairs(names) do saved[name] = _G[name] end
  local locked = false
  InCombatLockdown = function() return locked end
  local health = {party1=30,party2=70,party3=90}
  UnitHealth = function(unit) return health[unit] end
  UnitHealthMax = function() return 100 end
  UnitHealthPercent = function(unit) return health[unit] end
  local Each = __wuiraModules.require('ui.ForEach').ForEach
  local UnitSource = __wuiraModules.require('datasources.UnitSource').UnitSource
  local HP = __wuiraModules.require('datasources.Resources').HP
  local observer,stops,created,disposed = nil,0,0,0
  local source = {Value={{key='A',unit='party1'},{key='B',unit='party2'}}}
  function source:onChange(listener)
    observer=listener
    return function() observer=nil;stops=stops+1 end
  end
  local records,refs = {},{}
  local view = factory(nil,Each,{
    items=source,key=function(_,item) return item.key end,wrapAfter=2,gap=2,lineGap=4,
    onUpdate=function(_,view,item) refs[view].unit:Retarget(item.unit) end,
    onDispose=function(_,view) disposed=disposed+1;refs[view]=nil end
  },function(_,item)
    created=created+1
    local record={unit=new(UnitSource,item.unit)}
    record.hp=new(HP,record.unit)
    local view=factory(nil,'progress',{width=40,height=10,source=record.hp,
      onMount=function(_,frame) record.frame=frame end})
    records[item.key]=record;refs[view]=record
    return view
  end)
  local root=API.Mount(nil,view)
  local a,b=records.A,records.B
  assert(created==2 and root.width==40 and root.height==22)
  assert(a.frame.value==30 and b.frame.value==70 and b.frame.y==-12)
  local allocated=#nativeFrames
  local function update(items)
    source.Value=items;observer(nil,items)
  end
  health.party1,health.party2=75,35
  update({{key='B',unit='party1'},{key='A',unit='party2'}})
  assert(records.A==a and records.B==b and #nativeFrames==allocated and created==2)
  assert(a.frame.y==-12 and b.frame.y==0 and a.frame.value==35 and b.frame.value==75)
  health.party2=45;emit('UNIT_HEALTH','party1')
  assert(a.frame.value==35,'old token must not refresh a retargeted resource')
  emit('UNIT_HEALTH','party2');assert(a.frame.value==45)
  health.party2=0;emit('UNIT_CONNECTION','party2')
  health.party2=50;emit('UNIT_CONNECTION','party2')
  assert(a.frame.value==50 and #nativeFrames==allocated,'connection changes retain subscriptions')
  update({{key='B',unit='party1'},{key='A',unit='party2'},{key='C',unit='party3'}})
  assert(created==3 and root.width==84 and records.C.frame.x==44)
  local c=records.C
  locked=true
  update({{key='A',unit='party1'},{key='C',unit='party2'}})
  assert(created==3 and disposed==0 and b.frame.shown and a.unit.Token=='party2')
  assert(not pcall(function() a.unit:Retarget('party1') end),'retarget must wait for combat')
  locked=false;emit('PLAYER_REGEN_ENABLED')
  assert(disposed==1 and not b.frame.shown and a.unit.Token=='party1' and c.unit.Token=='party2')
  assert(records.A==a and records.C==c and root.width==40)
  assert(not pcall(update,{{key='A',unit='party1'},{key='A',unit='party2'}}),'duplicate keys rejected')
  API.Unmount(nil,root)
  assert(stops==1 and observer==nil and disposed==3 and not a.frame.shown and not c.frame.shown)

  local Roster = __wuiraModules.require('datasources.GroupRoster').GroupRoster
  local raid,count=false,2
  local data={player={'P','Player','Realm'},party1={'A','Member','Realm'},pet={'PET','Pet','Realm'}}
  IsInRaid=function() return raid end
  GetNumGroupMembers=function() return count end
  UnitGUID=function(unit) return data[unit] and data[unit][1] end
  UnitFullName=function(unit) local value=data[unit];if value then return value[2],value[3] end end
  UnitExists=function(unit) return data[unit]~=nil end
  local roster=new(Roster,'party',{pets=true,includeSelfWhenSolo=true})
  local first=roster.Value
  assert(#first==3 and first[2].key=='guid:A' and first[3].pet and first[3].unit=='pet')
  data.party1[1]=nil
  assert(roster.Value[2].key=='guid:A','offline GUID fallback keeps the known identity')
  count={secret=true}
  assert(roster.Value[2].key=='guid:A' and roster.Status=='restricted','retain last readable roster')
  count=0
  assert(#roster.Value==2 and roster.Status=='ready','solo fallback includes only real units and pets')
  local changes=0
  local stop=roster:onChange(function(_,items) changes=changes+1;assert(#items==3) end)
  count=2;emit('GROUP_ROSTER_UPDATE');assert(changes==1)
  stop();emit('UNIT_CONNECTION','party1');assert(changes==1)
  roster:Dispose()
  raid,count=true,2
  data.raid1={'A','First','Realm'};data.raid2={'B','Second','Realm'}
  GetRaidRosterInfo=function(index) return data['raid'..index][2],0,index==1 and 2 or 1 end
  local raidRoster=new(Roster,'raid')
  assert(raidRoster.Value[1].unit=='raid2' and raidRoster.Value[1].group=='1')
  raidRoster:Dispose()
  for _,name in ipairs(names) do _G[name] = saved[name] end
end
