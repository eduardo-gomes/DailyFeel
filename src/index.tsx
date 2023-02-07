import "./style.css";
import { hydrate } from "solid-js/web";
import Journal from "./components/journal";

hydrate(() => <Journal/>, document);