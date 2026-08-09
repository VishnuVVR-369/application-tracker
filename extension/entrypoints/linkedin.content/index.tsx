import * as React from "react"
import { createRoot, type Root } from "react-dom/client"
import { browser } from "wxt/browser"

import styles from "./style.css?inline"
import { CaptureApp } from "./App"
import type { ContentMessage } from "../../lib/types"

const HOST_ID = "way2more-linkedin-capture"
const ACTION_SELECTORS = [
  ".jobs-s-apply",
  ".jobs-apply-button--top-card",
  ".job-details-jobs-unified-top-card__primary-actions",
  ".jobs-unified-top-card__content--two-pane",
]

function findActionAnchor() {
  for (const selector of ACTION_SELECTORS) {
    const element = document.querySelector<HTMLElement>(selector)
    if (element) return element
  }
  return null
}

export default defineContentScript({
  matches: ["https://www.linkedin.com/jobs/*"],
  runAt: "document_idle",
  main(ctx) {
    let host: HTMLElement | null = null
    let root: Root | null = null
    let openCapture: () => void = () => {}
    let currentUrl = location.href
    let renderKey = currentUrl
    let repositionTimer: number | undefined

    const registerOpen = (open: () => void) => {
      openCapture = open
    }

    function render() {
      if (!host) return
      if (!root) root = createRoot(host.shadowRoot!.querySelector("#way2more-root")!)
      root.render(<CaptureApp key={renderKey} registerOpen={registerOpen} />)
    }

    function ensureHost() {
      const anchor = findActionAnchor()
      if (!host) {
        host = document.createElement("div")
        host.id = HOST_ID
        const shadow = host.attachShadow({ mode: "open" })
        const style = document.createElement("style")
        style.textContent = styles
        const container = document.createElement("div")
        container.id = "way2more-root"
        shadow.append(style, container)
      }

      if (anchor) {
        host.dataset.position = "inline"
        if (host.previousElementSibling !== anchor) anchor.insertAdjacentElement("afterend", host)
      } else if (!host.isConnected || host.parentElement !== document.body) {
        host.dataset.position = "floating"
        document.body.append(host)
      }
      render()
    }

    function scheduleReposition() {
      if (repositionTimer !== undefined) return
      repositionTimer = window.setTimeout(() => {
        repositionTimer = undefined
        if (location.href !== currentUrl) {
          currentUrl = location.href
          renderKey = currentUrl
        }
        ensureHost()
      }, 250)
    }

    ensureHost()
    const observer = new MutationObserver(scheduleReposition)
    observer.observe(document.documentElement, { childList: true, subtree: true })
    const locationTimer = window.setInterval(scheduleReposition, 750)
    const messageListener = (message: unknown) => {
      if ((message as ContentMessage | undefined)?.type === "open-capture") {
        openCapture()
        return Promise.resolve({ opened: true })
      }
      return undefined
    }
    browser.runtime.onMessage.addListener(messageListener)

    ctx.onInvalidated(() => {
      observer.disconnect()
      window.clearInterval(locationTimer)
      if (repositionTimer !== undefined) window.clearTimeout(repositionTimer)
      browser.runtime.onMessage.removeListener(messageListener)
      root?.unmount()
      host?.remove()
    })
  },
})
