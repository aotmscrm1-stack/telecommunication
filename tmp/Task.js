import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate, useLocation, useParams } from "react-router-dom";
import { followupsAPI, leadsAPI, usersAPI, departmentsAPI } from "../../../services/api";
import { useAuth } from "../../../context/AuthContext";
import { formatISTDateTime, formatISTDate } from "../../../utils/dateFormat";
import { isExecutive, isHR, isTrainer, isDigitalMarketing, isLimitedStaff, isDeveloper, getTaskAssigneeOptions, getTaskAssignorOptions, filterTeamDropdownUsers } from "../../../utils/permissions";
import TodoList from "./TodoList";
const COLOR_DEEP_BLUE = "#023047";
const COLOR_BLUE_GREEN = "#219ebc";
const COLOR_SKY_LIGHT = "#8ecae6";
const COLOR_SKY_SURFACE = "#e8f4fa";
const COLOR_BORDER = "#bbdff0";
const COLOR_AMBER = "#ffb703";
const COLOR_ORANGE = "#fb8500";
const COLOR_MUTED = "#5b7082";
const STATUS_CONFIG = {
  upcoming: { bg: "#e8f4fa", text: "#145d70", border: "#bbdff0", label: "Upcoming" },
  pending: { bg: "#e8f4fa", text: "#145d70", border: "#bbdff0", label: "Upcoming" },
  done: { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0", label: "Done" },
  late: { bg: "#fef2f2", text: "#991b1b", border: "#fecaca", label: "Late" },
  cancelled: { bg: "#f1f5f9", text: "#64748b", border: "#e2e8f0", label: "Cancelled" },
  locked: { bg: "#fffbeb", text: "#92400e", border: "#fde68a", label: "Locked" }
};
const PRIORITY_CONFIG = {
  high: { bg: "#fef2f2", text: "#991b1b", border: "#fecaca", dot: "#ef4444" },
  medium: { bg: "#fffbeb", text: "#92400e", border: "#fde68a", dot: "#f59e0b" },
  low: { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0", dot: "#10b981" }
};
function isTaskLocked(scheduledAt) {
  if (!scheduledAt) return false;
  const endOfToday = /* @__PURE__ */ new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return new Date(scheduledAt) > endOfToday;
}
function isTodayDate(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = /* @__PURE__ */ new Date();
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
}
function TimeInput12h({ value, onChange }) {
  const [hh24, mm] = value ? value.split(":") : ["09", "00"];
  const hh24Num = parseInt(hh24, 10) || 0;
  const period = hh24Num >= 12 ? "PM" : "AM";
  let hh12 = hh24Num % 12;
  if (hh12 === 0) hh12 = 12;
  const commit = (newHh12, newMm, newPeriod) => {
    let h = parseInt(newHh12, 10) % 12;
    if (newPeriod === "PM") h += 12;
    const hhStr = String(h).padStart(2, "0");
    const mmStr = String(newMm).padStart(2, "0");
    onChange(`${hhStr}:${mmStr}`);
  };
  const selectStyle = {
    border: `1px solid ${COLOR_BORDER}`,
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 14,
    fontWeight: 400,
    outline: "none",
    background: "#fff",
    color: COLOR_DEEP_BLUE,
    cursor: "pointer"
  };
  return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, alignItems: "center" } }, /* @__PURE__ */ React.createElement(
    "select",
    {
      value: hh12,
      onChange: (e) => commit(e.target.value, mm, period),
      style: { ...selectStyle, width: 64 }
    },
    Array.from({ length: 12 }, (_, i) => i + 1).map((h) => /* @__PURE__ */ React.createElement("option", { key: h, value: h }, String(h).padStart(2, "0")))
  ), /* @__PURE__ */ React.createElement("span", { style: { color: COLOR_MUTED, fontWeight: 500, fontSize: 15 } }, ":"), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: mm,
      onChange: (e) => commit(hh12, e.target.value, period),
      style: { ...selectStyle, width: 64 }
    },
    Array.from({ length: 60 }, (_, i) => i).map((m) => /* @__PURE__ */ React.createElement("option", { key: m, value: String(m).padStart(2, "0") }, String(m).padStart(2, "0")))
  ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, overflow: "hidden" } }, ["AM", "PM"].map((p) => /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      key: p,
      onClick: () => commit(hh12, mm, p),
      style: {
        border: "none",
        padding: "8px 12px",
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        background: period === p ? COLOR_BLUE_GREEN : "#fff",
        color: period === p ? "#fff" : COLOR_DEEP_BLUE,
        transition: "all 0.15s ease"
      }
    },
    p
  ))));
}
function handleNumericKeyDown(e, value, setValue) {
  if (e.key === "Enter") {
    e.preventDefault();
    const target = e.target;
    const cursor = target.selectionStart || value.length;
    const beforeCursor = value.slice(0, cursor);
    const afterCursor = value.slice(cursor);
    const lines = beforeCursor.split("\n");
    const currentLine = lines[lines.length - 1];
    const match = currentLine.match(/^(\d+)[\.\)]\s*(.*)/);
    if (match) {
      const num = parseInt(match[1], 10);
      const content = match[2];
      if (!content.trim() && lines.length > 1) {
        lines[lines.length - 1] = "";
        const newText2 = lines.join("\n") + afterCursor;
        setValue(newText2);
        return;
      }
      const nextNum = num + 1;
      const newLinePrefix = `
${nextNum}. `;
      const newText = beforeCursor + newLinePrefix + afterCursor;
      setValue(newText);
      setTimeout(() => {
        if (target) {
          const newPos = cursor + newLinePrefix.length;
          target.setSelectionRange(newPos, newPos);
        }
      }, 0);
      return;
    }
  }
}
function FormattedDescription({ text, task }) {
  if (!text || !text.trim()) return /* @__PURE__ */ React.createElement("span", { style: { color: "#94a3b8", fontStyle: "italic" } }, "No description provided");
  const rawLines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const isNumbered = rawLines.length > 0 && rawLines.some((l) => /^\d+[\.\)]\s*/.test(l) || /^[\-\*•]\s*/.test(l));
  const [checkedMap, setCheckedMap] = useState(() => {
    const initial = {};
    if (task?.checklist && Array.isArray(task.checklist) && task.checklist.length > 0) {
      task.checklist.forEach((item, idx) => {
        if (item.completed) initial[idx] = true;
      });
    }
    return initial;
  });
  const handleToggle = async (targetIdx, e) => {
    e.stopPropagation();
    const nextState = !checkedMap[targetIdx];
    const newCheckedMap = { ...checkedMap, [targetIdx]: nextState };
    setCheckedMap(newCheckedMap);
    if (task?._id) {
      try {
        const updatedChecklist = rawLines.map((line, idx) => {
          const cleanText = line.replace(/^(\d+[\.\)]|[\-\*•])\s*/, "");
          const isChecked = !!newCheckedMap[idx];
          return {
            title: cleanText || line,
            completed: isChecked,
            completedAt: isChecked ? (/* @__PURE__ */ new Date()).toISOString() : null
          };
        });
        await followupsAPI.update(task._id, { checklist: updatedChecklist });
      } catch (err) {
        console.error("Failed to save checklist item state:", err);
      }
    }
  };
  if (isNumbered || rawLines.length > 1) {
    const total = rawLines.length;
    const checkedCount = Object.keys(checkedMap).filter((k) => checkedMap[k]).length;
    const percent = total > 0 ? Math.round(checkedCount / total * 100) : 0;
    const hasScroll = total > 2;
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8, width: "100%" } }, /* @__PURE__ */ React.createElement("style", null, `
          .custom-hidden-scroll::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }
        `), /* @__PURE__ */ React.createElement("div", { style: {
      background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
      borderRadius: 10,
      padding: "8px 12px",
      border: "1px solid #e2e8f0",
      boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
    } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, color: "#334155", fontWeight: 600, marginBottom: 5 } }, /* @__PURE__ */ React.createElement("span", { style: { display: "flex", alignItems: "center", gap: 5, color: COLOR_DEEP_BLUE } }, /* @__PURE__ */ React.createElement("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: COLOR_BLUE_GREEN, strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("line", { x1: "18", y1: "20", x2: "18", y2: "10" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "20", x2: "12", y2: "4" }), /* @__PURE__ */ React.createElement("line", { x1: "6", y1: "20", x2: "6", y2: "14" })), "Sub-task Progress"), /* @__PURE__ */ React.createElement("span", { style: {
      fontSize: 10.5,
      fontWeight: 700,
      background: percent === 100 ? "#d1fae5" : "#e0f2fe",
      color: percent === 100 ? "#047857" : "#0369a1",
      padding: "2px 8px",
      borderRadius: 12,
      border: `1px solid ${percent === 100 ? "#a7f3d0" : "#bae6fd"}`
    } }, checkedCount, " of ", total, " (", percent, "% Completed)")), /* @__PURE__ */ React.createElement("div", { style: { width: "100%", height: 7, background: "#cbd5e1", borderRadius: 4, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: {
      width: `${percent}%`,
      height: "100%",
      background: percent === 100 ? "linear-gradient(90deg, #10b981 0%, #059669 100%)" : "linear-gradient(90deg, #219ebc 0%, #fb8500 100%)",
      borderRadius: 4,
      transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      boxShadow: percent > 0 ? "0 1px 4px rgba(251, 133, 0, 0.3)" : "none"
    } }))), /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "custom-hidden-scroll",
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 6,
          maxHeight: hasScroll ? 80 : "none",
          overflowY: hasScroll ? "auto" : "visible",
          paddingRight: hasScroll ? 2 : 0,
          scrollBehavior: "smooth",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch"
        }
      },
      rawLines.map((line, idx) => {
        const cleanText = line.replace(/^(\d+[\.\)]|[\-\*•])\s*/, "");
        const isChecked = !!checkedMap[idx];
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            key: idx,
            onClick: (e) => handleToggle(idx, e),
            style: {
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              cursor: "pointer",
              userSelect: "none",
              padding: "5px 9px",
              borderRadius: 7,
              border: `1.5px solid ${isChecked ? "#bbf7d0" : "#f1f5f9"}`,
              background: isChecked ? "#f0fdf4" : "#ffffff",
              boxShadow: isChecked ? "none" : "0 1px 3px rgba(0,0,0,0.02)",
              transition: "all 0.15s ease"
            },
            onMouseEnter: (e) => {
              if (!isChecked) {
                e.currentTarget.style.borderColor = COLOR_BLUE_GREEN;
                e.currentTarget.style.transform = "translateX(2px)";
              }
            },
            onMouseLeave: (e) => {
              if (!isChecked) {
                e.currentTarget.style.borderColor = "#f1f5f9";
                e.currentTarget.style.transform = "translateX(0px)";
              }
            }
          },
          /* @__PURE__ */ React.createElement("div", { style: {
            width: 17,
            height: 17,
            borderRadius: 4,
            border: `1.5px solid ${isChecked ? "#10b981" : "#cbd5e1"}`,
            background: isChecked ? "#10b981" : "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 2,
            flexShrink: 0,
            transition: "all 0.15s ease"
          } }, isChecked && /* @__PURE__ */ React.createElement("svg", { width: "11", height: "11", viewBox: "0 0 24 24", fill: "none", stroke: "#fff", strokeWidth: "3" }, /* @__PURE__ */ React.createElement("polyline", { points: "20 6 9 17 4 12" }))),
          /* @__PURE__ */ React.createElement("span", { style: {
            fontSize: 13,
            color: isChecked ? "#64748b" : "#1e293b",
            fontWeight: isChecked ? 400 : 500,
            lineHeight: 1.45,
            textDecoration: isChecked ? "line-through" : "none"
          } }, cleanText || line)
        );
      })
    ), hasScroll && /* @__PURE__ */ React.createElement("div", { style: {
      fontSize: 10,
      fontWeight: 500,
      color: COLOR_MUTED,
      textAlign: "center",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      paddingTop: 2
    } }, /* @__PURE__ */ React.createElement("span", null, "Scroll for more items"), /* @__PURE__ */ React.createElement("svg", { width: "10", height: "10", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5" }, /* @__PURE__ */ React.createElement("polyline", { points: "6 9 12 15 18 9" }))));
  }
  const isLongText = text.length > 250;
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "custom-hidden-scroll",
      style: {
        fontSize: 13.5,
        color: "#1e293b",
        lineHeight: 1.5,
        whiteSpace: "pre-wrap",
        fontWeight: 400,
        maxHeight: isLongText ? 150 : "none",
        overflowY: isLongText ? "auto" : "visible",
        scrollbarWidth: "none",
        msOverflowStyle: "none"
      }
    },
    /* @__PURE__ */ React.createElement("style", null, `
        .custom-hidden-scroll::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `),
    text
  );
}
function OrangeLoadingState({ isCard = false }) {
  return /* @__PURE__ */ React.createElement("div", { style: { padding: isCard ? "50px 20px" : "60px 20px", textAlign: "center", width: "100%", boxSizing: "border-box" } }, /* @__PURE__ */ React.createElement(
    "div",
    {
      style: {
        width: 44,
        height: 44,
        margin: "0 auto 16px",
        borderRadius: "50%",
        border: "3.5px solid #ffedd5",
        borderTopColor: COLOR_ORANGE,
        animation: "spinOrange 0.8s linear infinite",
        boxShadow: "0 0 14px rgba(251, 133, 0, 0.35)"
      }
    }
  ), /* @__PURE__ */ React.createElement("style", null, `
        @keyframes spinOrange {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, fontWeight: 600, color: COLOR_ORANGE, letterSpacing: "0.2px" } }, "Loading Todos & Tasks..."), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12.5, color: "#94a3b8", marginTop: 4 } }, "Fetching latest data and status updates"));
}
function UserAvatar({ userObj, nameFallback = "Me", size = 36 }) {
  const avatarUrl = userObj?.avatar || userObj?.profileImage || userObj?.photo || userObj?.avatarUrl || userObj?.image;
  const name = userObj?.name || userObj?.displayName || nameFallback;
  const initials = (name || "Me").slice(0, 2).toUpperCase();
  const [imgError, setImgError] = useState(false);
  if (avatarUrl && !imgError) {
    return /* @__PURE__ */ React.createElement(
      "img",
      {
        src: avatarUrl,
        alt: name,
        onError: () => setImgError(true),
        style: {
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          border: `1.5px solid ${COLOR_BORDER}`,
          boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
          flexShrink: 0
        }
      }
    );
  }
  return /* @__PURE__ */ React.createElement("div", { style: {
    width: size,
    height: size,
    borderRadius: "50%",
    background: COLOR_SKY_SURFACE,
    border: `1.5px solid ${COLOR_BORDER}`,
    color: COLOR_DEEP_BLUE,
    fontSize: size * 0.38,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
    flexShrink: 0
  } }, initials);
}
function getOverdueInfo(scheduledAt, status) {
  if (!scheduledAt || status === "done" || status === "completed" || status === "cancelled") return null;
  const now = /* @__PURE__ */ new Date();
  const due = new Date(scheduledAt);
  const diffMs = now - due;
  if (diffMs <= 0) return null;
  const diffMins = Math.floor(diffMs / 6e4);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  let label = "";
  if (diffDays > 0) label = `Overdue by ${diffDays}d`;
  else if (diffHours > 0) label = `Overdue by ${diffHours}h`;
  else label = `Overdue by ${Math.max(1, diffMins)}m`;
  return { isOverdue: true, label };
}
function CompletionAuditBadge({ completedAt, completedBy, fallbackUser }) {
  if (!completedAt) return null;
  const userObj = completedBy || fallbackUser;
  const userName = userObj?.name || "Team Member";
  const timeStr = formatISTDateTime(completedAt);
  return /* @__PURE__ */ React.createElement("div", { style: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#ecfdf5",
    border: "1px solid #a7f3d0",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 12,
    color: "#065f46",
    fontWeight: 500,
    marginTop: 6
  } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#059669", fontSize: 13, fontWeight: 700 } }, "\u2713"), /* @__PURE__ */ React.createElement("span", null, "Completed ", timeStr, " by"), /* @__PURE__ */ React.createElement(UserAvatar, { userObj, nameFallback: userName, size: 20 }), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 600, color: "#047857" } }, userName));
}
function QuickTodoInputBar({ onCreated, currentUser }) {
  const [text, setText] = useState("");
  const [priority, setPriority] = useState("medium");
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    try {
      const payload = {
        type: "todo",
        title: text.trim(),
        note: text.trim(),
        description: text.trim(),
        scheduledAt: (/* @__PURE__ */ new Date()).toISOString(),
        priority,
        assignedTo: currentUser?._id,
        assignedBy: currentUser?._id
      };
      const res = await followupsAPI.create(payload);
      setText("");
      if (res.data?.followup || res.data?.todo) {
        onCreated(res.data.followup || res.data.todo);
      }
    } catch (err) {
      console.error("Quick todo failed:", err);
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ React.createElement(
    "form",
    {
      onSubmit: handleSubmit,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "#ffffff",
        border: `1.5px solid ${COLOR_BLUE_GREEN}`,
        borderRadius: 12,
        padding: "8px 14px",
        boxShadow: "0 4px 14px rgba(2, 48, 71, 0.06)",
        marginBottom: 20,
        flexWrap: "wrap"
      }
    },
    /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 260 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 18 } }, "\u{1F4DD}"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: text,
        onChange: (e) => setText(e.target.value),
        placeholder: "Quick add Todo item... (e.g. 1. Submit daily report, 2. Call lead)",
        style: {
          flex: 1,
          border: "none",
          outline: "none",
          fontSize: 14,
          fontWeight: 500,
          color: COLOR_DEEP_BLUE,
          background: "transparent"
        }
      }
    )),
    /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } }, /* @__PURE__ */ React.createElement(
      "select",
      {
        value: priority,
        onChange: (e) => setPriority(e.target.value),
        style: {
          border: `1px solid ${COLOR_BORDER}`,
          borderRadius: 8,
          padding: "6px 10px",
          fontSize: 12.5,
          fontWeight: 500,
          color: COLOR_DEEP_BLUE,
          outline: "none",
          background: COLOR_SKY_SURFACE
        }
      },
      /* @__PURE__ */ React.createElement("option", { value: "high" }, " High"),
      /* @__PURE__ */ React.createElement("option", { value: "medium" }, " Medium"),
      /* @__PURE__ */ React.createElement("option", { value: "low" }, "\u{1F331} Low")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "submit",
        disabled: saving || !text.trim(),
        style: {
          padding: "7px 16px",
          borderRadius: 8,
          border: "none",
          background: COLOR_ORANGE,
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          cursor: saving || !text.trim() ? "not-allowed" : "pointer",
          opacity: saving || !text.trim() ? 0.6 : 1,
          boxShadow: "0 2px 8px rgba(251, 133, 0, 0.25)",
          transition: "all 0.15s ease",
          whiteSpace: "nowrap"
        }
      },
      saving ? "Adding..." : "+ Add Todo"
    ))
  );
}
function TaskSummaryWidget({ tasks, activeTab, priorityFilter, setPriorityFilter }) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "done" || t.status === "completed").length;
  const pending = tasks.filter((t) => t.status === "upcoming" || t.status === "pending").length;
  const overdue = tasks.filter((t) => t.status === "upcoming" && new Date(t.scheduledAt) < /* @__PURE__ */ new Date()).length;
  const rate = total > 0 ? Math.round(completed / total * 100) : 0;
  const highCount = tasks.filter((t) => t.priority === "high").length;
  const mediumCount = tasks.filter((t) => t.priority === "medium").length;
  const lowCount = tasks.filter((t) => t.priority === "low").length;
  return /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-5" }, /* @__PURE__ */ React.createElement(
    "div",
    {
      onClick: () => setPriorityFilter && setPriorityFilter(""),
      style: {
        background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
        border: `1.5px solid ${priorityFilter === "" ? COLOR_BLUE_GREEN : COLOR_BORDER}`,
        borderRadius: 14,
        padding: "16px 18px",
        boxShadow: "0 3px 10px rgba(2, 48, 71, 0.04)",
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
      },
      onMouseEnter: (e) => e.currentTarget.style.transform = "translateY(-2px)",
      onMouseLeave: (e) => e.currentTarget.style.transform = "translateY(0)"
    },
    /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11.5, color: COLOR_MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px" } }, "Total ", activeTab === "Todo" ? "Todos" : "Tasks"), /* @__PURE__ */ React.createElement("div", { style: { width: 34, height: 34, borderRadius: 10, background: "#e0f2fe", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center" } }, /* @__PURE__ */ React.createElement("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5" }, /* @__PURE__ */ React.createElement("path", { d: "M9 11l3 3L22 4" }), /* @__PURE__ */ React.createElement("path", { d: "M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" })))),
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: 26, fontWeight: 800, color: COLOR_DEEP_BLUE, marginTop: 8 } }, total),
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11.5, color: COLOR_MUTED, marginTop: 3, display: "flex", alignItems: "center", gap: 4 } }, /* @__PURE__ */ React.createElement("span", null, "Active items in view"))
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      style: {
        background: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
        border: "1.5px solid #a7f3d0",
        borderRadius: 14,
        padding: "16px 18px",
        boxShadow: "0 3px 10px rgba(16, 185, 129, 0.06)",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
      },
      onMouseEnter: (e) => e.currentTarget.style.transform = "translateY(-2px)",
      onMouseLeave: (e) => e.currentTarget.style.transform = "translateY(0)"
    },
    /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11.5, color: "#047857", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px" } }, "Completed"), /* @__PURE__ */ React.createElement("div", { style: { width: 34, height: 34, borderRadius: 10, background: "#d1fae5", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" } }, /* @__PURE__ */ React.createElement("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.8" }, /* @__PURE__ */ React.createElement("polyline", { points: "20 6 9 17 4 12" })))),
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: 26, fontWeight: 800, color: "#065f46", marginTop: 8 } }, completed),
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11.5, color: "#059669", marginTop: 3, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 } }, /* @__PURE__ */ React.createElement("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5" }, /* @__PURE__ */ React.createElement("polyline", { points: "23 6 13.5 15.5 8.5 10.5 1 18" }), /* @__PURE__ */ React.createElement("polyline", { points: "17 6 23 6 23 12" })), /* @__PURE__ */ React.createElement("span", null, rate, "% finish rate"))
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      style: {
        background: "linear-gradient(135deg, #ffffff 0%, #fff7ed 100%)",
        border: "1.5px solid #fed7aa",
        borderRadius: 14,
        padding: "16px 18px",
        boxShadow: "0 3px 10px rgba(251, 133, 0, 0.06)",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
      },
      onMouseEnter: (e) => e.currentTarget.style.transform = "translateY(-2px)",
      onMouseLeave: (e) => e.currentTarget.style.transform = "translateY(0)"
    },
    /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11.5, color: "#c2410c", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px" } }, "Upcoming / Pending"), /* @__PURE__ */ React.createElement("div", { style: { width: 34, height: 34, borderRadius: 10, background: "#ffedd5", color: "#ea580c", display: "flex", alignItems: "center", justifyContent: "center" } }, /* @__PURE__ */ React.createElement("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5" }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "10" }), /* @__PURE__ */ React.createElement("polyline", { points: "12 6 12 12 16 14" })))),
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: 26, fontWeight: 800, color: "#9a3412", marginTop: 8 } }, pending),
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11.5, color: "#ea580c", marginTop: 3, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 } }, /* @__PURE__ */ React.createElement("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5" }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "10" }), /* @__PURE__ */ React.createElement("polyline", { points: "12 6 12 12 16 14" })), /* @__PURE__ */ React.createElement("span", null, "In progress & scheduled"))
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      style: {
        background: overdue > 0 ? "linear-gradient(135deg, #fff5f5 0%, #fef2f2 100%)" : "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
        border: `1.5px solid ${overdue > 0 ? "#fecaca" : "#e2e8f0"}`,
        borderRadius: 14,
        padding: "16px 18px",
        boxShadow: overdue > 0 ? "0 3px 12px rgba(239, 68, 68, 0.12)" : "0 3px 10px rgba(2, 48, 71, 0.04)",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
      },
      onMouseEnter: (e) => e.currentTarget.style.transform = "translateY(-2px)",
      onMouseLeave: (e) => e.currentTarget.style.transform = "translateY(0)"
    },
    /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11.5, color: overdue > 0 ? "#b91c1c" : COLOR_MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px" } }, "Overdue Alert"), /* @__PURE__ */ React.createElement("div", { style: { width: 34, height: 34, borderRadius: 10, background: overdue > 0 ? "#fee2e2" : "#f1f5f9", color: overdue > 0 ? "#dc2626" : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center" } }, /* @__PURE__ */ React.createElement("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5" }, /* @__PURE__ */ React.createElement("path", { d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "9", x2: "12", y2: "13" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "17", x2: "12.01", y2: "17" })))),
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: 26, fontWeight: 800, color: overdue > 0 ? "#991b1b" : COLOR_DEEP_BLUE, marginTop: 8 } }, overdue),
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11.5, color: overdue > 0 ? "#dc2626" : COLOR_MUTED, marginTop: 3, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 } }, /* @__PURE__ */ React.createElement("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5" }, /* @__PURE__ */ React.createElement("path", { d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "9", x2: "12", y2: "13" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "17", x2: "12.01", y2: "17" })), /* @__PURE__ */ React.createElement("span", null, overdue > 0 ? "Urgent attention required" : "All tasks on schedule"))
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      style: {
        background: "linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)",
        border: `1.5px solid ${priorityFilter ? COLOR_ORANGE : "#e9d5ff"}`,
        borderRadius: 14,
        padding: "16px 18px",
        boxShadow: "0 3px 10px rgba(147, 51, 234, 0.05)",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between"
      },
      onMouseEnter: (e) => e.currentTarget.style.transform = "translateY(-2px)",
      onMouseLeave: (e) => e.currentTarget.style.transform = "translateY(0)"
    },
    /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11.5, color: "#7e22ce", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px" } }, "Priority Session"), /* @__PURE__ */ React.createElement("div", { style: { width: 34, height: 34, borderRadius: 10, background: "#f3e8ff", color: "#9333ea", display: "flex", alignItems: "center", justifyContent: "center" } }, /* @__PURE__ */ React.createElement("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5" }, /* @__PURE__ */ React.createElement("polygon", { points: "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" })))),
    /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 4 } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setPriorityFilter && setPriorityFilter(priorityFilter === "high" ? "" : "high"),
        style: {
          flex: 1,
          padding: "5px 6px",
          borderRadius: 8,
          border: "1px solid #fecaca",
          background: priorityFilter === "high" ? "#dc2626" : "#fef2f2",
          color: priorityFilter === "high" ? "#fff" : "#b91c1c",
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          transition: "all 0.15s ease"
        }
      },
      /* @__PURE__ */ React.createElement("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5" }, /* @__PURE__ */ React.createElement("path", { d: "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" })),
      /* @__PURE__ */ React.createElement("span", null, highCount)
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setPriorityFilter && setPriorityFilter(priorityFilter === "medium" ? "" : "medium"),
        style: {
          flex: 1,
          padding: "5px 6px",
          borderRadius: 8,
          border: "1px solid #fed7aa",
          background: priorityFilter === "medium" ? "#c2410c" : "#fff7ed",
          color: priorityFilter === "medium" ? "#fff" : "#c2410c",
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          transition: "all 0.15s ease"
        }
      },
      /* @__PURE__ */ React.createElement("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5" }, /* @__PURE__ */ React.createElement("polygon", { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2" })),
      /* @__PURE__ */ React.createElement("span", null, mediumCount)
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setPriorityFilter && setPriorityFilter(priorityFilter === "low" ? "" : "low"),
        style: {
          flex: 1,
          padding: "5px 6px",
          borderRadius: 8,
          border: "1px solid #a7f3d0",
          background: priorityFilter === "low" ? "#047857" : "#ecfdf5",
          color: priorityFilter === "low" ? "#fff" : "#047857",
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          transition: "all 0.15s ease"
        }
      },
      /* @__PURE__ */ React.createElement("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5" }, /* @__PURE__ */ React.createElement("path", { d: "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" }), /* @__PURE__ */ React.createElement("path", { d: "M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" })),
      /* @__PURE__ */ React.createElement("span", null, lowCount)
    ))
  ));
}
function AutoScrollName({ prefix = "", name = "", className = "", style = {}, maxPx = 135 }) {
  const fullText = prefix ? `${prefix} ${name}` : name;
  const isLong = fullText.length > 15;
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      className: `relative overflow-hidden whitespace-nowrap ${className}`,
      style: { maxWidth: maxPx, width: "100%", minWidth: 0, ...style },
      title: fullText
    },
    /* @__PURE__ */ React.createElement("style", null, `
        @keyframes scroll-name-anim {
          0%, 20% { transform: translateX(0%); }
          80%, 100% { transform: translateX(min(0px, calc(-100% + ${maxPx}px))); }
        }
        .animate-autoscroll-name {
          display: inline-block;
          white-space: nowrap;
          animation: scroll-name-anim 6s ease-in-out infinite alternate;
        }
        .animate-autoscroll-name:hover {
          animation-play-state: paused;
        }
      `),
    /* @__PURE__ */ React.createElement("span", { className: isLong ? "animate-autoscroll-name" : "truncate block" }, prefix ? /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 400, color: "#64748b" } }, prefix, " ") : null, /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 600 } }, name))
  );
}
function TodoCard({ task, onEdit, onComplete, onDelete, canDelete, isLocked, markingId, deletingId, onDateShift }) {
  const isLate = !isLocked && task.status === "upcoming" && new Date(task.scheduledAt) < /* @__PURE__ */ new Date();
  const displayKey = isLocked ? "locked" : isLate ? "late" : task.status || "upcoming";
  const statusMeta = STATUS_CONFIG[displayKey] || STATUS_CONFIG.upcoming;
  const priorityMeta = PRIORITY_CONFIG[task.priority || "medium"] || PRIORITY_CONFIG.medium;
  const assigneeObj = task.assignedTo || task.assignee;
  const assigneeName = assigneeObj?.name || "Me";
  const assignedByObj = task.assignedBy;
  const assignedByName = (assignedByObj?.name || assignedByObj) === "all" ? "All" : assignedByObj?.name || "";
  const overdueInfo = getOverdueInfo(task.scheduledAt, task.status);
  const isRecurring = !!(task.recurrence?.frequency || task.recurrenceFrequency || task.recurrence && task.recurrence.frequency !== "none");
  const recurrenceFreq = (task.recurrence?.frequency || task.recurrenceFrequency || "daily").toLowerCase();
  const initialDueDate = task.initialScheduledAt || task.createdAt || task.scheduledAt;
  const repeatEndDate = task.recurrence?.endDate;
  const currentDate = new Date(task.scheduledAt || Date.now());
  const minDate = initialDueDate ? new Date(initialDueDate) : null;
  const maxDate = repeatEndDate ? new Date(repeatEndDate) : null;
  const isAtMinDate = minDate ? currentDate.getTime() <= minDate.getTime() + 6e4 : false;
  const isAtMaxDate = maxDate ? currentDate.getTime() >= maxDate.getTime() - 6e4 : false;
  let occurrenceBadgeText = null;
  if (isRecurring && minDate) {
    const dayMs = 24 * 60 * 60 * 1e3;
    const diffDaysFromStart = Math.max(0, Math.floor((currentDate.getTime() - minDate.getTime()) / dayMs));
    let currentStep = 1;
    let totalSteps = null;
    if (recurrenceFreq === "weekly") {
      currentStep = Math.floor(diffDaysFromStart / 7) + 1;
      if (maxDate && maxDate > minDate) {
        const totalDays = Math.floor((maxDate.getTime() - minDate.getTime()) / dayMs);
        totalSteps = Math.floor(totalDays / 7) + 1;
      }
    } else if (recurrenceFreq === "monthly") {
      currentStep = (currentDate.getFullYear() - minDate.getFullYear()) * 12 + (currentDate.getMonth() - minDate.getMonth()) + 1;
      currentStep = Math.max(1, currentStep);
      if (maxDate && maxDate > minDate) {
        totalSteps = (maxDate.getFullYear() - minDate.getFullYear()) * 12 + (maxDate.getMonth() - minDate.getMonth()) + 1;
        totalSteps = Math.max(1, totalSteps);
      }
    } else {
      currentStep = diffDaysFromStart + 1;
      if (maxDate && maxDate > minDate) {
        const totalDays = Math.floor((maxDate.getTime() - minDate.getTime()) / dayMs);
        totalSteps = totalDays + 1;
      }
    }
    const doneCount = task.completedCount || 0;
    if (totalSteps) {
      occurrenceBadgeText = `Day ${currentStep} of ${totalSteps} (Completed: ${doneCount})`;
    } else {
      occurrenceBadgeText = `Occurrence #${currentStep} (Completed: ${doneCount})`;
    }
  }
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      style: {
        background: "#ffffff",
        border: `1px solid ${isLate ? "#fecaca" : COLOR_BORDER}`,
        borderRadius: 14,
        padding: "20px",
        boxShadow: isLate ? "0 4px 14px rgba(239, 68, 68, 0.08)" : "0 4px 14px rgba(2, 48, 71, 0.04)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 16,
        transition: "all 0.2s ease",
        position: "relative"
      },
      onMouseEnter: (e) => {
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(2, 48, 71, 0.09)";
        e.currentTarget.style.borderColor = COLOR_BLUE_GREEN;
      },
      onMouseLeave: (e) => {
        e.currentTarget.style.boxShadow = isLate ? "0 4px 14px rgba(239, 68, 68, 0.08)" : "0 4px 14px rgba(2, 48, 71, 0.04)";
        e.currentTarget.style.borderColor = isLate ? "#fecaca" : COLOR_BORDER;
      }
    },
    /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 } }, /* @__PURE__ */ React.createElement(UserAvatar, { userObj: assigneeObj, nameFallback: assigneeName, size: 38 }), /* @__PURE__ */ React.createElement("div", { style: { minWidth: 0, overflow: "hidden", flex: 1 } }, /* @__PURE__ */ React.createElement(AutoScrollName, { name: assigneeName, style: { fontSize: 14, color: COLOR_DEEP_BLUE }, maxPx: 135 }), assignedByName && /* @__PURE__ */ React.createElement(AutoScrollName, { prefix: "Assigned by:", name: assignedByName, style: { fontSize: 11.5, color: COLOR_MUTED }, maxPx: 135 }))), /* @__PURE__ */ React.createElement("span", { style: {
      fontSize: 11.5,
      fontWeight: 600,
      padding: "4px 10px",
      borderRadius: 20,
      background: priorityMeta.bg,
      color: priorityMeta.text,
      border: `1px solid ${priorityMeta.border}`,
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      textTransform: "capitalize"
    } }, task.priority === "high" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "#ef4444", strokeWidth: "2.5" }, /* @__PURE__ */ React.createElement("path", { d: "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" })), " High") : task.priority === "medium" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "#f59e0b", strokeWidth: "2.5" }, /* @__PURE__ */ React.createElement("polygon", { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2" })), " Medium") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "#10b981", strokeWidth: "2.5" }, /* @__PURE__ */ React.createElement("path", { d: "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" }), /* @__PURE__ */ React.createElement("path", { d: "M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" })), " Low"))),
    isRecurring && /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      width: "100%",
      boxSizing: "border-box",
      background: "linear-gradient(135deg, #e8f4fa 0%, #ffffff 100%)",
      border: `1.5px solid ${COLOR_BORDER}`,
      borderRadius: 12,
      padding: "10px 14px",
      boxShadow: "0 2px 10px rgba(2, 48, 71, 0.04)"
    } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: COLOR_ORANGE, display: "flex", alignItems: "center", gap: 5 } }, /* @__PURE__ */ React.createElement("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: COLOR_ORANGE, strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("path", { d: "M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" })), /* @__PURE__ */ React.createElement("span", null, recurrenceFreq, " Task")), !isTodayDate(task.scheduledAt) && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: (e) => {
          e.stopPropagation();
          if (onDateShift) onDateShift(task, "today");
        },
        style: {
          fontSize: 10.5,
          fontWeight: 700,
          background: "linear-gradient(135deg, #023047 0%, #219ebc 100%)",
          color: "#ffffff",
          border: "none",
          borderRadius: 14,
          padding: "3px 10px",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          boxShadow: "0 2px 6px rgba(33, 158, 188, 0.25)",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          flexShrink: 0,
          marginLeft: "auto"
        },
        onMouseEnter: (e) => {
          e.currentTarget.style.transform = "scale(1.06)";
          e.currentTarget.style.boxShadow = "0 4px 10px rgba(33, 158, 188, 0.4)";
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 2px 6px rgba(33, 158, 188, 0.25)";
        },
        title: "Jump date directly back to Today"
      },
      /* @__PURE__ */ React.createElement("svg", { width: "11", height: "11", viewBox: "0 0 24 24", fill: "none", stroke: "#ffffff", strokeWidth: "2.8", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "10" }), /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "3" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "2", x2: "12", y2: "5" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "19", x2: "12", y2: "22" }), /* @__PURE__ */ React.createElement("line", { x1: "2", y1: "12", x2: "5", y2: "12" }), /* @__PURE__ */ React.createElement("line", { x1: "19", y1: "12", x2: "22", y2: "12" })),
      /* @__PURE__ */ React.createElement("span", null, "Today")
    )), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 8 } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: isAtMinDate,
        onClick: (e) => {
          e.stopPropagation();
          if (!isAtMinDate && onDateShift) onDateShift(task, -1);
        },
        style: {
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: isAtMinDate ? "#f1f5f9" : "#ffffff",
          border: `1.5px solid ${isAtMinDate ? "#cbd5e1" : COLOR_BORDER}`,
          color: isAtMinDate ? "#94a3b8" : COLOR_DEEP_BLUE,
          cursor: isAtMinDate ? "not-allowed" : "pointer",
          opacity: isAtMinDate ? 0.4 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 6px rgba(2, 48, 71, 0.08)",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          flexShrink: 0
        },
        onMouseEnter: (e) => {
          if (isAtMinDate) return;
          e.currentTarget.style.borderColor = COLOR_ORANGE;
          e.currentTarget.style.color = COLOR_ORANGE;
          e.currentTarget.style.transform = "scale(1.08)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(251, 133, 0, 0.25)";
        },
        onMouseLeave: (e) => {
          if (isAtMinDate) return;
          e.currentTarget.style.borderColor = COLOR_BORDER;
          e.currentTarget.style.color = COLOR_DEEP_BLUE;
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 2px 6px rgba(2, 48, 71, 0.08)";
        },
        title: isAtMinDate ? "Cannot shift prior to initial Due Date" : "Previous Occurrence Date"
      },
      /* @__PURE__ */ React.createElement("svg", { width: "15", height: "15", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.8", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("polyline", { points: "15 18 9 12 15 6" }))
    ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", flex: 1, textAlign: "center", gap: 3 } }, occurrenceBadgeText && /* @__PURE__ */ React.createElement("span", { style: {
      fontSize: 10,
      fontWeight: 600,
      background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
      color: "#c2410c",
      border: "1px solid #fed7aa",
      padding: "1.5px 7px",
      borderRadius: 10,
      display: "inline-flex",
      alignItems: "center",
      gap: 3,
      boxShadow: "0 1px 3px rgba(251, 133, 0, 0.1)"
    } }, "\u{1F525} ", occurrenceBadgeText), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, fontWeight: 500, color: COLOR_DEEP_BLUE, letterSpacing: "-0.1px", whiteSpace: "nowrap" } }, task.scheduledAt ? formatISTDateTime(task.scheduledAt) : "Active Date"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, fontWeight: 400, color: COLOR_MUTED, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 } }, /* @__PURE__ */ React.createElement("span", null, "Repeat Until:"), /* @__PURE__ */ React.createElement("span", { style: { color: COLOR_DEEP_BLUE, fontWeight: 500 } }, repeatEndDate ? formatISTDate(repeatEndDate) : "No Limit"))), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: isAtMaxDate,
        onClick: (e) => {
          e.stopPropagation();
          if (!isAtMaxDate && onDateShift) onDateShift(task, 1);
        },
        style: {
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: isAtMaxDate ? "#f1f5f9" : "#ffffff",
          border: `1.5px solid ${isAtMaxDate ? "#cbd5e1" : COLOR_BORDER}`,
          color: isAtMaxDate ? "#94a3b8" : COLOR_DEEP_BLUE,
          cursor: isAtMaxDate ? "not-allowed" : "pointer",
          opacity: isAtMaxDate ? 0.4 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 6px rgba(2, 48, 71, 0.08)",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          flexShrink: 0
        },
        onMouseEnter: (e) => {
          if (isAtMaxDate) return;
          e.currentTarget.style.borderColor = COLOR_ORANGE;
          e.currentTarget.style.color = COLOR_ORANGE;
          e.currentTarget.style.transform = "scale(1.08)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(251, 133, 0, 0.25)";
        },
        onMouseLeave: (e) => {
          if (isAtMaxDate) return;
          e.currentTarget.style.borderColor = COLOR_BORDER;
          e.currentTarget.style.color = COLOR_DEEP_BLUE;
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 2px 6px rgba(2, 48, 71, 0.08)";
        },
        title: isAtMaxDate ? "Reached Repeat Until end limit" : "Next Occurrence Date"
      },
      /* @__PURE__ */ React.createElement("svg", { width: "15", height: "15", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.8", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("polyline", { points: "9 18 15 12 9 6" }))
    ))),
    /* @__PURE__ */ React.createElement("div", { style: {
      background: "#f8fafc",
      border: "1px solid #f1f5f9",
      borderRadius: 10,
      padding: "14px 16px",
      minHeight: 64
    } }, /* @__PURE__ */ React.createElement(FormattedDescription, { text: task.title || task.note || task.description || "", task })),
    /* @__PURE__ */ React.createElement(CompletionAuditBadge, { completedAt: task.completedAt, completedBy: task.completedBy, fallbackUser: assigneeObj }),
    /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 12, paddingTop: 8, borderTop: "1px solid #f1f5f9" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: COLOR_MUTED, fontWeight: 500 } }, /* @__PURE__ */ React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: COLOR_BLUE_GREEN, strokeWidth: "2" }, /* @__PURE__ */ React.createElement("rect", { x: "3", y: "4", width: "18", height: "18", rx: "2", ry: "2" }), /* @__PURE__ */ React.createElement("line", { x1: "16", y1: "2", x2: "16", y2: "6" }), /* @__PURE__ */ React.createElement("line", { x1: "8", y1: "2", x2: "8", y2: "6" }), /* @__PURE__ */ React.createElement("line", { x1: "3", y1: "10", x2: "21", y2: "10" })), /* @__PURE__ */ React.createElement("span", null, task.scheduledAt ? formatISTDateTime(task.scheduledAt) : "No due date")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" } }, overdueInfo && /* @__PURE__ */ React.createElement("span", { style: {
      fontSize: 11,
      fontWeight: 600,
      padding: "2px 8px",
      borderRadius: 4,
      background: "#fef2f2",
      color: "#dc2626",
      border: "1px solid #fecaca",
      display: "inline-flex",
      alignItems: "center",
      gap: 4
    } }, "\u26A0\uFE0F ", overdueInfo.label), /* @__PURE__ */ React.createElement("span", { style: {
      fontSize: 11.5,
      fontWeight: 600,
      padding: "3px 9px",
      borderRadius: 6,
      background: statusMeta.bg,
      color: statusMeta.text,
      border: `1px solid ${statusMeta.border}`
    } }, isLocked ? `Locked (${new Date(task.scheduledAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })})` : isLate ? "Late" : statusMeta.label || task.status))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginTop: 2 } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => !isLocked && onComplete(task._id),
        disabled: isLocked || markingId === task._id,
        style: {
          flex: 1,
          padding: "8px 12px",
          borderRadius: 8,
          border: "none",
          background: isLocked ? "#f1f5f9" : COLOR_ORANGE,
          color: isLocked ? "#94a3b8" : "#ffffff",
          fontSize: 13,
          fontWeight: 600,
          cursor: isLocked ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          boxShadow: isLocked ? "none" : "0 2px 6px rgba(251, 133, 0, 0.25)",
          opacity: isLocked || markingId === task._id ? 0.6 : 1,
          transition: "all 0.15s ease"
        }
      },
      markingId === task._id ? /* @__PURE__ */ React.createElement("span", null, "Saving...") : isLocked ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, /* @__PURE__ */ React.createElement("rect", { x: "3", y: "11", width: "18", height: "11", rx: "2", ry: "2" }), /* @__PURE__ */ React.createElement("path", { d: "M7 11V7a5 5 0 0 1 10 0v4" })), /* @__PURE__ */ React.createElement("span", null, "Locked")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5" }, /* @__PURE__ */ React.createElement("polyline", { points: "20 6 9 17 4 12" })), /* @__PURE__ */ React.createElement("span", null, "Mark Complete"))
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => onEdit(task),
        style: {
          padding: "8px 10px",
          borderRadius: 8,
          border: `1px solid ${COLOR_BORDER}`,
          background: "#fff",
          color: COLOR_DEEP_BLUE,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.15s ease"
        },
        title: "Edit Details"
      },
      /* @__PURE__ */ React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: COLOR_BLUE_GREEN, strokeWidth: "2" }, /* @__PURE__ */ React.createElement("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }), /* @__PURE__ */ React.createElement("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" }))
    ), canDelete && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => onDelete(task._id),
        disabled: deletingId === task._id,
        style: {
          padding: "8px 10px",
          borderRadius: 8,
          border: "1px solid #fecaca",
          background: "#fef2f2",
          color: "#dc2626",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: deletingId === task._id ? 0.5 : 1,
          transition: "all 0.15s ease"
        },
        title: "Delete Todo"
      },
      /* @__PURE__ */ React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, /* @__PURE__ */ React.createElement("polyline", { points: "3 6 5 6 21 6" }), /* @__PURE__ */ React.createElement("path", { d: "M19 6l-1 14H6L5 6" }), /* @__PURE__ */ React.createElement("path", { d: "M10 11v6M14 11v6" }), /* @__PURE__ */ React.createElement("path", { d: "M9 6V4h6v2" }))
    )))
  );
}
function EditModal({ task, onClose, onSaved, readOnly = false }) {
  const isTodo = task.type === "todo";
  const [form, setForm] = useState({
    note: task.note || task.description || (isTodo ? "1. " : ""),
    scheduledAt: task.scheduledAt ? task.scheduledAt.slice(0, 16) : "",
    priority: task.priority || "medium",
    status: task.status || "upcoming",
    title: task.title || task.note || task.description || ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (isTodo && (!form.note || !form.note.trim())) {
      setForm((f) => ({ ...f, note: "1. " }));
    }
  }, [isTodo]);
  const handleSave = async () => {
    if (readOnly) return;
    setSaving(true);
    setError("");
    try {
      const update = {
        note: form.note,
        title: task.type === "todo" ? form.note : form.title || "",
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : void 0,
        priority: form.priority,
        status: form.status
      };
      const res = await followupsAPI.update(task._id, update);
      onSaved(res.data.followup);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };
  const addNumberedItem = () => {
    const lines = (form.note || "").split("\n").filter(Boolean);
    const nextNum = lines.length + 1;
    setForm((f) => ({
      ...f,
      note: f.note && f.note.trim() ? `${f.note}
${nextNum}. ` : `${nextNum}. `
    }));
  };
  return /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, background: "rgba(2, 48, 71, 0.45)", backdropFilter: "blur(2px)", zIndex: 1e3, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 14, width: "100%", maxWidth: 460, padding: 24, boxShadow: "0 12px 36px rgba(2, 48, 71, 0.16)", border: `1px solid ${COLOR_BORDER}` } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 } }, /* @__PURE__ */ React.createElement("h3", { style: { fontSize: 18, fontWeight: 500, color: COLOR_DEEP_BLUE, margin: 0 } }, readOnly ? "Task Details" : isTodo ? "Edit Todo" : "Edit Follow-up"), /* @__PURE__ */ React.createElement("button", { onClick: onClose, style: { background: "none", border: "none", cursor: "pointer", fontSize: 22, color: COLOR_MUTED, lineHeight: 1 } }, "\xD7")), readOnly && /* @__PURE__ */ React.createElement("div", { style: { background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#92400e", fontWeight: 400 } }, "View only. You can complete this task from the list, but only managers or admins can modify details."), task.lead?.name && /* @__PURE__ */ React.createElement("div", { style: { background: COLOR_SKY_SURFACE, border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: "11px 14px", marginBottom: 16, fontSize: 14, color: COLOR_DEEP_BLUE, fontWeight: 500 } }, "Lead: ", task.lead.name, " ", task.lead.phone ? `(${task.lead.phone})` : ""), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyBetween: "space-between", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 13, fontWeight: 500, color: COLOR_DEEP_BLUE } }, isTodo ? "Todo Task Description" : "Description / Note"), isTodo && !readOnly && /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: addNumberedItem,
      style: {
        padding: "2px 8px",
        fontSize: 11.5,
        fontWeight: 600,
        borderRadius: 4,
        border: `1px solid ${COLOR_BORDER}`,
        background: COLOR_SKY_SURFACE,
        color: COLOR_BLUE_GREEN,
        cursor: "pointer"
      }
    },
    "+ Add Item"
  )), isTodo && !readOnly && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11.5, color: COLOR_ORANGE, marginBottom: 6, fontWeight: 500 } }, "Press ", /* @__PURE__ */ React.createElement("strong", null, "Enter"), " to automatically trigger 2., 3., 4."), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: form.note,
      onChange: (e) => setForm((f) => ({ ...f, note: e.target.value })),
      onKeyDown: (e) => isTodo && !readOnly && handleNumericKeyDown(e, form.note, (newText) => setForm((f) => ({ ...f, note: newText }))),
      rows: 4,
      disabled: readOnly,
      placeholder: isTodo ? "1. First task line\n2. Second task line" : "Enter note description...",
      style: { width: "100%", border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, fontWeight: 400, resize: "none", outline: "none", boxSizing: "border-box", background: readOnly ? "#f8fafc" : "#fff", color: readOnly ? "#64748b" : COLOR_DEEP_BLUE }
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 13, fontWeight: 500, color: COLOR_DEEP_BLUE, display: "block", marginBottom: 6 } }, "Due Date & Time"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, opacity: readOnly ? 0.6 : 1, pointerEvents: readOnly ? "none" : "auto" } }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "date",
      value: form.scheduledAt ? form.scheduledAt.slice(0, 10) : "",
      onChange: (e) => {
        const timePart = form.scheduledAt ? form.scheduledAt.slice(11, 16) : "09:00";
        setForm((f) => ({ ...f, scheduledAt: e.target.value + "T" + timePart }));
      },
      disabled: readOnly,
      style: { flex: 1, border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: "9px 12px", fontSize: 14, fontWeight: 400, outline: "none", color: COLOR_DEEP_BLUE, boxSizing: "border-box" }
    }
  ), /* @__PURE__ */ React.createElement(
    TimeInput12h,
    {
      value: form.scheduledAt ? form.scheduledAt.slice(11, 16) : "09:00",
      onChange: (time) => {
        const datePart = form.scheduledAt ? form.scheduledAt.slice(0, 10) : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
        setForm((f) => ({ ...f, scheduledAt: datePart + "T" + time }));
      }
    }
  ))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 13, fontWeight: 500, color: COLOR_DEEP_BLUE, display: "block", marginBottom: 6 } }, "Priority"), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: form.priority,
      onChange: (e) => setForm((f) => ({ ...f, priority: e.target.value })),
      disabled: readOnly,
      style: { width: "100%", border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: "9px 12px", fontSize: 14, fontWeight: 400, outline: "none", background: readOnly ? "#f8fafc" : "#fff", color: readOnly ? "#64748b" : COLOR_DEEP_BLUE }
    },
    /* @__PURE__ */ React.createElement("option", { value: "high" }, "High"),
    /* @__PURE__ */ React.createElement("option", { value: "medium" }, "Medium"),
    /* @__PURE__ */ React.createElement("option", { value: "low" }, "Low")
  )), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 13, fontWeight: 500, color: COLOR_DEEP_BLUE, display: "block", marginBottom: 6 } }, "Status"), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: form.status,
      onChange: (e) => setForm((f) => ({ ...f, status: e.target.value })),
      disabled: readOnly,
      style: { width: "100%", border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: "9px 12px", fontSize: 14, fontWeight: 400, outline: "none", background: readOnly ? "#f8fafc" : "#fff", color: readOnly ? "#64748b" : COLOR_DEEP_BLUE }
    },
    /* @__PURE__ */ React.createElement("option", { value: "upcoming" }, "Upcoming"),
    /* @__PURE__ */ React.createElement("option", { value: "done" }, "Done"),
    /* @__PURE__ */ React.createElement("option", { value: "cancelled" }, "Cancelled")
  )))), error && /* @__PURE__ */ React.createElement("p", { style: { color: "#dc2626", fontSize: 13, marginTop: 12 } }, error), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, marginTop: 22 } }, /* @__PURE__ */ React.createElement("button", { onClick: onClose, style: { flex: 1, padding: "10px 14px", border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, background: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", color: COLOR_DEEP_BLUE } }, readOnly ? "Close" : "Cancel"), !readOnly && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleSave,
      disabled: saving,
      style: { flex: 1, padding: "10px 14px", border: "none", borderRadius: 8, background: COLOR_ORANGE, color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", opacity: saving ? 0.7 : 1 }
    },
    saving ? "Saving..." : "Save Changes"
  ))));
}
function UploadModal({ activeTab, onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);
  const isTodoTab = activeTab === "Todo";
  const downloadSampleTemplate = (type) => {
    let headers, rows;
    if (type === "todo") {
      headers = ["Task", "Due Date", "Priority", "Type"];
      rows = [
        ["Review broadband fiber expansion blueprint", "2026-09-25 10:00", "high", "todo"],
        ["Compile weekly team performance metrics", "2026-09-24 17:30", "medium", "todo"],
        ["Follow up on departmental software licenses", "2026-09-28 12:00", "low", "todo"]
      ];
    } else {
      headers = ["Note", "Due Date", "Priority", "Phone", "Type"];
      rows = [
        ["Call client regarding tariff plan upgrade", "2026-09-22 11:30", "high", "9876543210", "call_followup"],
        ["Follow up on enterprise router installation", "2026-09-23 15:00", "medium", "9123456780", "call_followup"]
      ];
    }
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sample_${type}_upload_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setError("");
      setResult(null);
    }
  };
  const handleUpload = async () => {
    if (!file) {
      setError("Please choose an Excel or CSV file first");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await followupsAPI.import(formData);
      setResult({ count: res.data.count, total: res.data.total });
      onImported();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };
  return /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, background: "rgba(2, 48, 71, 0.45)", backdropFilter: "blur(2px)", zIndex: 1e3, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 14, width: "100%", maxWidth: 500, padding: 26, boxShadow: "0 12px 36px rgba(2, 48, 71, 0.16)", border: `1px solid ${COLOR_BORDER}` } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { width: 32, height: 32, borderRadius: 8, background: COLOR_SKY_SURFACE, display: "flex", alignItems: "center", justifyContent: "center", color: COLOR_BLUE_GREEN } }, /* @__PURE__ */ React.createElement("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, /* @__PURE__ */ React.createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), /* @__PURE__ */ React.createElement("polyline", { points: "17 8 12 3 7 8" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "3", x2: "12", y2: "15" }))), /* @__PURE__ */ React.createElement("h3", { style: { fontSize: 18, fontWeight: 500, color: COLOR_DEEP_BLUE, margin: 0 } }, isTodoTab ? "Upload Todo List" : "Upload Tasks / Follow-ups")), /* @__PURE__ */ React.createElement("button", { onClick: onClose, style: { background: "none", border: "none", cursor: "pointer", fontSize: 22, color: COLOR_MUTED, lineHeight: 1 } }, "\xD7")), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 13, color: COLOR_MUTED, margin: "6px 0 16px", lineHeight: 1.5 } }, "Upload multiple ", isTodoTab ? "Todo items" : "tasks or call follow-ups", " at once via an Excel or CSV file. Download a template below if you need the exact format."), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => downloadSampleTemplate("todo"),
      style: {
        padding: "6px 12px",
        borderRadius: 6,
        border: `1px solid ${COLOR_BORDER}`,
        background: isTodoTab ? COLOR_SKY_SURFACE : "#fff",
        color: COLOR_DEEP_BLUE,
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6
      }
    },
    /* @__PURE__ */ React.createElement("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, /* @__PURE__ */ React.createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), /* @__PURE__ */ React.createElement("polyline", { points: "7 10 12 15 17 10" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "15", x2: "12", y2: "3" })),
    "Download Todo Template (.csv)"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => downloadSampleTemplate("call_followup"),
      style: {
        padding: "6px 12px",
        borderRadius: 6,
        border: `1px solid ${COLOR_BORDER}`,
        background: !isTodoTab ? COLOR_SKY_SURFACE : "#fff",
        color: COLOR_DEEP_BLUE,
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6
      }
    },
    /* @__PURE__ */ React.createElement("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, /* @__PURE__ */ React.createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), /* @__PURE__ */ React.createElement("polyline", { points: "7 10 12 15 17 10" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "15", x2: "12", y2: "3" })),
    "Download Follow-up Template (.csv)"
  )), /* @__PURE__ */ React.createElement(
    "div",
    {
      onClick: () => fileInputRef.current?.click(),
      style: {
        border: `2px dashed ${file ? COLOR_BLUE_GREEN : COLOR_BORDER}`,
        borderRadius: 10,
        padding: "28px 18px",
        textAlign: "center",
        cursor: "pointer",
        background: file ? COLOR_SKY_SURFACE : "#fbfdfe",
        transition: "all 0.15s ease"
      }
    },
    /* @__PURE__ */ React.createElement(
      "input",
      {
        ref: fileInputRef,
        type: "file",
        accept: ".xlsx,.xls,.csv",
        onChange: handleFileChange,
        style: { display: "none" }
      }
    ),
    /* @__PURE__ */ React.createElement("svg", { width: "34", height: "34", viewBox: "0 0 24 24", fill: "none", stroke: COLOR_BLUE_GREEN, strokeWidth: "1.75", style: { margin: "0 auto 10px" } }, /* @__PURE__ */ React.createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), /* @__PURE__ */ React.createElement("polyline", { points: "17 8 12 3 7 8" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "3", x2: "12", y2: "15" })),
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 500, color: file ? COLOR_BLUE_GREEN : COLOR_DEEP_BLUE } }, file ? file.name : `Click or drag your ${isTodoTab ? "Todo list" : "tasks"} file here`),
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: COLOR_MUTED, marginTop: 4 } }, "Supports .xlsx, .xls or .csv")
  ), error && /* @__PURE__ */ React.createElement("p", { style: { color: "#dc2626", fontSize: 13, marginTop: 12 } }, error), result && /* @__PURE__ */ React.createElement("div", { style: { background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 8, padding: "10px 14px", marginTop: 14, color: "#065f46", fontSize: 13, fontWeight: 500 } }, "Successfully imported ", result.count, " of ", result.total, " items."), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, marginTop: 22 } }, /* @__PURE__ */ React.createElement("button", { onClick: onClose, style: { flex: 1, padding: "10px 14px", border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, background: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", color: COLOR_DEEP_BLUE } }, result ? "Done" : "Cancel"), !result && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleUpload,
      disabled: uploading || !file,
      style: { flex: 1, padding: "10px 14px", border: "none", borderRadius: 8, background: COLOR_ORANGE, color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", opacity: uploading || !file ? 0.6 : 1 }
    },
    uploading ? "Uploading..." : `Upload ${isTodoTab ? "Todo List" : "Tasks"}`
  ))));
}
function TaskAssigneeCheckboxDropdown({ assignableUsers, selectedIds, onChange, currentUser }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropRef = useRef(null);
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const filtered = assignableUsers.filter((u) => {
    const q = search.toLowerCase();
    const name = (u.name || (u.isMe ? "You" : "")).toLowerCase();
    const desig = (u.designation || u.displayName || "").toLowerCase();
    return name.includes(q) || desig.includes(q);
  });
  const allSelected = assignableUsers.length > 0 && assignableUsers.every((u) => selectedIds.includes(u._id));
  const isSingleOption = assignableUsers.length <= 1;
  const toggleSelectAll = () => {
    if (allSelected) {
      const defaultId = currentUser?._id || assignableUsers[0]?._id;
      onChange(defaultId ? [defaultId] : []);
    } else {
      onChange(assignableUsers.map((u) => u._id));
    }
  };
  const toggleUser = (id) => {
    if (selectedIds.includes(id)) {
      if (isSingleOption) return;
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };
  const getSummaryLabel = () => {
    if (selectedIds.length === 0) return "Select Assignee(s)";
    if (allSelected && assignableUsers.length > 1) {
      return `All Employees (${assignableUsers.length})`;
    }
    if (selectedIds.length === 1) {
      const found = assignableUsers.find((u) => u._id === selectedIds[0]);
      if (found) {
        return `${found.name || "User"}${found._id === currentUser?._id ? " (You)" : ""}${found.displayName || found.designation ? ` (${found.displayName || found.designation})` : ""}`;
      }
      return "1 Person Selected";
    }
    return `${selectedIds.length} People Selected`;
  };
  return /* @__PURE__ */ React.createElement("div", { ref: dropRef, style: { position: "relative", width: "100%" } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => setOpen((p) => !p),
      style: {
        width: "100%",
        border: `1px solid ${COLOR_BORDER}`,
        borderRadius: 8,
        padding: "9px 12px",
        fontSize: 14,
        outline: "none",
        color: COLOR_DEEP_BLUE,
        background: "#fff",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        boxSizing: "border-box"
      }
    },
    /* @__PURE__ */ React.createElement("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" } }, getSummaryLabel()),
    /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, flexShrink: 0 } }, selectedIds.length > 1 && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, fontWeight: 700, background: "#e0f2fe", color: "#0284c7", padding: "1px 6px", borderRadius: 10 } }, selectedIds.length), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: COLOR_MUTED, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" } }, "\u25BC"))
  ), open && /* @__PURE__ */ React.createElement("div", { style: {
    position: "absolute",
    left: 0,
    top: "100%",
    marginTop: 4,
    width: "100%",
    minWidth: 240,
    maxWidth: 320,
    background: "#fff",
    borderRadius: 10,
    border: `1px solid ${COLOR_BORDER}`,
    boxShadow: "0 10px 25px rgba(2, 48, 71, 0.15)",
    zIndex: 1100,
    padding: 6,
    boxSizing: "border-box"
  } }, assignableUsers.length > 1 && /* @__PURE__ */ React.createElement("div", { style: {
    padding: "6px 8px",
    borderBottom: `1px solid ${COLOR_BORDER}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: COLOR_SKY_SURFACE,
    borderRadius: 6,
    marginBottom: 4
  } }, /* @__PURE__ */ React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: COLOR_DEEP_BLUE, cursor: "pointer" } }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "checkbox",
      checked: allSelected,
      onChange: toggleSelectAll,
      style: { cursor: "pointer", accentColor: COLOR_BLUE_GREEN }
    }
  ), /* @__PURE__ */ React.createElement("span", null, "Select All (", assignableUsers.length, ")")), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: COLOR_MUTED } }, selectedIds.length, " selected")), assignableUsers.length > 4 && /* @__PURE__ */ React.createElement("div", { style: { padding: "4px 2px" } }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      placeholder: "\u{1F50D} Search user...",
      value: search,
      onChange: (e) => setSearch(e.target.value),
      style: {
        width: "100%",
        padding: "6px 8px",
        fontSize: 12,
        border: `1px solid ${COLOR_BORDER}`,
        borderRadius: 6,
        outline: "none",
        boxSizing: "border-box"
      }
    }
  )), /* @__PURE__ */ React.createElement("div", { style: { maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 } }, filtered.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { padding: 10, textAlign: "center", fontSize: 12, color: COLOR_MUTED } }, "No matching users") : filtered.map((u) => {
    const isChecked = selectedIds.includes(u._id);
    const isMe = u._id === currentUser?._id;
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        key: u._id,
        onClick: () => toggleUser(u._id),
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 8px",
          borderRadius: 6,
          fontSize: 12,
          cursor: "pointer",
          background: isChecked ? "#e8f4fa" : "transparent",
          color: COLOR_DEEP_BLUE,
          fontWeight: isChecked ? 600 : 400
        }
      },
      /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "checkbox",
          checked: isChecked,
          onChange: () => {
          },
          style: { cursor: "pointer", accentColor: COLOR_BLUE_GREEN, flexShrink: 0 }
        }
      ),
      /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, u.name || (isMe ? "You" : "User"), isMe && /* @__PURE__ */ React.createElement("span", { style: { color: COLOR_BLUE_GREEN, fontSize: 10, marginLeft: 4, fontWeight: 700 } }, "(You)")),
      (u.displayName || u.designation) && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, padding: "1px 5px", borderRadius: 4, background: "#f1f5f9", color: "#64748b", flexShrink: 0 } }, u.displayName || u.designation)
    );
  }))));
}
function AddTaskModal({ type = "todo", onClose, onCreated }) {
  const { user: currentUser } = useAuth();
  const [taskType] = useState(type === "call_followup" ? "call_followup" : type === "task" ? "task" : "todo");
  const isCallFollowup = taskType === "call_followup";
  const isTodo = taskType === "todo";
  const isTask = taskType === "task";
  const canAssign = !!currentUser;
  const [note, setNote] = useState(type === "todo" || type === "task" ? "1. " : "");
  const [scheduledAt, setScheduledAt] = useState("");
  const [priority, setPriority] = useState("medium");
  const [leadQuery, setLeadQuery] = useState("");
  const [leadResults, setLeadResults] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [repeatFrequency, setRepeatFrequency] = useState("none");
  const [repeatEndDate, setRepeatEndDate] = useState("");
  const isAdminOrExecutive = isExecutive(currentUser) || currentUser?.role === "admin" || currentUser?.role === "superadmin";
  const userDept = currentUser?.department || (isDeveloper(currentUser) ? "Developer" : isHR(currentUser) ? "HR" : isTrainer(currentUser) ? "Trainer" : isDigitalMarketing(currentUser) ? "Marketing" : "");
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(() => {
    if (!isAdminOrExecutive && userDept) {
      return userDept;
    }
    if (currentUser?.department && currentUser.department.toLowerCase() !== "admin") {
      return currentUser.department;
    }
    return "All";
  });
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState(() => currentUser?._id ? [currentUser._id] : []);
  const [assignedBy, setAssignedBy] = useState("");
  useEffect(() => {
    if ((isTodo || isTask) && (!note || !note.trim())) {
      setNote("1. ");
    }
  }, [taskType, isTodo, isTask]);
  useEffect(() => {
    if (!canAssign) return;
    usersAPI.getAll().then((res) => setUsers(res.data.users || [])).catch((err) => {
      console.error("Failed to load users for assignment:", err);
      setUsers([]);
    });
    departmentsAPI.getAll().then((res) => setDepartments(res.data.departments || [])).catch((err) => {
      console.error("Failed to load departments:", err);
      setDepartments([]);
    });
  }, [canAssign]);
  const assignableUsers = getTaskAssigneeOptions(currentUser, users, selectedDepartment);
  const assignedByUsers = getTaskAssignorOptions(currentUser, users);
  useEffect(() => {
    if (!assignableUsers || !assignableUsers.length) return;
    setSelectedAssigneeIds((prev) => {
      const valid = prev.filter((id) => assignableUsers.some((u) => u._id === id));
      if (valid.length > 0) return valid;
      return [assignableUsers[0]._id];
    });
  }, [selectedDepartment, users, currentUser]);
  useEffect(() => {
    if (!assignedByUsers || !assignedByUsers.length) return;
    if (!assignedByUsers.some((u) => u._id === assignedBy)) {
      setAssignedBy(assignedByUsers[0]._id);
    }
  }, [users, assignedBy, currentUser]);
  useEffect(() => {
    if (!isCallFollowup || selectedLead || leadQuery.trim().length < 2) {
      setLeadResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await leadsAPI.getAll({ search: leadQuery.trim(), limit: 6 });
        setLeadResults(res.data.leads || []);
      } catch (err) {
        setLeadResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [leadQuery, isCallFollowup, selectedLead]);
  const handleCreate = async () => {
    setError("");
    if (!note.trim()) {
      setError("Please enter a note / description");
      return;
    }
    if (!scheduledAt) {
      setError("Please choose a due date & time");
      return;
    }
    if (repeatFrequency !== "none" && !repeatEndDate) {
      setError("Please choose an end date for the repeating task");
      return;
    }
    if (repeatFrequency !== "none" && new Date(repeatEndDate) < new Date(scheduledAt)) {
      setError("Repeat end date must be after the due date");
      return;
    }
    setSaving(true);
    try {
      const targetAssignees = canAssign && selectedAssigneeIds.length > 0 ? selectedAssigneeIds : [currentUser._id];
      const finalAssignedBy = assignedBy || currentUser._id;
      const results = await Promise.all(
        targetAssignees.map(async (targetId) => {
          let resolvedTargetId = targetId;
          if (resolvedTargetId === "ameen_fallback") {
            const realAmeen = users.find((u) => u.name?.toLowerCase().trim() === "ameen");
            resolvedTargetId = realAmeen ? realAmeen._id : currentUser._id;
          }
          let resolvedAssignedBy = finalAssignedBy;
          if (resolvedAssignedBy === "ameen_fallback") {
            const realAmeen = users.find((u) => u.name?.toLowerCase().trim() === "ameen");
            resolvedAssignedBy = realAmeen ? realAmeen._id : currentUser._id;
          }
          const matchedDeptObj = departments.find((d) => typeof d !== "string" && d.name?.toLowerCase() === selectedDepartment.toLowerCase());
          const payload = {
            type: taskType,
            title: note.trim(),
            note: note.trim(),
            description: note.trim(),
            scheduledAt: new Date(scheduledAt).toISOString(),
            priority,
            assignedTo: resolvedTargetId,
            assignedBy: resolvedAssignedBy,
            department: selectedDepartment !== "All" ? selectedDepartment : "",
            departmentId: matchedDeptObj?._id || void 0
          };
          if (isCallFollowup && selectedLead) payload.lead = selectedLead._id;
          if (repeatFrequency !== "none") {
            payload.recurrence = {
              frequency: repeatFrequency,
              endDate: (/* @__PURE__ */ new Date(repeatEndDate + "T23:59:59")).toISOString()
            };
          }
          return followupsAPI.create(payload);
        })
      );
      if (results[0]?.data?.followup) {
        onCreated(results[0].data.followup);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create task");
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, background: "rgba(2, 48, 71, 0.45)", backdropFilter: "blur(2px)", zIndex: 1e3, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 14, width: "100%", maxWidth: 460, padding: 24, boxShadow: "0 12px 36px rgba(2, 48, 71, 0.16)", border: `1px solid ${COLOR_BORDER}`, maxHeight: "92vh", overflowY: "auto" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 } }, /* @__PURE__ */ React.createElement("h3", { style: { fontSize: 18, fontWeight: 500, color: COLOR_DEEP_BLUE, margin: 0 } }, taskType === "call_followup" ? "Create Call Follow-up" : taskType === "task" ? "Create Official Task" : "Create Todo Item"), /* @__PURE__ */ React.createElement("button", { onClick: onClose, style: { background: "none", border: "none", cursor: "pointer", fontSize: 22, color: COLOR_MUTED, lineHeight: 1 } }, "\xD7")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 15 } }, isCallFollowup && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 13, fontWeight: 500, color: COLOR_DEEP_BLUE, display: "block", marginBottom: 6 } }, "Link to Lead (Optional)"), selectedLead ? /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", background: COLOR_SKY_SURFACE, border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: "8px 12px" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 14, color: COLOR_DEEP_BLUE, fontWeight: 500 } }, selectedLead.name, " ", selectedLead.phone ? `(${selectedLead.phone})` : ""), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setSelectedLead(null), style: { background: "none", border: "none", color: COLOR_MUTED, cursor: "pointer", fontSize: 16 } }, "\u2715")) : /* @__PURE__ */ React.createElement("div", { style: { position: "relative" } }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      placeholder: "Type name or phone to search leads...",
      value: leadQuery,
      onChange: (e) => setLeadQuery(e.target.value),
      style: { width: "100%", border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: "9px 12px", fontSize: 14, outline: "none", boxSizing: "border-box", color: COLOR_DEEP_BLUE }
    }
  ), searching && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: COLOR_MUTED, marginTop: 4 } }, "Searching leads..."), leadResults.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, marginTop: 4, maxHeight: 180, overflowY: "auto", zIndex: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" } }, leadResults.map((l) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: l._id,
      onClick: () => {
        setSelectedLead(l);
        setLeadResults([]);
        setLeadQuery("");
      },
      style: { padding: "8px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid #f0f4f8" },
      onMouseEnter: (e) => e.currentTarget.style.background = COLOR_SKY_SURFACE,
      onMouseLeave: (e) => e.currentTarget.style.background = "transparent"
    },
    /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 500, color: COLOR_DEEP_BLUE } }, l.name),
    /* @__PURE__ */ React.createElement("span", { style: { color: COLOR_MUTED, marginLeft: 8 } }, l.phone)
  ))))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 13, fontWeight: 500, color: COLOR_DEEP_BLUE } }, isCallFollowup ? "Follow-up Details" : taskType === "task" ? "Official Task Description" : "Todo Task Description"), (isTodo || isTask) && /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => {
        const lines = (note || "").split("\n").filter(Boolean);
        const nextNum = lines.length + 1;
        setNote((prev) => prev && prev.trim() ? `${prev}
${nextNum}. ` : `${nextNum}. `);
      },
      style: {
        padding: "2px 8px",
        fontSize: 11.5,
        fontWeight: 600,
        borderRadius: 4,
        border: `1px solid ${COLOR_BORDER}`,
        background: COLOR_SKY_SURFACE,
        color: COLOR_BLUE_GREEN,
        cursor: "pointer"
      }
    },
    "+ Add Item"
  )), (isTodo || isTask) && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11.5, color: COLOR_ORANGE, marginBottom: 6, fontWeight: 500 } }, "Press ", /* @__PURE__ */ React.createElement("strong", null, "Enter"), " to automatically trigger 2., 3., 4."), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: note,
      onChange: (e) => setNote(e.target.value),
      onKeyDown: (e) => (isTodo || isTask) && handleNumericKeyDown(e, note, setNote),
      rows: 4,
      placeholder: isCallFollowup ? "What should this call be about?" : isTask ? "1. Describe official task detail 1...\n2. Task detail 2..." : "1. Write todo item here...",
      style: { width: "100%", border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, fontWeight: 400, resize: "none", outline: "none", boxSizing: "border-box", color: COLOR_DEEP_BLUE }
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 13, fontWeight: 500, color: COLOR_DEEP_BLUE, display: "block", marginBottom: 6 } }, "Due Date & Time"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10 } }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "date",
      value: scheduledAt ? scheduledAt.slice(0, 10) : "",
      onChange: (e) => {
        const timePart = scheduledAt ? scheduledAt.slice(11, 16) : "09:00";
        setScheduledAt(e.target.value + "T" + timePart);
      },
      style: { flex: 1, border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: "9px 12px", fontSize: 14, outline: "none", boxSizing: "border-box", color: COLOR_DEEP_BLUE }
    }
  ), /* @__PURE__ */ React.createElement(
    TimeInput12h,
    {
      value: scheduledAt ? scheduledAt.slice(11, 16) : "09:00",
      onChange: (time) => {
        const datePart = scheduledAt ? scheduledAt.slice(0, 10) : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
        setScheduledAt(datePart + "T" + time);
      }
    }
  ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 13, fontWeight: 500, color: COLOR_DEEP_BLUE, display: "block", marginBottom: 6 } }, "Priority"), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: priority,
      onChange: (e) => setPriority(e.target.value),
      style: { width: "100%", border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: "9px 12px", fontSize: 14, outline: "none", color: COLOR_DEEP_BLUE }
    },
    /* @__PURE__ */ React.createElement("option", { value: "high" }, "High"),
    /* @__PURE__ */ React.createElement("option", { value: "medium" }, "Medium"),
    /* @__PURE__ */ React.createElement("option", { value: "low" }, "Low")
  )), !isTodo && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 13, fontWeight: 500, color: COLOR_DEEP_BLUE, display: "block", marginBottom: 6 } }, "Recurrence"), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: repeatFrequency,
      onChange: (e) => setRepeatFrequency(e.target.value),
      style: { width: "100%", border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: "9px 12px", fontSize: 14, outline: "none", color: COLOR_DEEP_BLUE }
    },
    /* @__PURE__ */ React.createElement("option", { value: "none" }, "Does not repeat"),
    /* @__PURE__ */ React.createElement("option", { value: "daily" }, "Daily"),
    /* @__PURE__ */ React.createElement("option", { value: "weekly" }, "Weekly"),
    /* @__PURE__ */ React.createElement("option", { value: "monthly" }, "Monthly")
  ), repeatFrequency !== "none" && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10 } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 13, fontWeight: 500, color: COLOR_DEEP_BLUE, display: "block", marginBottom: 4 } }, "Repeat Until"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "date",
      value: repeatEndDate,
      min: scheduledAt ? scheduledAt.slice(0, 10) : void 0,
      onChange: (e) => setRepeatEndDate(e.target.value),
      style: { width: "100%", border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: "9px 12px", fontSize: 14, outline: "none", boxSizing: "border-box", color: COLOR_DEEP_BLUE }
    }
  ))), canAssign && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 13, fontWeight: 500, color: COLOR_DEEP_BLUE, display: "block", marginBottom: 6 } }, "Department Filter ", !isAdminOrExecutive ? `(${userDept || selectedDepartment})` : ""), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: selectedDepartment,
      onChange: (e) => setSelectedDepartment(e.target.value),
      disabled: !isAdminOrExecutive,
      style: {
        width: "100%",
        border: `1px solid ${COLOR_BORDER}`,
        borderRadius: 8,
        padding: "9px 12px",
        fontSize: 14,
        outline: "none",
        color: COLOR_DEEP_BLUE,
        background: !isAdminOrExecutive ? "#f8fafc" : "#fff",
        fontWeight: 500,
        cursor: !isAdminOrExecutive ? "not-allowed" : "pointer"
      }
    },
    isAdminOrExecutive ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("option", { value: "All" }, "All Departments"), departments.map((d) => {
      const dName = typeof d === "string" ? d : d.name || d.code;
      return /* @__PURE__ */ React.createElement("option", { key: d._id || dName, value: dName }, dName, " Department");
    })) : /* @__PURE__ */ React.createElement("option", { value: userDept || selectedDepartment }, userDept || selectedDepartment, " Department Only")
  )), canAssign && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 15 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 13, fontWeight: 500, color: COLOR_DEEP_BLUE, display: "block", marginBottom: 6 } }, "Assigned To ", selectedDepartment !== "All" ? `(${selectedDepartment})` : ""), /* @__PURE__ */ React.createElement(
    TaskAssigneeCheckboxDropdown,
    {
      assignableUsers,
      selectedIds: selectedAssigneeIds,
      onChange: setSelectedAssigneeIds,
      currentUser
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 13, fontWeight: 500, color: COLOR_DEEP_BLUE, display: "block", marginBottom: 6 } }, "Assigned By"), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: assignedBy,
      onChange: (e) => setAssignedBy(e.target.value),
      style: { width: "100%", border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: "9px 12px", fontSize: 14, outline: "none", color: COLOR_DEEP_BLUE, background: "#fff" }
    },
    assignedByUsers.map((u) => /* @__PURE__ */ React.createElement("option", { key: u._id, value: u._id }, u._id === currentUser?._id ? `${u.name || "You"} (You)` : `${u.name}${u.displayName || u.designation ? ` (${u.displayName || u.designation})` : ""}`))
  )))), error && /* @__PURE__ */ React.createElement("p", { style: { color: "#dc2626", fontSize: 13, marginTop: 12 } }, error), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, marginTop: 22 } }, /* @__PURE__ */ React.createElement("button", { onClick: onClose, style: { flex: 1, padding: "10px 14px", border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, background: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", color: COLOR_DEEP_BLUE } }, "Cancel"), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleCreate,
      disabled: saving,
      style: { flex: 1, padding: "10px 14px", border: "none", borderRadius: 8, background: COLOR_ORANGE, color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", opacity: saving ? 0.7 : 1 }
    },
    saving ? "Creating..." : `Create ${taskType === "call_followup" ? "Follow-up" : taskType === "task" ? "Task" : "Todo"}`
  ))));
}
function downloadCSV(tasks, tab) {
  const headers = ["Type", "Lead Name", "Phone", "Description / Note", "Assignee", "Assigned By", "Status", "Due Date (IST)", "Priority"];
  const rows = tasks.map((t) => [
    t.type === "todo" ? "Todo" : "Call Follow-up",
    t.lead?.name || "",
    t.lead?.phone || "",
    t.title || t.note || t.description || "",
    t.assignedTo?.name || "",
    (t.assignedBy?.name || t.assignedBy) === "all" ? "All" : t.assignedBy?.name || "",
    t.status || "",
    t.scheduledAt ? formatISTDateTime(t.scheduledAt) : "",
    t.priority || ""
  ]);
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${tab.replace(/ /g, "_")}_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
export default function Task() {
  const { userId: routeUserId } = useParams();
  const { user: currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const activeUserId = routeUserId || currentUser?._id;
  const getTabFromLocationOrQuery = useCallback(() => {
    const p = location.pathname.toLowerCase();
    if (p.includes("/todo")) return "Todo";
    if (p.includes("/follow-up") || p.includes("/followup")) return "Call Followups";
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      const lower = tabParam.toLowerCase();
      if (lower === "todo" || lower === "todo list" || lower === "todos") return "Todo";
      if (lower === "call followups" || lower === "call_followup" || lower === "calls") return "Call Followups";
      if (lower === "tasks" || lower === "all" || lower === "all tasks") return "Tasks";
    }
    return "Tasks";
  }, [location.pathname, searchParams]);
  const [activeTab, setActiveTab] = useState(getTabFromLocationOrQuery);
  useEffect(() => {
    const targetTab = getTabFromLocationOrQuery();
    if (targetTab !== activeTab) {
      setActiveTab(targetTab);
    }
  }, [getTabFromLocationOrQuery, activeTab]);
  useEffect(() => {
    if (currentUser?._id && !routeUserId) {
      const slug = activeTab === "Todo" ? "todo" : activeTab === "Call Followups" ? "follow-ups" : "tasks";
      navigate(`/${currentUser._id}/${slug}`, { replace: true });
    }
  }, [currentUser, routeUserId, activeTab, navigate]);
  const [historyModeMap, setHistoryModeMap] = useState({
    Tasks: false,
    Todo: false,
    "Call Followups": false
  });
  const historyMode = !!historyModeMap[activeTab];
  const setHistoryMode = (valOrFn) => {
    setHistoryModeMap((prev) => {
      const currentVal = !!prev[activeTab];
      const nextVal = typeof valOrFn === "function" ? valOrFn(currentVal) : valOrFn;
      return { ...prev, [activeTab]: nextVal };
    });
  };
  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    const idPrefix = activeUserId ? `/${activeUserId}` : currentUser?._id ? `/${currentUser._id}` : "";
    if (tab === "Todo") {
      navigate(`${idPrefix}/todo`);
    } else if (tab === "Call Followups") {
      navigate(`${idPrefix}/follow-ups`);
    } else {
      navigate(`${idPrefix}/tasks`);
    }
  };
  const [forFilter, setForFilter] = useState(() => {
    return currentUser?.role === "admin" || currentUser?.role === "manager" ? "Team" : "Me";
  });
  const [dueFilter, setDueFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState(["pending", "late", "cancelled"]);
  const [viewMode, setViewMode] = useState("cards");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdditional, setShowAdditional] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState("");
  const [sortField, setSortField] = useState("dueDate");
  const [sortDir, setSortDir] = useState("asc");
  const [editingTask, setEditingTask] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [descriptionPopup, setDescriptionPopup] = useState(null);
  const [teamUsers, setTeamUsers] = useState([]);
  const [teamMemberFilter, setTeamMemberFilter] = useState("");
  const [showTeamDrop, setShowTeamDrop] = useState(false);
  const teamDropRef = useRef(null);
  const checkCanDelete = (task) => {
    if (!currentUser) return false;
    if (currentUser.role === "admin" || currentUser.role === "superadmin" || currentUser.role === "manager" || isExecutive(currentUser) || isHR(currentUser)) return true;
    if (!task) return true;
    const createdBy = task.createdBy?._id || task.createdBy || task.assignedBy?._id || task.assignedBy;
    const assignedTo = task.assignedTo?._id || task.assignedTo || task.assignee?._id || task.assignee;
    return String(createdBy || "") === String(currentUser._id) || String(assignedTo || "") === String(currentUser._id);
  };
  const [markingCompleteId, setMarkingCompleteId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, forFilter, dueFilter, statusFilter, priorityFilter, teamMemberFilter, historyMode]);
  const canEditTask = (task) => {
    if (!currentUser) return false;
    if (currentUser.role === "admin" || currentUser.role === "superadmin" || currentUser.role === "manager" || isExecutive(currentUser) || isHR(currentUser)) return true;
    if (!task) return true;
    const createdBy = task.createdBy?._id || task.createdBy || task.assignedBy?._id || task.assignedBy;
    const assignedTo = task.assignedTo?._id || task.assignedTo || task.assignee?._id || task.assignee;
    return String(createdBy || "") === String(currentUser._id) || String(assignedTo || "") === String(currentUser._id);
  };
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      let queryType;
      if (activeTab === "Call Followups") queryType = "call_followup";
      else if (activeTab === "Todo") queryType = "todo";
      else queryType = "task";
      if (historyMode) {
        const res2 = await followupsAPI.getAll({
          userId: activeUserId,
          forMe: forFilter === "Me",
          due: dueFilter ? dueFilter.toLowerCase().replace(" ", "_") : void 0,
          status: "done",
          type: queryType,
          ...teamMemberFilter ? { callerId: teamMemberFilter } : {}
        });
        let items2 = res2.data.followups || res2.data.tasks || [];
        if (activeTab === "Todo") items2 = items2.filter((t) => t.status === "done" && t.type === "todo");
        else if (activeTab === "Call Followups") items2 = items2.filter((t) => t.status === "done" && t.type === "call_followup");
        else items2 = items2.filter((t) => t.status === "done" && (t.type === "task" || t.type !== "todo" && t.type !== "call_followup"));
        if (priorityFilter) items2 = items2.filter((t) => t.priority === priorityFilter);
        setTasks(items2);
        return;
      }
      const isAll = statusFilter.length === 3;
      const wantsLate = statusFilter.includes("late");
      const wantsPending = statusFilter.includes("pending");
      const wantsCancelled = statusFilter.includes("cancelled");
      const dbStatuses = [];
      if (wantsPending || wantsLate) dbStatuses.push("upcoming");
      if (wantsCancelled) dbStatuses.push("cancelled");
      const res = await followupsAPI.getAll({
        userId: activeUserId,
        forMe: forFilter === "Me",
        due: dueFilter ? dueFilter.toLowerCase().replace(" ", "_") : void 0,
        status: dbStatuses.join(","),
        type: queryType,
        ...teamMemberFilter ? { callerId: teamMemberFilter } : {}
      });
      let items = res.data.followups || res.data.tasks || [];
      if (activeTab === "Todo") items = items.filter((t) => t.status !== "done" && t.type === "todo");
      else if (activeTab === "Call Followups") items = items.filter((t) => t.status !== "done" && t.type === "call_followup");
      else items = items.filter((t) => t.status !== "done" && (t.type === "task" || t.type !== "todo" && t.type !== "call_followup"));
      if (!isAll) {
        const startOfToday = /* @__PURE__ */ new Date();
        startOfToday.setHours(0, 0, 0, 0);
        if (wantsLate && !wantsPending) {
          items = items.filter(
            (t) => t.status === "cancelled" && wantsCancelled || t.status === "upcoming" && new Date(t.scheduledAt || t.dueDate || t.createdAt) < startOfToday
          );
        } else if (wantsPending && !wantsLate) {
          items = items.filter(
            (t) => t.status === "cancelled" && wantsCancelled || t.status === "upcoming" && new Date(t.scheduledAt || t.dueDate || t.createdAt) >= startOfToday
          );
        }
      }
      if (priorityFilter) {
        items = items.filter((t) => t.priority === priorityFilter);
      }
      const seenGroupIds = /* @__PURE__ */ new Set();
      const seenRecurringKeys = /* @__PURE__ */ new Set();
      items = items.filter((t) => {
        const isRec = !!(t.recurrence?.frequency || t.recurrenceFrequency || t.recurrence && t.recurrence.frequency !== "none");
        if (!isRec) return true;
        if (t.recurringGroupId) {
          const gId = String(t.recurringGroupId);
          if (seenGroupIds.has(gId)) return false;
          seenGroupIds.add(gId);
          return true;
        }
        const assigneeId = t.assignedTo?._id || t.assignedTo || "";
        const taskTitle = (t.title || t.note || t.description || "").trim();
        const freq = t.recurrence?.frequency || t.recurrenceFrequency || "";
        const recKey = `${taskTitle}_${assigneeId}_${freq}`;
        if (seenRecurringKeys.has(recKey)) return false;
        seenRecurringKeys.add(recKey);
        return true;
      });
      setTasks(items);
    } catch (err) {
      console.error(err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, activeUserId, forFilter, dueFilter, statusFilter, priorityFilter, teamMemberFilter, historyMode]);
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);
  useEffect(() => {
    const handleTasksUpdated = () => {
      fetchTasks();
    };
    window.addEventListener("tasks-updated", handleTasksUpdated);
    return () => window.removeEventListener("tasks-updated", handleTasksUpdated);
  }, [fetchTasks]);
  useEffect(() => {
    usersAPI.getAll().then((r) => {
      const all = r.data.users || [];
      setTeamUsers(filterTeamDropdownUsers(all));
    }).catch(() => {
    });
  }, []);
  useEffect(() => {
    const handler = (e) => {
      if (teamDropRef.current && !teamDropRef.current.contains(e.target)) setShowTeamDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const fetchTasksRef = useRef(fetchTasks);
  useEffect(() => {
    fetchTasksRef.current = fetchTasks;
  }, [fetchTasks]);
  const additionalRef = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (additionalRef.current && !additionalRef.current.contains(e.target)) setShowAdditional(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else {
      setSortField(field);
      setSortDir("asc");
    }
  };
  const handleEditSaved = (updated) => {
    setTasks((prev) => {
      if (!historyMode && updated.status === "done") {
        return prev.filter((t) => t._id !== updated._id);
      }
      if (historyMode && updated.status !== "done") {
        return prev.filter((t) => t._id !== updated._id);
      }
      return prev.map((t) => t._id === updated._id ? { ...t, ...updated } : t);
    });
    setEditingTask(null);
  };
  const handleMarkComplete = async (taskId) => {
    setMarkingCompleteId(taskId);
    try {
      const task = tasks.find((t) => t._id === taskId);
      const isTodo = task?.type === "todo";
      const isRecurring = !isTodo && !!(task?.recurrence?.frequency || task?.recurrenceFrequency || task?.recurrence && task?.recurrence?.frequency !== "none");
      if (isRecurring && task) {
        const currentCount = task.completedCount || 0;
        const newCount = currentCount + 1;
        const current = new Date(task.scheduledAt || Date.now());
        const freq = (task.recurrence?.frequency || task.recurrenceFrequency || "daily").toLowerCase();
        if (freq === "weekly") current.setDate(current.getDate() + 7);
        else if (freq === "monthly") current.setMonth(current.getMonth() + 1);
        else current.setDate(current.getDate() + 1);
        const repeatEndDate = task.recurrence?.endDate;
        const maxDate = repeatEndDate ? new Date(repeatEndDate) : null;
        const isReachedEnd = maxDate ? current.getTime() > maxDate.getTime() + 864e5 - 1e3 : false;
        if (!isReachedEnd) {
          const newIsoDate = current.toISOString();
          await followupsAPI.update(taskId, {
            scheduledAt: newIsoDate,
            completedCount: newCount
          });
          setTasks((prev) => prev.map((t) => t._id === taskId ? { ...t, scheduledAt: newIsoDate, completedCount: newCount } : t));
          return;
        }
      }
      const completedTime = (/* @__PURE__ */ new Date()).toISOString();
      await followupsAPI.update(taskId, { status: "done", completedAt: completedTime });
      if (historyMode) {
        setTasks((prev) => prev.map((t) => t._id === taskId ? { ...t, status: "done", completedAt: completedTime } : t));
      } else {
        setTasks((prev) => prev.filter((t) => t._id !== taskId));
      }
    } catch (err) {
      console.error("Failed to mark task complete:", err);
      alert(err.response?.data?.message || "Failed to mark task complete");
    } finally {
      setMarkingCompleteId(null);
    }
  };
  const handleDelete = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      setDeletingTaskId(taskId);
      await followupsAPI.delete(taskId);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete task");
    } finally {
      setDeletingTaskId(null);
    }
  };
  const handleDateShift = async (task, step) => {
    const current = new Date(task.scheduledAt || Date.now());
    if (step === "today") {
      const today = /* @__PURE__ */ new Date();
      current.setFullYear(today.getFullYear(), today.getMonth(), today.getDate());
    } else {
      const freq = (task.recurrence?.frequency || task.recurrenceFrequency || "daily").toLowerCase();
      if (freq === "weekly") {
        current.setDate(current.getDate() + step * 7);
      } else if (freq === "monthly") {
        current.setMonth(current.getMonth() + step);
      } else {
        current.setDate(current.getDate() + step);
      }
    }
    const initialDueDate = task.initialScheduledAt || task.createdAt || task.scheduledAt;
    const repeatEndDate = task.recurrence?.endDate;
    const minDate = initialDueDate ? new Date(initialDueDate) : null;
    const maxDate = repeatEndDate ? new Date(repeatEndDate) : null;
    if (step === -1 && minDate && current.getTime() < minDate.getTime() - 6e4) {
      return;
    }
    if (step === 1 && maxDate && current.getTime() > maxDate.getTime() + 864e5 - 1e3) {
      return;
    }
    const newIsoDate = current.toISOString();
    try {
      await followupsAPI.update(task._id, { scheduledAt: newIsoDate });
      setTasks((prev) => prev.map((t) => t._id === task._id ? { ...t, scheduledAt: newIsoDate } : t));
    } catch (err) {
      console.error("Failed to shift date for recurring task:", err);
    }
  };
  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortField === "dueDate") {
      const ta = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
      const tb = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
      return sortDir === "asc" ? ta - tb : tb - ta;
    }
    if (sortField === "lead") {
      const la = (a.lead?.name || a.type || "").toLowerCase();
      const lb = (b.lead?.name || b.type || "").toLowerCase();
      return sortDir === "asc" ? la.localeCompare(lb) : lb.localeCompare(la);
    }
    if (sortField === "description") {
      const da = (a.title || a.note || a.description || "").toLowerCase();
      const db = (b.title || b.note || b.description || "").toLowerCase();
      return sortDir === "asc" ? da.localeCompare(db) : db.localeCompare(da);
    }
    if (sortField === "assignee") {
      const aa = (a.assignedTo?.name || a.assignee?.name || "").toLowerCase();
      const ab = (b.assignedTo?.name || b.assignee?.name || "").toLowerCase();
      return sortDir === "asc" ? aa.localeCompare(ab) : ab.localeCompare(aa);
    }
    if (sortField === "assignedBy") {
      const ba = ((a.assignedBy?.name || a.assignedBy) === "all" ? "All" : a.assignedBy?.name || "").toLowerCase();
      const bb = ((b.assignedBy?.name || b.assignedBy) === "all" ? "All" : b.assignedBy?.name || "").toLowerCase();
      return sortDir === "asc" ? ba.localeCompare(bb) : bb.localeCompare(ba);
    }
    if (sortField === "priority") {
      const order = { high: 3, medium: 2, low: 1 };
      const pa = order[a.priority] || 0;
      const pb = order[b.priority] || 0;
      return sortDir === "asc" ? pa - pb : pb - pa;
    }
    if (sortField === "status") {
      const sa = (a.status || "").toLowerCase();
      const sb = (b.status || "").toLowerCase();
      return sortDir === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
    }
    return 0;
  });
  const totalItems = sortedTasks.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedTasks = sortedTasks.slice(startIndex, endIndex);
  return /* @__PURE__ */ React.createElement("div", { style: { padding: "20px 16px", background: "#f4f8fb", minHeight: "100vh", boxSizing: "border-box" } }, /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 1380, margin: "0 auto", width: "100%" } }, descriptionPopup && /* @__PURE__ */ React.createElement(
    "div",
    {
      style: { position: "fixed", inset: 0, background: "rgba(2, 48, 71, 0.45)", backdropFilter: "blur(2px)", zIndex: 1e3, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
      onClick: () => setDescriptionPopup(null)
    },
    /* @__PURE__ */ React.createElement(
      "div",
      {
        style: { background: "#fff", borderRadius: 14, width: "100%", maxWidth: 500, padding: 26, boxShadow: "0 12px 36px rgba(2, 48, 71, 0.16)", border: `1px solid ${COLOR_BORDER}` },
        onClick: (e) => e.stopPropagation()
      },
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 } }, /* @__PURE__ */ React.createElement("h3", { style: { fontSize: 17, fontWeight: 500, color: COLOR_DEEP_BLUE, margin: 0 } }, "Task Description"), /* @__PURE__ */ React.createElement("button", { onClick: () => setDescriptionPopup(null), style: { background: "none", border: "none", cursor: "pointer", fontSize: 22, color: COLOR_MUTED, lineHeight: 1 } }, "\xD7")),
      /* @__PURE__ */ React.createElement("p", { style: { fontSize: 14, color: "#334155", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap", fontWeight: 400 } }, descriptionPopup)
    )
  ), editingTask && /* @__PURE__ */ React.createElement(
    EditModal,
    {
      task: editingTask,
      onClose: () => setEditingTask(null),
      onSaved: handleEditSaved,
      readOnly: !canEditTask(editingTask)
    }
  ), showUploadModal && /* @__PURE__ */ React.createElement(
    UploadModal,
    {
      activeTab,
      onClose: () => setShowUploadModal(false),
      onImported: fetchTasks
    }
  ), showAddModal && /* @__PURE__ */ React.createElement(
    AddTaskModal,
    {
      type: activeTab === "Call Followups" ? "call_followup" : activeTab === "Todo" ? "todo" : "task",
      onClose: () => setShowAddModal(false),
      onCreated: () => {
        fetchTasksRef.current();
      }
    }
  ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 16 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h1", { style: { fontSize: 26, fontWeight: 500, color: COLOR_DEEP_BLUE, margin: 0, letterSpacing: "-0.01em" } }, activeTab === "Todo" ? "Todo List & Actions" : activeTab === "Call Followups" ? "Call Follow-up Management" : "Tasks & Todo Management"), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 14, color: COLOR_MUTED, margin: "4px 0 0", fontWeight: 400 } }, activeTab === "Todo" ? "Organize daily to-dos, shift tasks, and internal assignments" : activeTab === "Call Followups" ? "Track call follow-ups, customer schedules, and lead commitments" : "Overview of all tasks, shift goals, and call follow-up commitments")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: fetchTasks,
      title: "Refresh tasks",
      style: {
        width: 38,
        height: 38,
        borderRadius: 8,
        border: `1px solid ${COLOR_BORDER}`,
        background: "#fff",
        color: COLOR_BLUE_GREEN,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 1px 4px rgba(2, 48, 71, 0.04)",
        transition: "all 0.15s ease"
      }
    },
    /* @__PURE__ */ React.createElement("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, /* @__PURE__ */ React.createElement("polyline", { points: "1 4 1 10 7 10" }), /* @__PURE__ */ React.createElement("path", { d: "M3.51 15a9 9 0 1 0 .49-5" }))
  ), !historyMode && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setShowAddModal(true),
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: COLOR_ORANGE,
        border: "none",
        borderRadius: 8,
        cursor: "pointer",
        fontSize: 14,
        color: "#fff",
        fontWeight: 500,
        padding: "9px 18px",
        boxShadow: "0 2px 8px rgba(251, 133, 0, 0.25)",
        transition: "background 0.15s ease"
      }
    },
    /* @__PURE__ */ React.createElement("svg", { width: "15", height: "15", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.2" }, /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "5", x2: "12", y2: "19" }), /* @__PURE__ */ React.createElement("line", { x1: "5", y1: "12", x2: "19", y2: "12" })),
    activeTab === "Todo" ? "New Todo" : activeTab === "Call Followups" ? "New Follow-up" : "New Task"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setShowUploadModal(true),
      style: {
        display: "flex",
        alignItems: "center",
        gap: 7,
        background: COLOR_SKY_SURFACE,
        border: `1px solid ${COLOR_BORDER}`,
        borderRadius: 8,
        cursor: "pointer",
        fontSize: 14,
        color: COLOR_BLUE_GREEN,
        fontWeight: 500,
        padding: "9px 16px",
        transition: "all 0.15s ease"
      },
      title: activeTab === "Todo" ? "Open Todo List Excel/CSV Upload Form" : "Open Tasks Upload Form"
    },
    /* @__PURE__ */ React.createElement("svg", { width: "15", height: "15", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, /* @__PURE__ */ React.createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), /* @__PURE__ */ React.createElement("polyline", { points: "17 8 12 3 7 8" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "3", x2: "12", y2: "15" })),
    activeTab === "Todo" ? "Upload Todo List" : "Upload Tasks"
  )), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => fetchTasks(),
      disabled: loading,
      title: `Refresh ${activeTab === "Todo" ? "Todo List" : activeTab === "Call Followups" ? "Call Follow-ups" : "Tasks"}`,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 7,
        background: "#fff",
        border: `1px solid ${COLOR_BORDER}`,
        borderRadius: 8,
        cursor: loading ? "not-allowed" : "pointer",
        fontSize: 14,
        color: COLOR_DEEP_BLUE,
        fontWeight: 500,
        padding: "9px 16px",
        transition: "all 0.15s ease"
      }
    },
    /* @__PURE__ */ React.createElement(
      "svg",
      {
        width: "15",
        height: "15",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: COLOR_BLUE_GREEN,
        strokeWidth: "2.2",
        style: {
          animation: loading ? "spin 1s linear infinite" : "none"
        }
      },
      /* @__PURE__ */ React.createElement("path", { d: "M21.5 2v6h-6M2.5 22v-6h6" }),
      /* @__PURE__ */ React.createElement("path", { d: "M2 11.5a10 10 0 0 1 18.8-4.3L21.5 8M22 12.5a10 10 0 0 1-18.8 4.3L2.5 16" })
    ),
    "Refresh ",
    activeTab === "Todo" ? "Todo" : activeTab === "Call Followups" ? "Follow-ups" : "Tasks"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => downloadCSV(tasks, activeTab),
      style: {
        display: "flex",
        alignItems: "center",
        gap: 7,
        background: "#fff",
        border: `1px solid ${COLOR_BORDER}`,
        borderRadius: 8,
        cursor: "pointer",
        fontSize: 14,
        color: COLOR_DEEP_BLUE,
        fontWeight: 500,
        padding: "9px 16px",
        transition: "all 0.15s ease"
      }
    },
    /* @__PURE__ */ React.createElement("svg", { width: "15", height: "15", viewBox: "0 0 24 24", fill: "none", stroke: COLOR_BLUE_GREEN, strokeWidth: "2" }, /* @__PURE__ */ React.createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), /* @__PURE__ */ React.createElement("polyline", { points: "7 10 12 15 17 10" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "15", x2: "12", y2: "3" })),
    "Export CSV"
  ))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${COLOR_BORDER}`, marginBottom: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 4 } }, ["Tasks", "Todo", "Call Followups"].map((tab) => {
    const isActive = activeTab === tab;
    const isTabHistoryOn = !!historyModeMap[tab];
    const tabLabel = tab === "Tasks" ? "Tasks" : tab === "Todo" ? "Todo List & Actions" : "Call Followups";
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: tab,
        onClick: () => handleTabSwitch(tab),
        style: {
          padding: "11px 22px",
          border: "none",
          background: "none",
          cursor: "pointer",
          fontSize: 15,
          fontWeight: isActive ? 600 : 500,
          color: isActive ? COLOR_DEEP_BLUE : COLOR_MUTED,
          borderBottom: isActive ? `3px solid ${COLOR_ORANGE}` : "3px solid transparent",
          marginBottom: -1,
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderRadius: "8px 8px 0 0",
          boxShadow: isActive ? "0 4px 14px rgba(251, 133, 0, 0.12)" : "none"
        }
      },
      tab === "Tasks" ? /* @__PURE__ */ React.createElement("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: isActive ? COLOR_ORANGE : "currentColor", strokeWidth: "2.2" }, /* @__PURE__ */ React.createElement("rect", { x: "3", y: "3", width: "7", height: "7" }), /* @__PURE__ */ React.createElement("rect", { x: "14", y: "3", width: "7", height: "7" }), /* @__PURE__ */ React.createElement("rect", { x: "14", y: "14", width: "7", height: "7" }), /* @__PURE__ */ React.createElement("rect", { x: "3", y: "14", width: "7", height: "7" })) : tab === "Call Followups" ? /* @__PURE__ */ React.createElement("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: isActive ? COLOR_ORANGE : "currentColor", strokeWidth: "2.2" }, /* @__PURE__ */ React.createElement("path", { d: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9a16 16 0 0 0 6.29 6.29l1.42-1.42a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" })) : /* @__PURE__ */ React.createElement("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: isActive ? COLOR_ORANGE : "currentColor", strokeWidth: "2.2" }, /* @__PURE__ */ React.createElement("polyline", { points: "9 11 12 14 22 4" }), /* @__PURE__ */ React.createElement("path", { d: "M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" })),
      /* @__PURE__ */ React.createElement("span", null, tabLabel),
      isTabHistoryOn && /* @__PURE__ */ React.createElement("span", { className: "px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300" }, "History")
    );
  })), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setHistoryMode((p) => !p),
      style: {
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "11px 18px",
        border: "none",
        background: historyMode ? "#fef3c7" : "none",
        borderRadius: "8px 8px 0 0",
        cursor: "pointer",
        fontSize: 14,
        fontWeight: 600,
        color: historyMode ? "#92400e" : COLOR_MUTED,
        borderBottom: historyMode ? `3px solid ${COLOR_AMBER}` : "3px solid transparent",
        marginBottom: -1,
        transition: "all 0.15s ease"
      }
    },
    /* @__PURE__ */ React.createElement("svg", { width: "15", height: "15", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "9" }), /* @__PURE__ */ React.createElement("polyline", { points: "12 7 12 12 15 14" })),
    /* @__PURE__ */ React.createElement("span", null, "Completed ", activeTab === "Todo" ? "Todo" : activeTab === "Call Followups" ? "Follow-up" : "Task", " History"),
    historyMode && /* @__PURE__ */ React.createElement("span", { className: "ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-amber-600 text-white" }, "ON")
  )), historyMode && /* @__PURE__ */ React.createElement("div", { style: { background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 10, padding: "11px 16px", marginBottom: 16, fontSize: 13, color: "#065f46", fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 } }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-emerald-800" }, "\u{1F4DC} Completed ", activeTab === "Todo" ? "Todos" : activeTab === "Call Followups" ? "Call Follow-ups" : "Tasks", " History Mode:"), /* @__PURE__ */ React.createElement("span", { className: "text-emerald-700 font-normal" }, "Showing completed items for ", activeTab === "Todo" ? "Todos" : activeTab === "Call Followups" ? "Call Follow-ups" : "Tasks", ".")), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setHistoryMode(false),
      className: "text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-all shadow-xs shrink-0"
    },
    "Show Active ",
    activeTab === "Todo" ? "Todos" : activeTab === "Call Followups" ? "Call Follow-ups" : "Tasks"
  )), /* @__PURE__ */ React.createElement(
    TaskSummaryWidget,
    {
      tasks,
      activeTab,
      priorityFilter,
      setPriorityFilter
    }
  ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap", background: "#fff", padding: "12px 18px", borderRadius: 10, border: `1px solid ${COLOR_BORDER}` } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 14, color: COLOR_MUTED, fontWeight: 500 } }, "Filter For:"), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setForFilter("Me"),
      style: {
        padding: "6px 14px",
        borderRadius: 6,
        border: "none",
        background: forFilter === "Me" ? COLOR_BLUE_GREEN : COLOR_SKY_SURFACE,
        color: forFilter === "Me" ? "#fff" : COLOR_DEEP_BLUE,
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.15s ease"
      }
    },
    "My ",
    activeTab === "Todo" ? "Todos" : "Tasks"
  ), !isLimitedStaff(currentUser) && /* @__PURE__ */ React.createElement("div", { ref: teamDropRef, style: { position: "relative" } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setForFilter("Team");
        setShowTeamDrop((p) => !p);
      },
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 14px",
        borderRadius: 6,
        border: "none",
        background: forFilter === "Team" ? COLOR_BLUE_GREEN : COLOR_SKY_SURFACE,
        color: forFilter === "Team" ? "#fff" : COLOR_DEEP_BLUE,
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.15s ease"
      }
    },
    teamMemberFilter ? teamUsers.find((u) => u._id === teamMemberFilter)?.name || "Team" : "Team",
    /* @__PURE__ */ React.createElement("svg", { width: "10", height: "10", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5" }, /* @__PURE__ */ React.createElement("polyline", { points: showTeamDrop ? "18 15 12 9 6 15" : "6 9 12 15 18 9" }))
  ), showTeamDrop && /* @__PURE__ */ React.createElement("div", { style: {
    position: "absolute",
    top: "115%",
    left: 0,
    zIndex: 300,
    background: "#fff",
    border: `1px solid ${COLOR_BORDER}`,
    borderRadius: 8,
    boxShadow: "0 8px 24px rgba(2, 48, 71, 0.12)",
    minWidth: 200,
    padding: "6px 0"
  } }, /* @__PURE__ */ React.createElement(
    "div",
    {
      onClick: () => {
        setTeamMemberFilter("");
        setShowTeamDrop(false);
      },
      style: { padding: "9px 14px", fontSize: 13, cursor: "pointer", color: !teamMemberFilter ? COLOR_BLUE_GREEN : COLOR_DEEP_BLUE, fontWeight: 500, background: !teamMemberFilter ? COLOR_SKY_SURFACE : "transparent" }
    },
    "All (HR, CTO, MD)"
  ), teamUsers.map((u) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: u._id,
      onClick: () => {
        setTeamMemberFilter(u._id);
        setShowTeamDrop(false);
      },
      style: { padding: "9px 14px", fontSize: 13, cursor: "pointer", color: teamMemberFilter === u._id ? COLOR_BLUE_GREEN : COLOR_DEEP_BLUE, fontWeight: 400, background: teamMemberFilter === u._id ? COLOR_SKY_SURFACE : "transparent", display: "flex", alignItems: "center", gap: 8 }
    },
    /* @__PURE__ */ React.createElement("div", { style: { width: 22, height: 22, borderRadius: "50%", background: COLOR_SKY_SURFACE, color: COLOR_DEEP_BLUE, fontSize: 10, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } }, u.name.slice(0, 2).toUpperCase()),
    /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 500 } }, u.name), u.designation && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: COLOR_MUTED } }, u.designation))
  ))))), /* @__PURE__ */ React.createElement("div", { style: { width: 1, height: 22, background: COLOR_BORDER } }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 14, color: COLOR_MUTED, fontWeight: 500 } }, "Due:"), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: dueFilter || "",
      onChange: (e) => setDueFilter(e.target.value || null),
      style: {
        border: `1px solid ${dueFilter ? COLOR_BLUE_GREEN : COLOR_BORDER}`,
        borderRadius: 6,
        padding: "6px 12px",
        fontSize: 13,
        fontWeight: 400,
        background: dueFilter ? COLOR_SKY_SURFACE : "#fff",
        color: COLOR_DEEP_BLUE,
        outline: "none",
        cursor: "pointer"
      }
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, "All Time"),
    ["Today", "Tomorrow", "This Week", "Overdue"].map((opt) => /* @__PURE__ */ React.createElement("option", { key: opt, value: opt }, opt))
  )), !historyMode && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { width: 1, height: 22, background: COLOR_BORDER } }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 14, color: COLOR_MUTED, fontWeight: 500 } }, "Status:"), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: statusFilter.length === 1 ? statusFilter[0] : statusFilter.length === 3 ? "all" : "custom",
      onChange: (e) => {
        const val = e.target.value;
        if (val === "all") setStatusFilter(["pending", "late", "cancelled"]);
        else if (val === "pending") setStatusFilter(["pending"]);
        else if (val === "late") setStatusFilter(["late"]);
        else if (val === "cancelled") setStatusFilter(["cancelled"]);
      },
      style: {
        border: `1px solid ${statusFilter.length < 3 ? COLOR_BLUE_GREEN : COLOR_BORDER}`,
        borderRadius: 6,
        padding: "6px 12px",
        fontSize: 13,
        fontWeight: 400,
        background: statusFilter.length < 3 ? COLOR_SKY_SURFACE : "#fff",
        color: COLOR_DEEP_BLUE,
        outline: "none",
        cursor: "pointer"
      }
    },
    /* @__PURE__ */ React.createElement("option", { value: "all" }, "All Statuses"),
    /* @__PURE__ */ React.createElement("option", { value: "pending" }, "Upcoming"),
    /* @__PURE__ */ React.createElement("option", { value: "late" }, "Overdue / Late"),
    /* @__PURE__ */ React.createElement("option", { value: "cancelled" }, "Cancelled")
  ))), /* @__PURE__ */ React.createElement("div", { style: { width: 1, height: 22, background: COLOR_BORDER } }), /* @__PURE__ */ React.createElement("div", { ref: additionalRef, style: { display: "flex", alignItems: "center", gap: 8, position: "relative" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 14, color: COLOR_MUTED, fontWeight: 500 } }, "Priority:"), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: priorityFilter,
      onChange: (e) => setPriorityFilter(e.target.value),
      style: {
        border: `1px solid ${priorityFilter ? COLOR_BLUE_GREEN : COLOR_BORDER}`,
        borderRadius: 6,
        padding: "6px 12px",
        fontSize: 13,
        fontWeight: 400,
        background: priorityFilter ? COLOR_SKY_SURFACE : "#fff",
        color: COLOR_DEEP_BLUE,
        outline: "none",
        cursor: "pointer"
      }
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, "All Priorities"),
    /* @__PURE__ */ React.createElement("option", { value: "high" }, "High"),
    /* @__PURE__ */ React.createElement("option", { value: "medium" }, "Medium"),
    /* @__PURE__ */ React.createElement("option", { value: "low" }, "Low")
  )), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: COLOR_MUTED, fontWeight: 400 } }, /* @__PURE__ */ React.createElement("span", { style: { color: COLOR_DEEP_BLUE, fontWeight: 500 } }, tasks.length), " ", activeTab === "Todo" ? "todos" : "tasks", " found"))), activeTab === "Todo" ? /* @__PURE__ */ React.createElement(
    TodoList,
    {
      tasks,
      fetchTasks,
      onEditTask: setEditingTask,
      onCompleteTask: handleMarkComplete,
      onDeleteTask: handleDelete,
      historyMode,
      markingId: markingCompleteId,
      deletingId: deletingTaskId,
      priorityFilter,
      setPriorityFilter
    }
  ) : /* @__PURE__ */ React.createElement(React.Fragment, null, !loading && paginatedTasks.length > 0 ? /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" }, paginatedTasks.map((task) => /* @__PURE__ */ React.createElement(
    TodoCard,
    {
      key: task._id,
      task,
      onEdit: setEditingTask,
      onComplete: handleMarkComplete,
      onDelete: handleDelete,
      canDelete: checkCanDelete(task),
      isLocked: isTaskLocked(task.scheduledAt),
      markingId: markingCompleteId,
      deletingId: deletingTaskId,
      onDateShift: handleDateShift
    }
  ))), totalItems > 0 && /* @__PURE__ */ React.createElement("div", { style: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 20px",
    background: "#fff",
    border: `1px solid ${COLOR_BORDER}`,
    borderRadius: 12,
    flexWrap: "wrap",
    gap: 12
  } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 14 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, color: COLOR_MUTED, fontWeight: 400 } }, "Showing ", /* @__PURE__ */ React.createElement("strong", { style: { color: COLOR_DEEP_BLUE, fontWeight: 500 } }, startIndex + 1), " to ", /* @__PURE__ */ React.createElement("strong", { style: { color: COLOR_DEEP_BLUE, fontWeight: 500 } }, endIndex), " of ", /* @__PURE__ */ React.createElement("strong", { style: { color: COLOR_DEEP_BLUE, fontWeight: 500 } }, totalItems), " ", activeTab === "Todo" ? "todos" : "tasks"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, color: COLOR_MUTED, fontWeight: 400 } }, "Rows:"), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: pageSize,
      onChange: (e) => {
        setPageSize(Number(e.target.value));
        setCurrentPage(1);
      },
      style: {
        padding: "4px 8px",
        border: `1px solid ${COLOR_BORDER}`,
        borderRadius: 6,
        fontSize: 13,
        background: "#fff",
        color: COLOR_DEEP_BLUE,
        outline: "none",
        cursor: "pointer"
      }
    },
    /* @__PURE__ */ React.createElement("option", { value: 10 }, "10"),
    /* @__PURE__ */ React.createElement("option", { value: 20 }, "20"),
    /* @__PURE__ */ React.createElement("option", { value: 50 }, "50")
  ))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setCurrentPage((p) => Math.max(p - 1, 1)),
      disabled: currentPage <= 1,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 14px",
        borderRadius: 6,
        border: `1px solid ${currentPage <= 1 ? "#e2e8f0" : COLOR_BORDER}`,
        background: currentPage <= 1 ? "#f8fafc" : "#fff",
        color: currentPage <= 1 ? "#94a3b8" : COLOR_DEEP_BLUE,
        fontSize: 13,
        fontWeight: 500,
        cursor: currentPage <= 1 ? "not-allowed" : "pointer",
        transition: "all 0.15s ease"
      }
    },
    /* @__PURE__ */ React.createElement("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5" }, /* @__PURE__ */ React.createElement("polyline", { points: "15 18 9 12 15 6" })),
    "Previous"
  ), /* @__PURE__ */ React.createElement("div", { style: {
    fontSize: 13,
    color: COLOR_DEEP_BLUE,
    padding: "6px 12px",
    borderRadius: 6,
    background: COLOR_SKY_SURFACE,
    border: `1px solid ${COLOR_BORDER}`,
    fontWeight: 500
  } }, currentPage, " of ", totalPages), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setCurrentPage((p) => Math.min(p + 1, totalPages)),
      disabled: currentPage >= totalPages,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 14px",
        borderRadius: 6,
        border: `1px solid ${currentPage >= totalPages ? "#e2e8f0" : COLOR_BORDER}`,
        background: currentPage >= totalPages ? "#f8fafc" : "#fff",
        color: currentPage >= totalPages ? "#94a3b8" : COLOR_DEEP_BLUE,
        fontSize: 13,
        fontWeight: 500,
        cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
        transition: "all 0.15s ease"
      }
    },
    "Next",
    /* @__PURE__ */ React.createElement("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5" }, /* @__PURE__ */ React.createElement("polyline", { points: "9 18 15 12 9 6" }))
  )))) : loading ? /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", border: `1px solid ${COLOR_BORDER}`, borderRadius: 12, padding: "40px 20px", textAlign: "center" } }, /* @__PURE__ */ React.createElement(OrangeLoadingState, null)) : /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", border: `1px dashed ${COLOR_BORDER}`, borderRadius: 12, padding: "60px 20px", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, color: COLOR_DEEP_BLUE, fontWeight: 500 } }, "No ", activeTab === "Todo" ? "Todos" : activeTab === "Call Followups" ? "Call Follow-ups" : "Tasks", " Found"), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 14, color: COLOR_MUTED, margin: "6px 0 0", fontWeight: 400 } }, historyMode ? `No completed ${activeTab === "Todo" ? "todos" : "tasks"} in history` : `You're all caught up! Create a new ${activeTab === "Todo" ? "todo" : "task"} or upload an Excel/CSV list.`)))));
}
