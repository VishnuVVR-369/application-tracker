import { defineApp } from "convex/server"
import workpool from "@convex-dev/workpool/convex.config"

import betterAuth from "./betterAuth/convex.config"

const app = defineApp()

app.use(betterAuth)
// Model work for collected jobs (reading postings, scoring, suggesting) so a batch never floods OpenAI.
app.use(workpool, { name: "jobsPool" })

export default app
