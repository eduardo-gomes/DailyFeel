import "./style.css";
import { render } from "solid-js/web";
import Journal from "./journal";

render(() => <Journal/>, document.getElementById("App") as HTMLDivElement);