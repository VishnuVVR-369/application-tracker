import * as React from "react"
import { createRoot } from "react-dom/client"

import "../../assets/ui.css"
import { OptionsApp } from "./OptionsApp"

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <OptionsApp />
  </React.StrictMode>
)
