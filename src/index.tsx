import "./style.css";
import { render } from "solid-js/web";
import Journal from "./components/journal";

render(() => <Journal/>, document.getElementById("App") as HTMLDivElement);