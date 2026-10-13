import "wuira/console-polyfill";
import { UI, wuira } from "wuira";

function App() {
    console.log("{{addonName}} loaded");
    return <></>;
}

wuira.Mount(App);
