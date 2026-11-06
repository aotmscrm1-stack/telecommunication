"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

const defaultMessages = [
  'Received: "Inbound call from +91 98480... routed to AI Telecaller"',
  "Carrier handshake: Airtel SIP Trunk verified (latency 42ms)",
  "Real-time ASR: Telugu speech transcribed → 412 tokens stream",
  "Semantic qualification: Buyer intent 0.94 (High Priority Lead)",
  "LLM inference: 3 automated actions dispatched in parallel",
  "Tool: update_crm → Lead stage updated to 'Hot Lead - Site Visit'",
  "Tool: send_whatsapp → Quotation PDF & Location Pin dispatched",
  "Tool: notify_agent → Telecaller assigned via weighted round-robin",
  "Workflow complete. 3 actions dispatched in 310ms.",
  "Idle. Listening for next inbound call or Meta lead trigger...",
]

function AnimatedDot({
  path,
  duration,
  delay,
  size,
  opacity,
}: {
  path: string
  duration: number
  delay: number
  size: number
  opacity: number
}) {
  return (
    <circle r={size} fill="#0052FF" opacity={opacity}>
      <animateMotion
        dur={`${duration}s`}
        repeatCount="indefinite"
        begin={`${delay}s`}
        path={path}
      />
    </circle>
  )
}

