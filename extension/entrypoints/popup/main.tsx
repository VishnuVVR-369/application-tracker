import * as React from "react"
import { createRoot } from "react-dom/client"

import "../../assets/ui.css"
import { PopupApp } from "./PopupApp"

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>
)
