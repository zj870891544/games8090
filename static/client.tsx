import { hydrateRoot } from "react-dom/client";
import "@fontsource-variable/outfit";
import "@fontsource-variable/dm-sans";
import "../app/globals.css";
import "../app/arcade.css";
import { StaticApp, type PageData } from "./App";

const data = JSON.parse(
  document.getElementById("page-data")!.textContent!,
) as PageData;
hydrateRoot(document.getElementById("root")!, <StaticApp data={data} />);