function PulsingDot({
  cx,
  cy,
  color,
  duration,
  delay = 0,
}: {
  cx: number
  cy: number
  color: string
  duration: number
  delay?: number
}) {
  return (
    <motion.circle
      cx={cx}
      cy={cy}
      r={2.8}
      fill={color}
      animate={{ opacity: [0.15, 1, 0.15] }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  )
}

function StatusIndicator({
  cx,
  cy,
  color,
  pulsing = false,
  duration = 1.9,
  delay = 0,
}: {
  cx: number
  cy: number
  color: string
  pulsing?: boolean
  duration?: number
  delay?: number
}) {
  if (pulsing) {
    return (
      <motion.circle
        cx={cx}
        cy={cy}
        r={3}
        fill={color}
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{
          duration,
          delay,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    )
  }
  return <circle cx={cx} cy={cy} r={3} fill={color} opacity={0.95} />
}

export interface EnterpriseAIPipelineProps {
  className?: string
  messages?: string[]
  liveTag?: string
  statsTag?: string
  nodeLabels?: {
    triggerCategory?: string
    triggerTitle?: string
    triggerSub?: string
    vectorCategory?: string
    vectorTitle?: string
    vectorSub?: string
    llmCategory?: string
    llmTitle?: string
    llmSub?: string
    out1Title?: string
    out2Title?: string
    out3Title?: string
  }
  stackInfo?: string
}

export default function EnterpriseAIPipeline({
  className = "",
  messages = defaultMessages,
  liveTag = "AGENT PIPELINE · LIVE",
  statsTag = "3 agents · 0 errors",
  nodeLabels = {
    triggerCategory: "TRIGGER",
    triggerTitle: "Inbound Lead",
    triggerSub: "meta-webhook",
    vectorCategory: "SEMANTIC AI",
    vectorTitle: "Lead Scoring",
    vectorSub: "pinecone-v2",
    llmCategory: "AI TELECALLER",
    llmTitle: "Conversing",
    llmSub: "gemini-2.0-flash",
    out1Title: "WhatsApp Quote",
    out2Title: "CRM Stage Update",
    out3Title: "Agent Dispatch",
  },
  stackInfo = "AOTMS AI · Telecom SIP",
}: EnterpriseAIPipelineProps) {
  const [messageIndex, setMessageIndex] = useState(0)
  const [workflows, setWorkflows] = useState(14820)

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length)
    }, 2700)

    const workflowInterval = setInterval(() => {
      setWorkflows((prev) => prev + 1)
    }, 5400)

    return () => {
      clearInterval(messageInterval)
      clearInterval(workflowInterval)
    }
  }, [messages.length])

  const paths = {
    p1: "M116,88 L158,88",
    p2: "M268,88 L306,88",
    p3: "M411,88 C425,88 435,50 448,50",
    p4: "M411,88 L448,88",
    p5: "M411,88 C425,88 435,126 448,126",
  }

  return (
    <div
      className={`bg-[#090909] border border-white/[0.08] rounded-[16px] overflow-hidden font-sans w-full max-w-[640px] mx-auto shadow-2xl ${className}`}
    >
      {/* Header */}
      <div className="px-[18px] py-[11px] border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-[7px]">
          <motion.span
            className="w-[6px] h-[6px] rounded-full bg-green-500 inline-block"
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="text-[10px] text-white/40 tracking-[0.1em] font-mono font-medium">
            {liveTag}
          </span>
        </div>
        <span className="text-[10px] text-white/[0.28] font-mono">
          {statsTag}
        </span>
      </div>

      {/* SVG Pipeline Visualization */}
      <div className="w-full px-2 py-1 overflow-x-auto">
        <svg
          viewBox="0 0 580 172"
          className="w-full h-auto block min-w-[500px]"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <marker
              id="ma"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto"
            >
              <path
                d="M2 1.5L7.5 5L2 8.5"
                fill="none"
                stroke="rgba(0,82,255,0.55)"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </marker>
          </defs>

          {/* Connection Paths */}
          <path
            d={paths.p1}
            fill="none"
            stroke="rgba(0,82,255,0.30)"
            strokeWidth="1.5"
            strokeDasharray="3 5"
            markerEnd="url(#ma)"
          />
          <path
            d={paths.p2}
            fill="none"
            stroke="rgba(0,82,255,0.30)"
            strokeWidth="1.5"
            strokeDasharray="3 5"
            markerEnd="url(#ma)"
          />
          <path
            d={paths.p3}
            fill="none"
            stroke="rgba(0,82,255,0.22)"
            strokeWidth="1.5"
            strokeDasharray="3 5"
          />
          <path
            d={paths.p4}
            fill="none"
            stroke="rgba(0,82,255,0.22)"
            strokeWidth="1.5"
            strokeDasharray="3 5"
          />
          <path
            d={paths.p5}
            fill="none"
            stroke="rgba(0,82,255,0.22)"
            strokeWidth="1.5"
            strokeDasharray="3 5"
          />

          {/* Animated dots along paths */}
          <AnimatedDot path={paths.p1} duration={1.05} delay={0} size={2.5} opacity={1} />
          <AnimatedDot path={paths.p1} duration={1.05} delay={0.35} size={1.8} opacity={0.65} />
          <AnimatedDot path={paths.p1} duration={1.05} delay={0.7} size={1.3} opacity={0.35} />

          <AnimatedDot path={paths.p2} duration={0.88} delay={0.18} size={2.5} opacity={1} />
          <AnimatedDot path={paths.p2} duration={0.88} delay={0.62} size={1.8} opacity={0.65} />

          <AnimatedDot path={paths.p3} duration={1.3} delay={0.08} size={2.2} opacity={0.9} />
          <AnimatedDot path={paths.p3} duration={1.3} delay={0.65} size={1.5} opacity={0.55} />

          <AnimatedDot path={paths.p4} duration={1.15} delay={0.28} size={2.2} opacity={0.9} />
          <AnimatedDot path={paths.p4} duration={1.15} delay={0.85} size={1.5} opacity={0.55} />

          <AnimatedDot path={paths.p5} duration={1.4} delay={0.45} size={2.2} opacity={0.9} />
          <AnimatedDot path={paths.p5} duration={1.4} delay={1.0} size={1.5} opacity={0.55} />

          {/* Trigger Node */}
          <rect
            x="16"
            y="66"
            width="100"
            height="44"
            rx="8"
            fill="#141414"
            stroke="rgba(255,255,255,0.09)"
            strokeWidth="0.5"
          />
          <text
            x="66"
            y="83"
            textAnchor="middle"
            fontSize="9.5"
            fill="rgba(255,255,255,0.38)"
            fontFamily="system-ui"
            letterSpacing=".07em"
            fontWeight="600"
          >
            {nodeLabels.triggerCategory}
          </text>
          <text
            x="66"
            y="100"
            textAnchor="middle"
            fontSize="12"
            fill="rgba(255,255,255,0.92)"
            fontFamily="system-ui"
            fontWeight="500"
          >
            {nodeLabels.triggerTitle}
          </text>
          <text
            x="66"
            y="122"
            textAnchor="middle"
            fontSize="8.5"
            fill="rgba(255,255,255,0.28)"
            fontFamily="monospace"
          >
            {nodeLabels.triggerSub}
          </text>

          {/* Vector DB Node */}
          <rect
            x="158"
            y="66"
            width="110"
            height="44"
            rx="8"
            fill="#141414"
            stroke="rgba(255,255,255,0.09)"
            strokeWidth="0.5"
          />
          <text
            x="213"
            y="83"
            textAnchor="middle"
            fontSize="9.5"
            fill="rgba(255,255,255,0.38)"
            fontFamily="system-ui"
            letterSpacing=".07em"
            fontWeight="600"
          >
            {nodeLabels.vectorCategory}
          </text>
          <text
            x="213"
            y="100"
            textAnchor="middle"
            fontSize="12"
            fill="rgba(255,255,255,0.92)"
            fontFamily="system-ui"
            fontWeight="500"
          >
            {nodeLabels.vectorTitle}
          </text>
          <text
            x="213"
            y="122"
            textAnchor="middle"
            fontSize="8.5"
            fill="rgba(255,255,255,0.28)"
            fontFamily="monospace"
          >
            {nodeLabels.vectorSub}
          </text>

          {/* LLM Agent Node */}
          <rect
            x="306"
            y="53"
            width="105"
            height="70"
            rx="10"
            fill="#050D1C"
            stroke="#0052FF"
            strokeWidth="1.2"
          />
          <rect x="318" y="53.5" width="80" height="1" rx="0.5" fill="rgba(51,117,255,0.6)" />
          <text
            x="358"
            y="78"
            textAnchor="middle"
            fontSize="9.5"
            fill="rgba(51,117,255,0.85)"
            fontFamily="system-ui"
            letterSpacing=".07em"
            fontWeight="700"
          >
            {nodeLabels.llmCategory}
          </text>
          <text
            x="358"
            y="97"
            textAnchor="middle"
            fontSize="13"
            fill="#fff"
            fontFamily="system-ui"
            fontWeight="600"
          >
            {nodeLabels.llmTitle}
          </text>
          <PulsingDot cx={346} cy={113} color="#0052FF" duration={1.2} delay={0} />
          <PulsingDot cx={358} cy={113} color="#0052FF" duration={1.2} delay={0.4} />
          <PulsingDot cx={370} cy={113} color="#0052FF" duration={1.2} delay={0.8} />
          <text
            x="358"
            y="139"
            textAnchor="middle"
            fontSize="8.5"
            fill="rgba(0,82,255,0.6)"
            fontFamily="monospace"
          >
            {nodeLabels.llmSub}
          </text>

          {/* Output Nodes */}
          <rect
            x="448"
            y="35"
            width="116"
            height="30"
            rx="7"
            fill="#111"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="0.5"
          />
          <text
            x="490"
            y="53.5"
            textAnchor="middle"
            fontSize="11"
            fill="rgba(255,255,255,0.8)"
            fontFamily="system-ui"
            fontWeight="500"
          >
            {nodeLabels.out1Title}
          </text>
          <StatusIndicator cx={550} cy={43} color="#22c55e" />

          <rect
            x="448"
            y="73"
            width="116"
            height="30"
            rx="7"
            fill="#111"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="0.5"
          />
          <text
            x="490"
            y="91.5"
            textAnchor="middle"
            fontSize="11"
            fill="rgba(255,255,255,0.8)"
            fontFamily="system-ui"
            fontWeight="500"
          >
            {nodeLabels.out2Title}
          </text>
          <StatusIndicator cx={550} cy={81} color="#f59e0b" pulsing duration={1.9} />

          <rect
            x="448"
            y="111"
            width="116"
            height="30"
            rx="7"
            fill="#111"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="0.5"
          />
          <text
            x="490"
            y="129.5"
            textAnchor="middle"
            fontSize="11"
            fill="rgba(255,255,255,0.8)"
            fontFamily="system-ui"
            fontWeight="500"
          >
            {nodeLabels.out3Title}
          </text>
          <StatusIndicator cx={550} cy={119} color="#22c55e" pulsing duration={2.2} delay={0.35} />
        </svg>
      </div>

      {/* Message Display */}
      <div className="border-t border-white/[0.06] px-[18px] py-[9px] h-[52px]">
        <div className="flex gap-2 items-start h-full">
          <span className="text-[#0052FF] font-mono text-[13px] leading-[1.5] shrink-0 font-bold">
            ›
          </span>
          <div className="relative flex-1 overflow-hidden h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={messageIndex}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.25 }}
                className="font-mono text-[11px] text-white/[0.65] leading-[1.55] absolute inset-0 truncate"
              >
                {messages[messageIndex]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="border-t border-white/[0.06] px-[18px] py-[10px] flex gap-[18px] md:gap-[26px] items-center flex-wrap">
        <div>
          <div className="text-[9px] text-white/30 tracking-[0.09em] mb-[3px] font-semibold">
            WORKFLOWS
          </div>
          <motion.div
            key={workflows}
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            className="text-[15px] md:text-[16px] text-white/[0.85] font-mono font-medium"
          >
            {workflows.toLocaleString()}
          </motion.div>
        </div>
        <div>
          <div className="text-[9px] text-white/30 tracking-[0.09em] mb-[3px] font-semibold">
            CALL TOKENS
          </div>
          <div className="text-[15px] md:text-[16px] text-white/[0.85] font-mono font-medium">
            4.2M
          </div>
        </div>
        <div>
          <div className="text-[9px] text-white/30 tracking-[0.09em] mb-[3px] font-semibold">
            AVG LATENCY
          </div>
          <div className="text-[15px] md:text-[16px] text-white/[0.85] font-mono font-medium">
            310ms
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[9px] text-white/[0.28] tracking-[0.09em] mb-[3px] font-semibold">
            ENGINE
          </div>
          <div className="text-[10px] text-[#3375ff] font-mono font-medium">
            {stackInfo}
          </div>
        </div>
      </div>
    </div>
  )
}

