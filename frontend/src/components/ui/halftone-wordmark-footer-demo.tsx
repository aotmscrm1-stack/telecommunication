"use client"

import HalftoneWordmarkFooter from "@/components/ui/halftone-wordmark-footer"

export default function HalftoneWordmarkFooterDemo() {
  // w-full matters: 21st centres demos in a flex wrapper, and a flex item
  // left at width:auto shrinks the canvas to 0px wide.
  return (
    <div className="w-full">
      <HalftoneWordmarkFooter wordmark="CRM" label="AOTMS Telecom" meta="©2026 · Global Cloud Communications" />
    </div>
  )
}

