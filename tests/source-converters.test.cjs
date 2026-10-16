const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), os = require("node:os"), cp = require("node:child_process");

test("source converters transform and compose readable changes without polling or owning inputs", () => {
    const files = {};
    for (const name of ["DataSource", "SourceConverter", "MathExpression", "MathConverter"]) files[name + ".ts"] = fs.readFileSync(path.join(__dirname, "../src/datasources", name + ".ts"), "utf8");
    files["globals.d.ts"] = "declare function issecretvalue(this:void,value:unknown):boolean; declare function error(this:void,message:string):never; declare function assert(this:void,value:unknown,message?:string):void;";
    files["main.ts"] = `
import { DataSource } from "./DataSource";
import { SourceConverter, CaseConverter } from "./SourceConverter";
import { MathConverter } from "./MathConverter";
class Source<T> extends DataSource<T> {
    private listeners = new Set<(value:T)=>void>();
    public attached=0; public detached=0; public reads=0;
    constructor(value:T){super(value);}
    protected GetValue():T{this.reads++;return super.GetValue();}
    public Write(value:T,secret=false){this.SetValue(value,secret);for(const listener of this.listeners)listener(this.GetValue());}
    public onChange(listener:(value:T)=>void){this.attached++;this.listeners.add(listener);return()=>{this.detached++;this.listeners.delete(listener);};}
}
const input=new Source(4),math=new MathConverter(input,"2 * input + (3 - 1) / 2");
assert(math.Value===9 && input.attached===0,"readers never subscribe or poll");
let received=0,second=0;
const stop=math.BindTo(value=>{received=value;});
const stopSecond=math.onChange(()=>{second++;});
assert(received===9 && input.attached===1,"one shared upstream subscription");
input.Write(8);assert(received===17&&second===1);
input.Write(8);assert(second===1,"unchanged scalar outputs do not emit");
input.Write(10,true);assert(math.IsSecret()&&second===1,"secret inputs cannot reach computations");
let failed=false;try{math.Value;}catch{failed=true;}assert(failed);
input.Write(10);assert(received===21&&second===2,"public input resumes after restrictions");
stop();assert(input.detached===0);stopSecond();assert(input.detached===1);
const chained=new MathConverter(math,"input ^ 2");assert(chained.Value===441);
const chainStop=chained.onChange(()=>{});assert(input.attached===2);chained.Dispose();assert(input.detached===2);chainStop();
input.Write(3);assert(input.Value===3,"converters do not dispose shared input");
const classes=new Source<string|number|boolean>("PALADIN");
const paladin={r:1,g:.5,b:.7,a:1};
const colors=new CaseConverter(classes,[{equals:"PALADIN",value:paladin},{equals:"MAGE",value:{r:.4,g:.8,b:1,a:1}}],{r:.3,g:.3,b:.3,a:1});
assert(colors.Value===paladin);classes.Write("MAGE");assert(colors.Value!.b===1);classes.Write("UNKNOWN");assert(colors.Value!.r===.3);
const strict=new CaseConverter(classes,[{equals:1,value:"number"},{equals:"1",value:"string"},{equals:false,value:"boolean"}]);
classes.Write(1);assert(strict.Value==="number");classes.Write("1");assert(strict.Value==="string");classes.Write(false);assert(strict.Value==="boolean");classes.Write(true);assert(strict.Value===undefined);
failed=false;try{new CaseConverter(classes,[{equals:"same",value:1},{equals:"same",value:2}]);}catch{failed=true;}assert(failed);
let calls=0;
const aggregate=new Source({value:{secret:true}});
const checked=new SourceConverter(aggregate,()=>{calls++;return 1;});
assert(checked.IsSecret()&&calls===0,"nested restricted fields are blocked before conversion");
const filtered=new MathConverter(input,"input").When(value=>value>10);let emits=0;const unsubscribe=filtered.onChange(()=>{emits++;});
input.Write(5);assert(emits===0);input.Write(11);assert(emits===1);unsubscribe();
for(const [expression,expected] of [["-input ^ 2",-121],["2 ^ 3 ^ 2",512],["input % 4",3],["2 ** -2",.25],["1e2 + .5",100.5]] as const)assert(new MathConverter(input,expression).Value===expected,expression);
for(const expression of ["input / 0","input % 0","input ^ 10000","input +","math.random()","_G.input","input; print(1)","(".repeat(40)+"input"+")".repeat(40)]){
 failed=false;try{new MathConverter(input,expression).Value;}catch{failed=true;}assert(failed,"reject "+expression);
}
math.Dispose();failed=false;try{math.Value;}catch{failed=true;}assert(failed);
const leaf=new Source(1);let chain:DataSource<number>=leaf;
for(let i=0;i<20;i++)chain=new MathConverter(chain,"input+1");
leaf.reads=0;assert(chain.Value===21&&leaf.reads===1,"converter chains perform one leaf read");
leaf.Write(2,true);leaf.reads=0;let ran=false;const attempt=chain.TryCompute(()=>{ran=true;return 0;});
assert(!attempt.readable&&!ran&&leaf.reads===1,"restricted chains perform one leaf read and no computations");
export const passed=true;
`;
    const result = require("typescript-to-lua").transpileVirtualProject(files, { luaTarget: "5.1", luaLibImport: "inline", strict: true, types: [] });
    assert.deepEqual(result.diagnostics.map(d => String(d.messageText)), []);
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "wuira-converters-"));
    try {
        for (const file of result.transpiledFiles) fs.writeFileSync(path.join(temp, path.basename(file.outPath)), file.lua);
        fs.writeFileSync(path.join(temp, "check.lua"), 'function issecretvalue(value) return type(value)=="table" and rawget(value,"secret")==true end\nassert(require("main").passed)\n');
        const run = cp.spawnSync(process.execPath, [require.resolve("fengari-node-cli/src/lua-cli.js"), "check.lua"], { cwd: temp, encoding: "utf8" });
        assert.equal(run.status, 0, run.stdout + run.stderr); assert.equal(run.stderr, "");
    } finally { assert.equal(path.dirname(temp), path.resolve(os.tmpdir())); fs.rmSync(temp, { recursive: true, force: true }); }
});
