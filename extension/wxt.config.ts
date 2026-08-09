import { defineConfig } from "wxt"

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Way2More LinkedIn Capture",
    short_name: "Way2More",
    description: "Review and save LinkedIn jobs to your Way2More application tracker.",
    minimum_chrome_version: "120",
    permissions: ["activeTab", "storage"],
    host_permissions: [
      "https://www.linkedin.com/*",
      "https://way2more.vercel.app/*",
      "http://localhost:3000/*"
    ],
    action: {
      default_title: "Add LinkedIn job to Way2More"
    }
  }
})
