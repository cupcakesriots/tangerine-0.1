import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { AppLayout } from "~/components/AppLayout";
import { FocusTimerCard, TaskRescheduleCard, TaskCreatorCard, SmartRescheduleCard } from "~/components/CoachActions";
import {
  isOnboardingComplete,
  getCoachMessages,
  addCoachMessage,
  clearCoachMessages,
  getTasks,
  getTodaysWellness,
  getOnboarding,
  updateTask,
  generateId,
  type CoachMessage,
  type Subtask,
  type SmartRescheduleTask,
} from "~/lib/storage";

export const Route = createFileRoute("/coach")({
  component: CoachPage,
});

/* ───────────────────────────────────────────
   Domain-Expert Coaching Engine
   ─────────────────────────────────────────── */

interface CoachContext {
  activeTasks: number;
  highPriorityTasks: number;
  energyLevel: number | null;
  moods: string[];
  painPoints: string[];
  userName: string;
  timeOfDay: "morning" | "afternoon" | "evening";
  recentMessages: CoachMessage[];
}

function buildCoachContext(): CoachContext {
  const tasks = getTasks();
  const active = tasks.filter((t) => t.status === "active");
  const highPriority = active.filter((t) => t.priority === "high");
  const wellness = getTodaysWellness();
  const onboarding = getOnboarding();
  const hour = new Date().getHours();
  const msgs = getCoachMessages();

  return {
    activeTasks: active.length,
    highPriorityTasks: highPriority.length,
    energyLevel: wellness?.energyLevel ?? null,
    moods: wellness?.moods ?? [],
    painPoints: onboarding?.painPoints ?? [],
    userName: onboarding?.name ?? "",
    timeOfDay: hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening",
    recentMessages: msgs.slice(-6),
  };
}

// ── ADHD-specific coaching prompts ──
const adhdInsights = [
  "**Body doubling** can make starting easier — even just imagining someone working alongside you. Want to try a virtual body-double session?",
  "ADHD brains crave **novelty and urgency**. Try setting a 10-minute 'race the clock' timer for your most avoided task.",
  "**Transition friction** is real. Instead of 'start the report,' try 'open the document and type one heading.' The threshold is lower.",
  "If prioritization feels impossible, try the **'interest-first' approach**: do the task that's most appealing right now. Momentum is more valuable than the 'right' order.",
  "Object permanence works against you — if you can't see it, it doesn't exist. Put your one focus task on a sticky note right in front of you.",
  "**Dopamine stacking**: pair a low-interest task with something pleasurable (music, a favorite drink, a cozy spot). The task borrows the dopamine.",
];

// ── Burnout recovery prompts ──
const burnoutInsights = [
  "Burnout recovery isn't about doing more — it's about **doing less with full permission**. What's one thing you can consciously choose NOT to do today?",
  "**Energy accounting**: imagine you have 4 'energy coins' today. Every task costs coins. Which tasks genuinely deserve your coins?",
  "The nervous system needs **completion signals**. Even tiny tasks (drinking water, stretching for 30 seconds) tell your brain 'we did something.'",
  "**Micro-wins**: pick 3 things that each take under 2 minutes. Completing them builds a foundation of agency without depleting you.",
  "Burnout often comes from **chronic output without input**. What's one thing you can do today that fills you up instead of drains you?",
  "Recovery is cyclical, not linear. A 'low' day isn't a setback — it's your system requesting maintenance. Grant it.",
];

// ── Variable-capacity prompts ──
const variableCapacityInsights = [
  "**Good-day / bad-day menus**: keep two task lists — one for high-energy windows, one for 'just keeping the lights on.' Both are valid.",
  "Think of energy like a **phone battery**. Some days you wake at 80%, some at 20%. Plan accordingly — a 20% day isn't a failure, it's a different mode.",
  "**Pacing**: spread effort across the day in small bursts rather than one exhausting sprint. The goal is consistency, not heroics.",
  "Your capacity isn't fixed — it responds to food, sleep, stress, weather, even barometric pressure. Tracking patterns helps you plan with, not against, your body.",
  "**Energy banking**: on good days, resist the urge to 'catch up' on everything. Bank some rest for the next low day.",
  "The spoon theory applies: you have a finite number of spoons. You decide where they go. There is no 'right' number of spoons to have.",
];

// ── Thought Reframing Pairs ──
const thoughtReframePairs: { negative: string; reframe: string }[] = [
  { negative: "I'm so behind, I'll never catch up.", reframe: "Catching up is a myth. I can only start from now. What's one step I can take today?" },
  { negative: "I should be able to handle this.", reframe: "Difficulty doesn't mean weakness. This IS hard, and I'm doing my best with what I have." },
  { negative: "I wasted the whole morning.", reframe: "The day isn't over. The afternoon is a fresh start — what would feel meaningful in the time that remains?" },
  { negative: "Everyone else has it together.", reframe: "Comparison is a thief. I'm seeing their highlight reel, not their behind-the-scenes. My path is my own." },
  { negative: "If I can't do it perfectly, why bother?", reframe: "Done imperfectly is infinitely better than not done. A messy draft still moves things forward." },
  { negative: "I don't have enough energy to do anything useful.", reframe: "Rest IS useful. Choosing rest is a productive decision. What's the gentlest possible thing I could do?" },
  { negative: "I keep procrastinating — something's wrong with me.", reframe: "Procrastination is often protection, not laziness. What might I be protecting myself from? Let's explore that." },
];

// ── Decision Trees ──
const decisionTrees: Record<string, { label: string; action: string; icon: string }[]> = {
  "what-next": [
    { label: "Tackle one high-priority task", action: "focus", icon: "⚡" },
    { label: "Do a quick 5-minute reset", action: "reset", icon: "🌸" },
    { label: "Break down a scary task", action: "breakdown", icon: "🧩" },
    { label: "Take a mindful pause first", action: "breathe", icon: "🧘" },
  ],
  "energize": [
    { label: "5-minute chair yoga", action: "stretch", icon: "🧘" },
    { label: "Box breathing reset", action: "breathe", icon: "🫁" },
    { label: "Step outside briefly", action: "outside", icon: "🌿" },
    { label: "Hydrate & snack", action: "nourish", icon: "💧" },
  ],
  "unblock": [
    { label: "I'm missing information", action: "missing-info", icon: "🧩" },
    { label: "Task feels too big", action: "overwhelm", icon: "🌪️" },
    { label: "I'm emotionally stuck", action: "mindset", icon: "🧼" },
    { label: "My energy is too low", action: "low-energy", icon: "🔋" },
  ],
};

// ── Shared task parser: extracts actionable items from free text ──
function parseUserTasks(text: string): { name: string; priority: "low" | "medium" | "high" }[] {
const items: { name: string; priority: "low" | "medium" | "high" }[] = [];
// Strip prefix phrases
const cleaned = text
  .replace(/^(i need to|i have to|i must|i should|i want to|i've got to|i gotta|things i need to do[:;]?|here's what i need to do[:;]?)\s*/i, "");
// Split on common separators
const segments = cleaned.split(/(?:,?\s+(?:and\s+|then\s+|also\s+)?|,\s*|;\s*)/i).filter(Boolean);

for (const seg of segments) {
  let s = seg.trim()
    .replace(/^to\s+/, "")
    .replace(/[.!]$/, "")
    .replace(/^(write|draft|create|make|do|check|review|call|email|research|prepare|organize|finish|complete|update|send|schedule|plan|clean)\s+/i, "$1 ")
    .trim();
  if (s.length < 3) continue;
  // Capitalize first
  s = s.charAt(0).toUpperCase() + s.slice(1);
  let priority: "low" | "medium" | "high" = "medium";
  const l = s.toLowerCase();
  if (["maybe", "consider", "optional", "nice to have"].some(k => l.includes(k))) priority = "low";
  if (["urgent", "asap", "critical", "deadline", "due today"].some(k => l.includes(k))) priority = "high";
  items.push({ name: s, priority });
}
return items;
}

// ── Smart Reschedule Analysis ──
function buildSmartRescheduleResponse(id: string, now: string, todayTasks: any[], allActiveTasks: any[]): CoachMessage {
const taskIds = new Set(todayTasks.map(t => t.id));

// Build dependency graph: which tasks block others
const blockedBy: Record<string, string[]> = {}; // taskId -> ids of tasks that block it
const blocksOthers: Record<string, string[]> = {}; // taskId -> ids of tasks it blocks
for (const task of allActiveTasks) {
  if (task.dependencies && task.dependencies.length > 0) {
    for (const depId of task.dependencies) {
      if (!blockedBy[task.id]) blockedBy[task.id] = [];
      blockedBy[task.id].push(depId);
      if (!blocksOthers[depId]) blocksOthers[depId] = [];
      blocksOthers[depId].push(task.id);
    }
  }
}

const analyzed: SmartRescheduleTask[] = todayTasks.map(task => {
  const blocks = (blocksOthers[task.id] || []).filter(depId => taskIds.has(depId));
  const blocked = (blockedBy[task.id] || []).some(depId => taskIds.has(depId));
  const effort = task.energyRequired || 3;

  // Build reasoning
  const parts: string[] = [];
  if (task.priority === "low") parts.push("low priority");
  else if (task.priority === "medium") parts.push("medium priority");
  else parts.push("high priority");

  if (blocks.length > 0) parts.push(`blocks ${blocks.length} task${blocks.length > 1 ? "s" : ""}`);
  else parts.push("no dependents");

  if (task.recurring) parts.push("recurring");
  if (task.dependencies && task.dependencies.length > 0) parts.push("has dependencies");

  // Keep reason for high-priority or blocking tasks
  let keepReason: string | undefined;
  if (task.priority === "high") keepReason = "high priority — should stay today";
  else if (blocks.length > 0) keepReason = `blocks other task${blocks.length > 1 ? "s" : ""} — keep for now`;

  // Best candidates to move: low priority, not blocking, low effort
  const isBestCandidate = task.priority === "low" && blocks.length === 0;

  return {
    id: task.id,
    name: task.name,
    priority: task.priority,
    effort,
    isRecurring: task.recurring || false,
    blocksOthers: blocks.length > 0,
    isBlocked: blocked,
    reason: parts.join(", "),
    keepReason,
    selected: isBestCandidate, // pre-select low-priority non-blocking
  };
});

const selectedCount = analyzed.filter(t => t.selected).length;
const totalCount = analyzed.length;

let content: string;
if (totalCount >= 5) {
  content = `You have ${totalCount} tasks today. I've looked through them and found ${selectedCount} that could move to create some breathing room. Here's what I suggest:`;
} else if (totalCount >= 3) {
  content = `${totalCount} tasks today — let's look at what could shift to make the day feel lighter:`;
} else {
  content = "Here are your tasks for today. Let's see if anything feels like it could wait:";
}

return {
  id, role: "coach", timestamp: now, type: "smart-reschedule",
  content,
  data: {
    analyzedTasks: analyzed,
    suggestedDestination: "tomorrow",
  },
};
}

// ── Smart Response Engine ──
function generateCoachResponse(userMessage: string, ctx: CoachContext): CoachMessage {
  const lower = userMessage.toLowerCase();
  const id = generateId();
  const now = new Date().toISOString();

  // ── ADHD Task Paralysis / Cold Start → Dopamine Cold Start card ──
  // Must be checked BEFORE general "stuck" since ADHD paralysis includes similar keywords
  if (
    lower.includes("task paralysis") || lower.includes("can't start at all") || lower.includes("frozen") ||
    lower.includes("staring at") || lower.includes("adhd start") || lower.includes("cold start") ||
    (lower.includes("adhd") && (lower.includes("stuck") || lower.includes("start") || lower.includes("can't") || lower.includes("paraly"))) ||
    (ctx.painPoints.some(p => p.toLowerCase().includes("adhd") || p.toLowerCase().includes("focus")) && (lower.includes("stuck") || lower.includes("paraly") || lower.includes("frozen")))
  ) {
    return {
      id, role: "coach", timestamp: now, type: "dopamine-cold-start",
      content: "Task paralysis is a dopamine access issue — your brain isn't being rewarded for *thinking about* starting, only for *actually* starting. Let's hack that gap:",
      data: {
        category: "adhd",
        avoidedTask: ctx.activeTasks > 0 ? getTasks().filter(t => t.status === "active")[0]?.name : "your current task",
        noveltySwitches: [
          "Set a visible 10-second countdown timer — race it to open the document",
          "Switch your environment entirely: move to a different room or surface",
          "Put on a 'focus soundtrack' you've never heard before (novelty = dopamine)",
          "Tell yourself you'll do the worst possible version — just to see what happens",
          "Call or text someone: 'I'm about to start X' — the social commitment bypasses paralysis",
        ],
      },
    };
  }

  // ── Boundary / Saying No → Burnout Boundary Guard ──
  if (
    lower.includes("say no") || lower.includes("boundar") || lower.includes("can't say") ||
    lower.includes("people pleaser") || lower.includes("taking on too much") || lower.includes("obligation") ||
    lower.includes("don't want to disappoint") || lower.includes("feel guilty saying") || lower.includes("commitment") ||
    (lower.includes("burnout") && (lower.includes("ask") || lower.includes("request") || lower.includes("commitment")))
  ) {
    return {
      id, role: "coach", timestamp: now, type: "burnout-boundary",
      content: "Setting boundaries is an act of self-preservation, not selfishness. Let's draft a gentle but firm way to protect your capacity:",
      data: {
        category: "burnout",
        requestToDecline: "",
        boundaryTemplates: [
          "Thanks for thinking of me — I'm at capacity right now and need to decline so I can follow through on my current commitments.",
          "I appreciate the invitation. I'm protecting my energy this week and won't be able to give this the attention it deserves.",
          "I'd love to help when I have more bandwidth. Can we revisit this next month?",
          "That sounds important. I'm not the right person for this right now, but I hope you find someone great.",
          "I'm practicing saying no more often to protect my wellbeing. Thank you for understanding.",
        ],
      },
    };
  }

  // ── Clarity / Direction → Clarity Check-in diagnostic ──
  if (
    lower.includes("clarity") || lower.includes("unclear") || lower.includes("don't know what") ||
    lower.includes("lost") || lower.includes("no direction") || lower.includes("what should I") ||
    lower.includes("not sure what") || lower.includes("where do I") || lower.includes("figuring out") ||
    (ctx.moods.includes("Lost") || ctx.moods.includes("Disinterested"))
  ) {
    return {
      id, role: "coach", timestamp: now, type: "clarity-checkin",
      content: "Uncertainty often lives in the body, the mind, or the environment — but we treat it all the same. Let's isolate where the friction actually lives:",
      data: {
        diagnosticStep: "physical",
        diagnosticQuestions: [
          { id: "p1", question: "Have you eaten in the last 3 hours?" },
          { id: "p2", question: "Have you had water recently?" },
          { id: "p3", question: "Have you moved your body today (even a short walk)?" },
          { id: "p4", question: "Did you sleep at least 6 hours last night?" },
        ],
        diagnosticAnswers: {},
      },
    };
  }

  // ── Blocker / Stuck detection → CBT Card ──
  if (
    lower.includes("stuck") || lower.includes("blocked") || lower.includes("can't start") ||
    lower.includes("don't know where") || lower.includes("not sure how") || lower.includes("feel blocked")
  ) {
    const blockerType =
      lower.includes("energy") || lower.includes("tired") ? "low-energy" :
      lower.includes("big") || lower.includes("huge") || lower.includes("overwhelm") ? "overwhelm" :
      lower.includes("don't know how") || lower.includes("information") || lower.includes("waiting") ? "missing-info" :
      "mindset";

    if (blockerType === "low-energy") {
      return {
        id, role: "coach", timestamp: now, type: "decision-tree",
        content: "Low energy can make any task feel impossible. Let's find the gentlest path forward:",
        data: { options: decisionTrees.energize, category: "variable-capacity" },
      };
    }

    if (blockerType === "overwhelm") {
      const activeTasks = getTasks().filter((t) => t.status === "active");
      const matchingTask = activeTasks.find((t) =>
        lower.includes(t.name.toLowerCase().slice(0, 5))
      ) || activeTasks[0];

      if (matchingTask) {
        return {
          id, role: "coach", timestamp: now, type: "subtask-breakdown",
          content: `Let's break "${matchingTask.name}" into pieces so small they feel almost silly. Each one is a win:`,
          data: {
            taskId: matchingTask.id,
            taskName: matchingTask.name,
            subtasks: matchingTask.subtasks?.length
              ? matchingTask.subtasks
              : [
                  { id: generateId(), name: "Name the very first tiny step", completed: false },
                  { id: generateId(), name: "Gather what you need", completed: false },
                  { id: generateId(), name: "Set a 10-minute timer and start", completed: false },
                ],
          },
        };
      }
    }

    // General stuck → CBT card
    return {
      id, role: "coach", timestamp: now, type: "cbt-card",
      content: "Feeling stuck often has a thought behind it. Let's gently explore what's underneath:",
      data: {
        cbtStep: "identify",
        thought: "",
        category: "procrastination",
      },
    };
  }

  // ── Overwhelm + Tasks → Smart Reschedule (before general overwhelm, when there are tasks to analyze) ──
  if (lower.includes("overwhelm") || lower.includes("too much") || lower.includes("too many") || lower.includes("drowning")) {
    const today = new Date().toISOString().split("T")[0];
    const activeTasks = getTasks().filter(t => t.status === "active");
    const todayTasks = activeTasks.filter(t => t.date === today);
    if (todayTasks.length >= 3) {
      return buildSmartRescheduleResponse(id, now, todayTasks, activeTasks);
    }
    // fall through to general overwhelm below
  }

  // ── Overwhelm → Decision Tree or Subtask Breakdown ──
  if (lower.includes("overwhelm") || lower.includes("too much") || lower.includes("too many") || lower.includes("drowning")) {
    if (ctx.highPriorityTasks > 2) {
      return {
        id, role: "coach", timestamp: now, type: "decision-tree",
        content: `You have ${ctx.highPriorityTasks} high-priority tasks and ${ctx.activeTasks} total active. Let's find clarity:`,
        data: {
          options: decisionTrees["what-next"],
          category: "overwhelm",
        },
      };
    }
    return {
      id, role: "coach", timestamp: now, type: "thought-reframe",
      content: "That sense of 'too much' often comes with a story we tell ourselves. Let's check in with the thought behind it:",
      data: {
        negativeThought: "I have too much to do and I'll never get through it.",
        alternative: "I can only do one thing at a time. Which single task, if completed, would make today feel like a win?",
        category: "overwhelm",
      },
    };
  }

  // ── Energy / Tired → Variable capacity coaching ──
  if (lower.includes("energy") || lower.includes("tired") || lower.includes("exhausted") || lower.includes("drained") || lower.includes("fatigue")) {
    const insight = variableCapacityInsights[Math.floor(Math.random() * variableCapacityInsights.length)];
    return {
      id, role: "coach", timestamp: now, type: "scenario-suggestion",
      content: insight,
      data: {
        category: "variable-capacity",
        scenario: "Low energy day navigation",
        suggestions: [
          "Switch to maintenance-only mode",
          "Pick 1 task that takes under 5 minutes",
          "Try a 2-minute breathing reset",
          "Move non-urgent tasks to tomorrow",
        ],
      },
    };
  }

  // ── Procrastination → CBT + ADHD insights ──
  if (lower.includes("procrastinat") || lower.includes("avoid") || lower.includes("putting off") || lower.includes("keep delaying")) {
    const isAdhd = ctx.painPoints.some((p) => p.toLowerCase().includes("adhd") || p.toLowerCase().includes("focus")) ||
      lower.includes("adhd");
    const insight = isAdhd ? adhdInsights[Math.floor(Math.random() * adhdInsights.length)] :
      burnoutInsights[Math.floor(Math.random() * burnoutInsights.length)];

    return {
      id, role: "coach", timestamp: now, type: "thought-reframe",
      content: "Procrastination is often a signal, not a character flaw. Let's explore what's underneath:\n\n" + insight,
      data: {
        negativeThought: "I keep avoiding this — there's something wrong with me.",
        alternative: "Avoidance is protective. What am I protecting myself from? Fear of imperfection? Overwhelm? Boredom? Once I name it, I can work with it.",
        category: "procrastination",
      },
    };
  }

  // ── Focus Timer → Embedded timer card (before general focus to avoid false match) ──
  if (
    lower.includes("focus timer") || lower.includes("pomodoro") || lower.includes("time me") ||
    lower.includes("focus session") || lower.includes("deep work") || lower.includes("concentrate for") ||
    lower.includes("set a timer") || lower.includes("countdown") || lower.includes("need to focus")
  ) {
    return {
      id, role: "coach", timestamp: now, type: "focus-timer",
      content: "A focus timer creates external structure when internal motivation is low. Pick your session length:",
      data: { focusDuration: 25, focusPresets: [5, 10, 15, 25, 45] },
    };
  }

  // ── Focus / Distraction → ADHD coaching ──
  if (lower.includes("focus") || lower.includes("distract") || lower.includes("concentrate") || lower.includes("attention")) {
    return {
      id, role: "coach", timestamp: now, type: "scenario-suggestion",
      content: adhdInsights[Math.floor(Math.random() * adhdInsights.length)],
      data: {
        category: "focus",
        scenario: "Focus support strategies",
        suggestions: [
          "Try the 5-minute rule: commit to just 5 minutes",
          "Remove one visible distraction from your space",
          "Put on instrumental music or white noise",
          "Set a visible timer — external urgency helps",
        ],
      },
    };
  }

  // ── Motivation → Decision tree ──
  if (lower.includes("motivat") || lower.includes("don't feel like") || lower.includes("don't want to") || lower.includes("no drive")) {
    return {
      id, role: "coach", timestamp: now, type: "decision-tree",
      content: "Motivation often follows action, not the other way around. What feels most accessible right now?",
      data: {
        options: [
          { label: "Do the tiniest possible version", action: "micro-task", icon: "🌱" },
          { label: "Change my environment first", action: "environment", icon: "🪴" },
          { label: "Try a body-double session", action: "body-double", icon: "👥" },
          { label: "Pause and reset my energy", action: "reset", icon: "🌸" },
        ],
        category: "motivation",
      },
    };
  }

  // ── Stress / Anxiety → Breathing Guide ──
  if (lower.includes("stress") || lower.includes("anxious") || lower.includes("anxiety") || lower.includes("panic") || lower.includes("nervous")) {
    return {
      id, role: "coach", timestamp: now, type: "breathing-guide",
      content: "Let's take a moment to regulate. Your nervous system needs a signal of safety, not more thinking.",
      data: { pattern: "4-4-4" },
    };
  }

  // ── Breath / Calm / Reset → Breathing Guide ──
  if (lower.includes("breathe") || lower.includes("breath") || lower.includes("calm") || lower.includes("reset") || lower.includes("ground")) {
    return {
      id, role: "coach", timestamp: now, type: "breathing-guide",
      content: "A breathing reset anchors you in the present. Let's take this together:",
      data: { pattern: "box" },
    };
  }

  // ── Burnout → Burnout recovery insight ──
  if (lower.includes("burnout") || lower.includes("burnt out") || lower.includes("burnt-out") || lower.includes("running on empty")) {
    return {
      id, role: "coach", timestamp: now, type: "scenario-suggestion",
      content: burnoutInsights[Math.floor(Math.random() * burnoutInsights.length)],
      data: {
        category: "burnout",
        scenario: "Burnout recovery guidance",
        suggestions: [
          "Identify one commitment you can release today",
          "Schedule 15 minutes of guilt-free nothing",
          "Write down 3 micro-wins from this week",
          "Check: are you hydrated? Have you eaten?",
        ],
      },
    };
  }

  // ── Sad / Low / Depressed → Gentle reframe ──
  if (lower.includes("sad") || lower.includes("down") || lower.includes("depress") || lower.includes("hopeless") || lower.includes("worthless")) {
    return {
      id, role: "coach", timestamp: now, type: "thought-reframe",
      content: "I hear you. These feelings are heavy, and they're real. Let's not try to fix them — let's just be with them gently.",
      data: {
        negativeThought: "I feel like nothing I do matters.",
        alternative: "This feeling is visiting, but it is not the whole truth. Even tiny acts of care toward myself matter. What's one small, kind thing I can offer myself right now?",
        category: "burnout",
      },
    };
  }

  // ── Smart Reschedule → Task-aware analysis with checkboxes, dependency chains, destination picker ──
  if (
    lower.includes("reschedule") || lower.includes("postpone") || lower.includes("move task") ||
    lower.includes("push to tomorrow") || lower.includes("too many today") || lower.includes("clear today") ||
    lower.includes("move to next week") || lower.includes("defer") || lower.includes("not today") ||
    lower.includes("lighten my day") || lower.includes("help me reschedule") || lower.includes("breathing room") ||
    lower.includes("too many tasks")
  ) {
    const today = new Date().toISOString().split("T")[0];
    const activeTasks = getTasks().filter(t => t.status === "active");
    const todayTasks = activeTasks.filter(t => t.date === today);

    if (todayTasks.length > 0) {
      return buildSmartRescheduleResponse(id, now, todayTasks, activeTasks);
    }
    // No tasks today — gentle redirect
    return {
      id, role: "coach", timestamp: now, type: "chat",
      content: "It looks like you don't have any tasks scheduled for today. Maybe that's exactly what you need — a clean slate. If you'd like to plan a few things, I'm here.",
    };
  }

  // ── Task Creator → Parse conversation into actionable tasks ──
  const taskListingPatterns = [
    /i need to\s+(.+?)(?:,\s*(?:and|then|also)\s*.+)?$/i,
    /i have to\s+(.+?)(?:,\s*(?:and|then|also)\s*.+)?$/i,
    /things? i need (?:to do|done).*?[:;]/i,
    /here(?:'s|\s+is)\s+what\s+i\s+need\s+to\s+do/i,
  ];
  const hasTaskListing = taskListingPatterns.some(p => p.test(userMessage));
  const hasMultipleActionVerbs = (lower.match(/\b(?:write|draft|create|make|do|check|review|call|email|research|prepare|organize|finish|complete|update|send|schedule|plan|clean)\b/g) || []).length >= 2;
  const explicitlyWantsTasks = lower.includes("create task") || lower.includes("make task") || lower.includes("add task") ||
    lower.includes("turn this into") || lower.includes("add these to") || lower.includes("put this in my planner");

  if ((hasTaskListing && hasMultipleActionVerbs) || explicitlyWantsTasks) {
    const parsed = parseUserTasks(userMessage);
    if (parsed.length > 0) {
      return {
        id, role: "coach", timestamp: now, type: "task-creator",
        content: "I heard a few things you're planning to do. Would you like me to add these to your planner?",
        data: {
          parsedTasks: parsed.map((p, i) => ({
            id: `parsed-${Date.now()}-${i}`,
            name: p.name,
            date: new Date().toISOString().split("T")[0],
            priority: p.priority,
            selected: true,
          })),
        },
      };
    }
  }

  // ── Gratitude / Happy / Good → Positive reinforcement ──
  if (lower.includes("grateful") || lower.includes("good day") || lower.includes("happy") || lower.includes("great") || lower.includes("feeling better")) {
    const responses = [
      "That's genuinely wonderful. Notice what made today different — those conditions are worth recreating.",
      "I'm so glad. Savor this — your brain is learning that good days are possible. What's one thing you'd like to carry forward?",
      "Yes! Moments like this are data points. What's contributing to this feeling? More of that, please.",
    ];
    return {
      id, role: "coach", timestamp: now, type: "chat",
      content: responses[Math.floor(Math.random() * responses.length)],
    };
  }

  // ── General / Fallback → Context-aware response ──
  if (ctx.energyLevel !== null && ctx.energyLevel <= 2) {
    return {
      id, role: "coach", timestamp: now, type: "scenario-suggestion",
      content: `Noticing your energy is at ${ctx.energyLevel}/5 today. That's useful data — it might be a 'maintenance mode' kind of day. What's one gentle thing you could do that would still feel like forward motion?`,
      data: {
        category: "variable-capacity",
        scenario: "Low-energy day stewardship",
        suggestions: ["Review tomorrow's plan instead of executing today", "Do a 2-minute tidy-up", "Listen to a podcast related to a project", "Rest fully — recovery IS productivity"],
      },
    };
  }

  if (ctx.highPriorityTasks >= 3) {
    return {
      id, role: "coach", timestamp: now, type: "decision-tree",
      content: `You've got ${ctx.highPriorityTasks} high-priority tasks right now. Before diving in, let's get intentional:`,
      data: {
        options: decisionTrees["what-next"],
        category: "overwhelm",
      },
    };
  }

  // Default: warm, calm reflective response
  const defaultResponses = [
    "You're doing the best you can with what you have, and that's genuinely enough. What's one thing, however small, you'd like to focus on next?",
    "Progress isn't a straight line — even showing up and checking your plan counts as a win. How can I support you right now?",
    "Be kind to yourself today. You're carrying more than you realize, and you're still moving forward. What feels most present for you?",
    "Let's take the next small step together. What's on your mind — a task, a feeling, or just needing to be heard?",
    "Remember why you started. Not to be perfect — to feel better. What would feel like a meaningful 10 minutes right now?",
  ];
  return {
    id, role: "coach", timestamp: now, type: "chat",
    content: defaultResponses[Math.floor(Math.random() * defaultResponses.length)],
  };
}

/* ───────────────────────────────────────────
   Coach Page Component
   ─────────────────────────────────────────── */

function CoachPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [ready, setReady] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOnboardingComplete()) {
      navigate({ to: "/", replace: true });
      return;
    }
    const msgs = getCoachMessages();
    if (msgs.length === 0) {
      const ctx = buildCoachContext();
      const welcome: CoachMessage = {
        id: generateId(),
        role: "coach",
        content: `Welcome${ctx.userName ? `, ${ctx.userName}` : ""}. This is your planning space — a calm corner to untangle thoughts, find clarity, and chart a kind path forward.\n\n${
          ctx.energyLevel !== null
            ? `I see your energy is at ${ctx.energyLevel}/5 today${ctx.moods.length ? ` and you're feeling ${ctx.moods.join(", ").toLowerCase()}` : ""}. I'll keep that in mind.`
            : "If you log your energy in the Wellness tab, I can tailor suggestions to your capacity."
        }\n\n${
          ctx.activeTasks > 0
            ? `You have ${ctx.activeTasks} active task${ctx.activeTasks > 1 ? "s" : ""} right now. Feel free to describe what you're working through, or tap a prompt below.`
            : "You don't have any tasks yet — want to start by adding one, or just talk through what's on your mind?"
        }`,
        timestamp: new Date().toISOString(),
        type: "chat",
      };
      addCoachMessage(welcome);
      setMessages([welcome]);
    } else {
      setMessages(msgs);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(() => {
    if (!input.trim() || isTyping) return;

    const userMsg: CoachMessage = {
      id: generateId(),
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
      type: "chat",
    };
    addCoachMessage(userMsg);
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const ctx = buildCoachContext();
      const coachMsg = generateCoachResponse(userMsg.content, ctx);
      addCoachMessage(coachMsg);
      setMessages((prev) => [...prev, coachMsg]);
      setIsTyping(false);
    }, 800 + Math.random() * 600);
  }, [input, isTyping]);

  const sendQuickPrompt = useCallback((prompt: string) => {
    setInput(prompt);
    // Trigger send after a brief delay so the input updates
    setTimeout(() => {
      const userMsg: CoachMessage = {
        id: generateId(),
        role: "user",
        content: prompt,
        timestamp: new Date().toISOString(),
        type: "chat",
      };
      addCoachMessage(userMsg);
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsTyping(true);

      setTimeout(() => {
        const ctx = buildCoachContext();
        const coachMsg = generateCoachResponse(prompt, ctx);
        addCoachMessage(coachMsg);
        setMessages((prev) => [...prev, coachMsg]);
        setIsTyping(false);
      }, 800 + Math.random() * 600);
    }, 100);
  }, []);

  const handleInteractiveResponse = useCallback((responseText: string) => {
    const userMsg: CoachMessage = {
      id: generateId(),
      role: "user",
      content: responseText,
      timestamp: new Date().toISOString(),
      type: "chat",
    };
    addCoachMessage(userMsg);
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      const ctx = buildCoachContext();
      const coachMsg = generateCoachResponse(responseText, ctx);
      addCoachMessage(coachMsg);
      setMessages((prev) => [...prev, coachMsg]);
      setIsTyping(false);
    }, 800 + Math.random() * 600);
  }, []);

  const clearChat = () => {
    clearCoachMessages();
    const ctx = buildCoachContext();
    const welcome: CoachMessage = {
      id: generateId(),
      role: "coach",
      content: "Conversation refreshed. This space is available whenever you need to clarify your next step.",
      timestamp: new Date().toISOString(),
      type: "chat",
    };
    addCoachMessage(welcome);
    setMessages([welcome]);
  };

  if (!ready) return null;

  return (
    <AppLayout>
      <div className="flex h-[calc(100dvh-7.5rem)] lg:h-[calc(100vh-8rem)] flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-brand-dark sm:text-3xl">Coach</h1>
            <p className="mt-0.5 text-sm text-brand-muted">A structured space to clarify your next step</p>
          </div>
          <button onClick={clearChat} className="btn-ghost text-xs">
            Clear
          </button>
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-brand-cream/40 bg-white/50 p-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} slide-up`}>
                {msg.role === "user" ? (
                  <div className="max-w-[80%] rounded-xl bg-brand-deep px-4 py-3 text-white">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                    <p className="mt-1 text-[10px] text-white/60">
                      {new Date(msg.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                ) : (
                  <CoachMessageBubble msg={msg} onResponse={handleInteractiveResponse} />
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="rounded-xl bg-white px-5 py-3 shadow-sm ring-1 ring-brand-cream/30">
                  <div className="flex items-center gap-1">
                    <span className="text-sm">🍊</span>
                    <span className="animate-float text-brand-muted/60" style={{ animationDelay: "0ms" }}>·</span>
                    <span className="animate-float text-brand-muted/60" style={{ animationDelay: "200ms" }}>·</span>
                    <span className="animate-float text-brand-muted/60" style={{ animationDelay: "400ms" }}>·</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Quick prompts */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => sendQuickPrompt("I'm feeling stuck and blocked on a task")} className="quick-prompt">
            🧩 Feeling stuck
          </button>
          <button onClick={() => sendQuickPrompt("I'm overwhelmed by everything I need to do")} className="quick-prompt">
            🌪️ Overwhelmed
          </button>
          <button onClick={() => sendQuickPrompt("My energy is really low today and I don't know what to prioritize")} className="quick-prompt">
            🔋 Low energy
          </button>
          <button onClick={() => sendQuickPrompt("I have ADHD and I'm experiencing task paralysis — frozen and can't start")} className="quick-prompt border border-brand-light/20 bg-amber-50/50 hover:bg-amber-100/60">
            🚀 ADHD Cold Start
          </button>
          <button onClick={() => sendQuickPrompt("I'm struggling to say no to additional commitments and need to set a boundary")} className="quick-prompt border border-brand-rose/20 bg-rose-50/50 hover:bg-rose-100/60">
            🌊 Set a boundary
          </button>
          <button onClick={() => sendQuickPrompt("I feel lost and unclear — I need a clarity check-in to figure out what's blocking me")} className="quick-prompt border border-brand-leaf/20 bg-emerald-50/50 hover:bg-emerald-100/60">
            🧭 Find clarity
          </button>
          <button onClick={() => sendQuickPrompt("I need help breaking down a task into smaller steps")} className="quick-prompt">
            ✂️ Break it down
          </button>
          <button onClick={() => sendQuickPrompt("I'm feeling anxious and need to reset")} className="quick-prompt">
            🧘 Need to breathe
          </button>
          <button onClick={() => sendQuickPrompt("I need to focus — set me up with a focus timer for deep work")} className="quick-prompt border border-brand-deep/20 bg-brand-warm/50 hover:bg-brand-warm/70">
            ⏱️ Focus timer
          </button>
          <button onClick={() => sendQuickPrompt("I have too many tasks today — help me reschedule some to create breathing room")} className="quick-prompt border border-brand-light/20 bg-brand-warm/50 hover:bg-brand-warm/70">
            📅 Lighten my day
          </button>
          <button onClick={() => sendQuickPrompt("I need to write a project update, research competitors, and check my inbox")} className="quick-prompt border border-brand-gold/20 bg-brand-gold/10 hover:bg-brand-gold/20">
            📋 Turn chat → tasks
          </button>
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Describe what you're working through..."
            className="input-field flex-1"
            disabled={isTyping}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isTyping}
            className="btn-primary shrink-0 disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>
    </AppLayout>
  );
}

/* ───────────────────────────────────────────
   Coach Message Bubble — dispatches to
   the right interactive component
   ─────────────────────────────────────────── */

function CoachMessageBubble({ msg, onResponse }: { msg: CoachMessage; onResponse: (text: string) => void }) {
  switch (msg.type) {
    case "cbt-card":
      return <CbtUnblockingCard msg={msg} onResponse={onResponse} />;
    case "subtask-breakdown":
      return <SubtaskBreakdownCard msg={msg} onResponse={onResponse} />;
    case "thought-reframe":
      return <ThoughtReframer msg={msg} onResponse={onResponse} />;
    case "breathing-guide":
      return <BreathingGuide msg={msg} onResponse={onResponse} />;
    case "decision-tree":
      return <DecisionTreeCard msg={msg} onResponse={onResponse} />;
    case "scenario-suggestion":
      return <ScenarioSuggestionCard msg={msg} onResponse={onResponse} />;
    case "dopamine-cold-start":
      return <DopamineColdStartCard msg={msg} onResponse={onResponse} />;
    case "burnout-boundary":
      return <BurnoutBoundaryCard msg={msg} onResponse={onResponse} />;
    case "clarity-checkin":
      return <ClarityCheckinCard msg={msg} onResponse={onResponse} />;
    case "focus-timer":
      return <FocusTimerCard msg={msg} onResponse={onResponse} />;
    case "task-reschedule":
      return <TaskRescheduleCard msg={msg} onResponse={onResponse} />;
    case "smart-reschedule":
      return <SmartRescheduleCard msg={msg} onResponse={onResponse} />;
    case "task-creator":
      return <TaskCreatorCard msg={msg} onResponse={onResponse} />;
    default:
      return (
        <div className="max-w-[85%] rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-brand-cream/30">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm">🍊</span>
            <span className="text-xs font-medium text-brand-deep">Coach</span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-dark">{msg.content}</p>
          <p className="mt-1 text-[10px] text-brand-muted/60">
            {new Date(msg.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </p>
        </div>
      );
  }
}

/* ───────────────────────────────────────────
   Interactive Components
   ─────────────────────────────────────────── */

// ── 1. CBT Unblocking Card ──
function CbtUnblockingCard({ msg, onResponse }: { msg: CoachMessage; onResponse: (text: string) => void }) {
  const [step, setStep] = useState<"identify" | "challenge" | "reframe">(msg.data?.cbtStep || "identify");
  const [thought, setThought] = useState("");
  const [challenge, setChallenge] = useState("");
  const [showReframe, setShowReframe] = useState(false);

  const reframes: Record<string, string> = {
    "It's too hard": "The first step is always the hardest. What if 'too hard' just means 'needs to be broken down smaller'?",
    "I'm not good enough": "Competence is built, not born. Every expert was once a beginner who kept going. You are in the building phase.",
    "I don't have time": "What if it's not about having time, but about making a tiny space? Even 5 minutes counts.",
    "I'll fail": "Failure is information, not identity. What's the worst that could happen — and could you handle that?",
    "It's pointless": "Meaning isn't always obvious at the start. Sometimes purpose reveals itself through action, not before it.",
  };

  return (
    <div className="max-w-[90%] rounded-xl bg-white shadow-sm ring-1 ring-brand-cream/30 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-warm/60 to-brand-warm/20 px-4 py-2.5 flex items-center gap-2">
        <span className="text-sm">🧩</span>
        <span className="text-xs font-semibold text-brand-deep uppercase tracking-wide">Unblocking Guide</span>
        <div className="ml-auto flex gap-1">
          <span className={`h-1.5 w-1.5 rounded-full ${step === "identify" ? "bg-brand-deep" : "bg-brand-cream"}`} />
          <span className={`h-1.5 w-1.5 rounded-full ${step === "challenge" ? "bg-brand-deep" : "bg-brand-cream"}`} />
          <span className={`h-1.5 w-1.5 rounded-full ${step === "reframe" ? "bg-brand-deep" : "bg-brand-cream"}`} />
        </div>
      </div>

      <div className="p-4 space-y-3">
        <p className="text-sm text-brand-dark">{msg.content}</p>

        {step === "identify" && (
          <div className="space-y-3 slide-up">
            <p className="text-xs font-medium text-brand-muted">Step 1: Name the thought. What story is your mind telling you about this task?</p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(reframes).map((t) => (
                <button
                  key={t}
                  onClick={() => { setThought(t); setStep("challenge"); }}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    thought === t
                      ? "bg-brand-deep text-white"
                      : "bg-brand-cream/30 text-brand-muted hover:bg-brand-warm hover:text-brand-dark"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={thought}
                onChange={(e) => setThought(e.target.value)}
                placeholder="Or write your own..."
                className="input-field flex-1 text-xs"
                onKeyDown={(e) => { if (e.key === "Enter" && thought.trim()) setStep("challenge"); }}
              />
              <button
                onClick={() => { if (thought.trim()) setStep("challenge"); }}
                disabled={!thought.trim()}
                className="btn-primary text-xs disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {step === "challenge" && (
          <div className="space-y-3 slide-up">
            <p className="text-xs font-medium text-brand-muted">Step 2: Gently challenge it. Is this thought 100% true? What evidence is there against it?</p>
            <div className="rounded-xl bg-brand-warm/30 p-3">
              <p className="text-sm font-medium text-brand-deep italic">"{thought}"</p>
            </div>
            <textarea
              value={challenge}
              onChange={(e) => setChallenge(e.target.value)}
              placeholder="What would you tell a friend who had this thought?..."
              className="input-field text-xs min-h-[60px] resize-none"
            />
            <div className="flex gap-2">
              <button onClick={() => setStep("identify")} className="btn-ghost text-xs">← Back</button>
              <button onClick={() => setStep("reframe")} className="btn-primary text-xs flex-1">
                See a reframe →
              </button>
            </div>
          </div>
        )}

        {step === "reframe" && (
          <div className="space-y-3 slide-up">
            <p className="text-xs font-medium text-brand-muted">Step 3: A gentler way to see it.</p>
            <div className="rounded-xl bg-gradient-to-br from-brand-warm/50 to-white p-4 border border-brand-light/15">
              <p className="text-sm leading-relaxed text-brand-dark">
                {reframes[thought] || "Your thought isn't a fact — it's a habit. Each time you notice it, you loosen its grip. What would a kinder voice say?"}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep("challenge")} className="btn-ghost text-xs">← Back</button>
              <button
                onClick={() => { setShowReframe(true); }}
                className="btn-ghost text-xs"
              >
                Try my own reframe
              </button>
              <button
                onClick={() => onResponse("That reframe helped. I feel ready to try again.")}
                className="btn-primary text-xs flex-1"
              >
                I feel ready to try ✨
              </button>
            </div>
            {showReframe && (
              <div className="slide-up flex gap-2">
                <input
                  placeholder="Write your own reframe..."
                  className="input-field flex-1 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                      onResponse(`I reframed my thought to: ${(e.target as HTMLInputElement).value.trim()}. I feel ready to try again.`);
                    }
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 2. Subtask Breakdown Card (with Auto-Split) ──
function SubtaskBreakdownCard({ msg, onResponse }: { msg: CoachMessage; onResponse: (text: string) => void }) {
  const [subtasks, setSubtasks] = useState<Subtask[]>(msg.data?.subtasks || []);
  const [newSubtask, setNewSubtask] = useState("");
  const [saved, setSaved] = useState(false);
  const [taskInput, setTaskInput] = useState("");
  const [hasAutoSplit, setHasAutoSplit] = useState(false);
  const taskId = msg.data?.taskId;
  const taskName = msg.data?.taskName || "this task";

  const smartSplit = (task: string): string[] => {
    const t = task.trim();
    if (!t) return [];
    // Extract key action from the task
    const actionWords = ["draft", "write", "create", "build", "design", "plan", "research", "review", "prepare", "organize", "clean", "fix", "update", "send", "call", "schedule"];
    const action = actionWords.find((w) => t.toLowerCase().startsWith(w)) || t.split(" ")[0];

    // Heuristic: if task is long/complex, split by structure
    if (t.length > 30 || t.includes(" and ") || t.includes(",")) {
      return [
        `Gather everything needed for "${t.slice(0, 40)}${t.length > 40 ? "..." : ""}"`,
        `Do the first 10 minutes of ${action}ing`,
        `Review what you've done and note next steps`,
      ];
    }

    return [
      `Open or create the ${action} document/tool`,
      `Spend 5 focused minutes on "${t}"`,
      `Save progress and mark status`,
    ];
  };

  const autoSplit = () => {
    const split = smartSplit(taskInput || taskName);
    const newSubtasks: Subtask[] = split.map((name) => ({
      id: generateId(),
      name,
      completed: false,
    }));
    setSubtasks(newSubtasks);
    setHasAutoSplit(true);
  };

  const toggleSubtask = (id: string) => {
    setSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s)));
  };

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks((prev) => [...prev, { id: generateId(), name: newSubtask.trim(), completed: false }]);
    setNewSubtask("");
  };

  const syncToTask = () => {
    if (taskId) {
      updateTask(taskId, { subtasks });
      setSaved(true);
    }
  };

  const completedCount = subtasks.filter((s) => s.completed).length;

  return (
    <div className="max-w-[90%] rounded-xl bg-white shadow-sm ring-1 ring-brand-cream/30 overflow-hidden border border-brand-leaf/10">
      <div className="bg-gradient-to-r from-emerald-50/50 via-brand-warm/50 to-brand-warm/20 px-4 py-3 flex items-center gap-2">
        <span className="text-base">✂️</span>
        <span className="font-serif text-sm font-semibold text-brand-deep tracking-tight">Micro-Task Breakdown</span>
        {completedCount === subtasks.length && subtasks.length > 0 && (
          <span className="ml-auto rounded-full bg-brand-leaf/15 px-2 py-0.5 text-[10px] font-medium text-brand-leaf">All done! 🎉</span>
        )}
      </div>
      <div className="p-5 space-y-4">
        <p className="text-sm leading-relaxed text-brand-dark">{msg.content}</p>

        {/* Auto-split input — when no subtasks yet or user wants to regenerate */}
        {(!hasAutoSplit || subtasks.length === 0) && (
          <div className="space-y-2 slide-up rounded-xl bg-brand-warm/30 border border-brand-light/10 p-3">
            <p className="text-xs font-medium text-brand-muted">Type any task and I'll break it into 3 micro-steps:</p>
            <div className="flex gap-2">
              <input
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && taskInput.trim()) autoSplit(); }}
                placeholder="e.g., Write quarterly report..."
                className="input-field flex-1 text-xs"
              />
              <button
                onClick={autoSplit}
                disabled={!taskInput.trim()}
                className="btn-primary text-xs shrink-0 disabled:opacity-50"
              >
                Split ✨
              </button>
            </div>
          </div>
        )}

        {/* Subtask list */}
        {subtasks.length > 0 && (
          <>
            <p className="text-xs font-medium text-brand-muted">
              Breaking down <span className="font-serif text-brand-deep font-semibold italic">"{taskInput || taskName}"</span>:
            </p>

            <div className="space-y-1.5">
              {subtasks.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => toggleSubtask(sub.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
                    sub.completed
                      ? "bg-brand-leaf/5 text-brand-muted line-through border border-brand-leaf/10"
                      : "bg-brand-cream/20 text-brand-dark hover:bg-brand-warm/40 border border-transparent"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                      sub.completed
                        ? "border-brand-leaf bg-brand-leaf text-white shadow-sm"
                        : "border-brand-cream/60"
                    }`}
                  >
                    {sub.completed && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </span>
                  <span className="text-sm">{sub.name}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Add new subtask manually */}
        <div className="flex gap-2">
          <input
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addSubtask(); }}
            placeholder="Add your own micro-step..."
            className="input-field flex-1 text-xs"
          />
          <button onClick={addSubtask} disabled={!newSubtask.trim()} className="btn-secondary text-xs disabled:opacity-50">
            + Add
          </button>
        </div>

        <div className="flex gap-2">
          {taskId && !saved && subtasks.length > 0 && (
            <button onClick={syncToTask} className="btn-primary text-xs flex-1">
              💾 Save to task
            </button>
          )}
          {saved && <p className="text-xs text-brand-leaf font-medium">✓ Synced to task</p>}
          <button
            onClick={() => onResponse(subtasks.every(s => s.completed)
              ? "All micro-steps complete! I'm ready for the next thing."
              : "I've broken down the task into micro-steps. I feel ready to start with the first one.")}
            className="btn-ghost text-xs flex-1"
          >
            {subtasks.every(s => s.completed) ? "All done! 🎉" : "Ready to start →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 3. Thought Reframer ──
function ThoughtReframer({ msg, onResponse }: { msg: CoachMessage; onResponse: (text: string) => void }) {
  const [flipped, setFlipped] = useState(false);
  const negativeThought = msg.data?.negativeThought || "";
  const alternative = msg.data?.alternative || "";

  return (
    <div className="max-w-[90%] rounded-xl bg-white shadow-sm ring-1 ring-brand-cream/30 overflow-hidden">
      <div className="bg-gradient-to-r from-brand-warm/60 to-brand-warm/20 px-4 py-2.5 flex items-center gap-2">
        <span className="text-sm">🪞</span>
        <span className="text-xs font-semibold text-brand-deep uppercase tracking-wide">Thought Reframer</span>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-sm text-brand-dark">{msg.content}</p>

        <div className="relative" style={{ minHeight: "100px" }}>
          {/* Front: negative thought */}
          <div
            className={`rounded-xl bg-red-50/40 border border-red-100/40 p-4 transition-all duration-500 ${
              flipped ? "opacity-0 absolute inset-0 pointer-events-none rotate-y-180" : "opacity-100"
            }`}
          >
            <p className="text-xs font-medium text-red-500/70 mb-1">Noticing this thought:</p>
            <p className="text-sm italic text-brand-dark">"{negativeThought}"</p>
          </div>

          {/* Back: reframed thought */}
          <div
            className={`rounded-xl bg-gradient-to-br from-brand-warm/60 to-emerald-50/40 border border-brand-light/20 p-4 transition-all duration-500 ${
              flipped ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none rotate-y-180"
            }`}
          >
            <p className="text-xs font-medium text-brand-leaf mb-1">A gentler perspective:</p>
            <p className="text-sm italic text-brand-dark">"{alternative}"</p>
          </div>
        </div>

        <div className="flex gap-2">
          {!flipped ? (
            <button onClick={() => setFlipped(true)} className="btn-primary text-xs flex-1">
              🔄 See a reframe
            </button>
          ) : (
            <>
              <button onClick={() => setFlipped(false)} className="btn-ghost text-xs">
                ← Back
              </button>
              <button
                onClick={() => onResponse("That reframe helps. I feel a bit lighter about it.")}
                className="btn-primary text-xs flex-1"
              >
                That helps ✨
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 4. Breathing Guide ──
function BreathingGuide({ msg, onResponse }: { msg: CoachMessage; onResponse: (text: string) => void }) {
  const pattern = msg.data?.pattern || "4-4-4";
  const [phase, setPhase] = useState<"inhale" | "hold" | "exhale" | "rest" | "idle">("idle");
  const [count, setCount] = useState(0);
  const [cycles, setCycles] = useState(0);
  const [started, setStarted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const config = {
    "4-4-4": { inhale: 4, hold: 4, exhale: 4, rest: 0, label: "Box Breathing" },
    "4-7-8": { inhale: 4, hold: 7, exhale: 8, rest: 0, label: "4-7-8 Breathing" },
    "box": { inhale: 4, hold: 4, exhale: 4, rest: 4, label: "Square Breathing" },
  }[pattern];

  const totalSteps = config.inhale + config.hold + config.exhale + config.rest;

  const startBreathing = () => {
    setStarted(true);
    setPhase("inhale");
    setCount(config.inhale);
    setCycles(0);

    let currentPhase: "inhale" | "hold" | "exhale" | "rest" = "inhale";
    let currentCount = config.inhale;

    intervalRef.current = setInterval(() => {
      currentCount--;
      setCount(currentCount);

      if (currentCount <= 0) {
        // Transition to next phase
        if (currentPhase === "inhale") {
          if (config.hold > 0) {
            currentPhase = "hold";
            currentCount = config.hold;
          } else {
            currentPhase = "exhale";
            currentCount = config.exhale;
          }
        } else if (currentPhase === "hold") {
          currentPhase = "exhale";
          currentCount = config.exhale;
        } else if (currentPhase === "exhale") {
          if (config.rest > 0) {
            currentPhase = "rest";
            currentCount = config.rest;
          } else {
            currentPhase = "inhale";
            currentCount = config.inhale;
            setCycles((c) => c + 1);
          }
        } else if (currentPhase === "rest") {
          currentPhase = "inhale";
          currentCount = config.inhale;
          setCycles((c) => c + 1);
        }
        setPhase(currentPhase);
      }
    }, 1000);
  };

  const stopBreathing = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPhase("idle");
    setStarted(false);
    setCount(0);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const circleSize = 120;
  const getCircleScale = () => {
    if (phase === "idle") return 0.7;
    if (phase === "inhale") return 0.7 + ((config.inhale - count) / config.inhale) * 0.3;
    if (phase === "hold") return 1.0;
    if (phase === "exhale") return 1.0 - ((config.exhale - count) / config.exhale) * 0.3;
    if (phase === "rest") return 0.7;
    return 0.7;
  };

  const phaseColor =
    phase === "inhale" ? "from-brand-light/40 to-brand-warm/60" :
    phase === "hold" ? "from-brand-gold/40 to-brand-yellow/40" :
    phase === "exhale" ? "from-brand-deep/30 to-brand-light/20" :
    "from-brand-cream/30 to-brand-cream/20";

  return (
    <div className="max-w-[90%] rounded-xl bg-white shadow-sm ring-1 ring-brand-cream/30 overflow-hidden">
      <div className="bg-gradient-to-r from-brand-warm/60 to-brand-warm/20 px-4 py-2.5 flex items-center gap-2">
        <span className="text-sm">🫁</span>
        <span className="text-xs font-semibold text-brand-deep uppercase tracking-wide">{config.label}</span>
        {cycles > 0 && <span className="ml-auto text-xs font-medium text-brand-muted">{cycles} cycle{cycles > 1 ? "s" : ""}</span>}
      </div>
      <div className="p-4 space-y-4 flex flex-col items-center">
        <p className="text-sm text-brand-dark text-center">{msg.content}</p>

        {/* Breathing circle */}
        <div className="relative flex items-center justify-center" style={{ width: circleSize, height: circleSize }}>
          {/* Outer glow */}
          <div
            className="absolute rounded-full bg-gradient-to-br transition-all duration-700 ease-in-out"
            style={{
              width: `${circleSize * getCircleScale()}px`,
              height: `${circleSize * getCircleScale()}px`,
            }}
          />
          {/* Inner circle */}
          <div
            className={`absolute rounded-full bg-gradient-to-br ${phaseColor} border-2 border-white/60 shadow-lg transition-all duration-700 ease-in-out flex items-center justify-center`}
            style={{
              width: `${circleSize * getCircleScale() * 0.85}px`,
              height: `${circleSize * getCircleScale() * 0.85}px`,
            }}
          >
            <span className="font-serif text-2xl font-semibold text-brand-deep/80">
              {phase === "idle" ? "🫁" : count}
            </span>
          </div>
        </div>

        {started && (
          <p className="text-xs font-medium text-brand-muted uppercase tracking-wider">
            {phase === "inhale" ? "Breathe in" : phase === "hold" ? "Hold" : phase === "exhale" ? "Breathe out" : "Rest"}
          </p>
        )}

        <div className="flex gap-2">
          {!started ? (
            <button onClick={startBreathing} className="btn-primary text-xs">
              🫁 Start breathing
            </button>
          ) : (
            <button onClick={stopBreathing} className="btn-secondary text-xs">
              Stop
            </button>
          )}
          <button
            onClick={() => {
              stopBreathing();
              onResponse("That breathing exercise helped me feel more grounded. I'm ready to continue.");
            }}
            className="btn-ghost text-xs"
          >
            I feel calmer ✨
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 5. Decision Tree Card ──
function DecisionTreeCard({ msg, onResponse }: { msg: CoachMessage; onResponse: (text: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const options = msg.data?.options || [];

  const actionLabels: Record<string, string> = {
    focus: "I'd like to focus on one high-priority task — help me pick one and get started.",
    reset: "I need a quick 5-minute reset before doing anything else.",
    breakdown: "Help me break down a task that feels too big to start.",
    breathe: "Let's do a breathing exercise first to ground myself.",
    stretch: "I'll do a 5-minute stretch or chair yoga session.",
    outside: "I'll step outside for a few minutes to reset.",
    nourish: "I'll hydrate and have a snack — basic needs first.",
    "missing-info": "I'm missing information I need to proceed. Help me figure out how to get it.",
    overwhelm: "The task feels too large. Help me break it into smaller pieces.",
    mindset: "I'm emotionally stuck — there's something mental blocking me.",
    "low-energy": "My energy is too low for this task right now.",
    "micro-task": "Help me identify the tiniest possible version of this task.",
    environment: "I'll change my environment — move to a different room or space.",
    "body-double": "Let's try a virtual body-double session — I'll work while imagining someone alongside me.",
  };

  return (
    <div className="max-w-[90%] rounded-xl bg-white shadow-sm ring-1 ring-brand-cream/30 overflow-hidden">
      <div className="bg-gradient-to-r from-brand-warm/60 to-brand-warm/20 px-4 py-2.5 flex items-center gap-2">
        <span className="text-sm">����</span>
        <span className="text-xs font-semibold text-brand-deep uppercase tracking-wide">What's Next?</span>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-sm text-brand-dark">{msg.content}</p>

        <div className="space-y-1.5">
          {options.map((opt) => (
            <button
              key={opt.action}
              onClick={() => setSelected(opt.action)}
              className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all ${
                selected === opt.action
                  ? "border-brand-deep bg-brand-warm/50 ring-2 ring-brand-light/20 font-medium text-brand-dark"
                  : "border-white/60 bg-white/50 text-brand-muted hover:border-brand-light/30 hover:bg-brand-warm/30"
              }`}
            >
              <span className="text-lg">{opt.icon}</span>
              <span className="flex-1">{opt.label}</span>
              {selected === opt.action && <span className="text-brand-deep">✓</span>}
            </button>
          ))}
        </div>

        {selected && (
          <div className="slide-up">
            <button
              onClick={() => onResponse(actionLabels[selected] || `I choose: ${options.find((o) => o.action === selected)?.label}`)}
              className="btn-primary w-full text-xs"
            >
              Continue with this path →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 6. Scenario Suggestion Card ──
function ScenarioSuggestionCard({ msg, onResponse }: { msg: CoachMessage; onResponse: (text: string) => void }) {
  const suggestions = msg.data?.suggestions || [];
  const category = msg.data?.category || "general";

  const categoryIcons: Record<string, string> = {
    adhd: "🧠",
    burnout: "🔥",
    "variable-capacity": "🔋",
    procrastination: "⏳",
    overwhelm: "🌊",
    focus: "🎯",
    motivation: "💫",
  };

  return (
    <div className="max-w-[90%] rounded-xl bg-white shadow-sm ring-1 ring-brand-cream/30 overflow-hidden">
      <div className="bg-gradient-to-r from-brand-warm/60 to-brand-warm/20 px-4 py-2.5 flex items-center gap-2">
        <span className="text-sm">{categoryIcons[category] || "💡"}</span>
        <span className="text-xs font-semibold text-brand-deep uppercase tracking-wide">
          {category === "adhd" ? "ADHD Strategy" :
           category === "burnout" ? "Burnout Recovery" :
           category === "variable-capacity" ? "Energy-Aware Planning" :
           category === "procrastination" ? "Procrastination Insight" :
           category === "overwhelm" ? "Overwhelm Guidance" :
           category === "focus" ? "Focus Support" :
           category === "motivation" ? "Motivation Boost" : "Gentle Suggestion"}
        </span>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-sm leading-relaxed text-brand-dark">{msg.content}</p>

        {suggestions.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-brand-muted">Try one of these:</p>
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onResponse(s)}
                className="flex w-full items-center gap-2 rounded-lg bg-brand-cream/20 px-3 py-2 text-left text-sm text-brand-dark transition-all hover:bg-brand-warm/40"
              >
                <span className="text-xs text-brand-muted">{i + 1}.</span>
                {s}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => onResponse("That insight was helpful. I'm ready to continue with my next step.")}
          className="btn-ghost text-xs"
        >
          Thank you, I'll take it from here →
        </button>
      </div>
    </div>
  );
}

// ── 7. ADHD Dopamine Cold Start Card ──
function DopamineColdStartCard({ msg, onResponse }: { msg: CoachMessage; onResponse: (text: string) => void }) {
  const [selectedSwitch, setSelectedSwitch] = useState<string | null>(null);
  const noveltySwitches = msg.data?.noveltySwitches || [];
  const avoidedTask = msg.data?.avoidedTask || "your task";

  return (
    <div className="max-w-[90%] rounded-xl bg-white shadow-sm ring-1 ring-brand-cream/30 overflow-hidden border border-brand-light/10">
      <div className="bg-gradient-to-r from-amber-50 via-brand-warm/60 to-brand-warm/20 px-4 py-3 flex items-center gap-2">
        <span className="text-lg">🚀</span>
        <span className="font-serif text-sm font-semibold text-brand-deep tracking-tight">Dopamine Cold Start</span>
        <span className="ml-auto rounded-full bg-brand-leaf/15 px-2 py-0.5 text-[10px] font-medium text-brand-leaf">ADHD Strategy</span>
      </div>
      <div className="p-5 space-y-4">
        <p className="text-sm leading-relaxed text-brand-dark">{msg.content}</p>

        <div className="rounded-xl bg-brand-warm/30 border border-brand-light/10 p-3">
          <p className="text-xs font-medium text-brand-muted mb-1">The task:</p>
          <p className="font-serif text-base italic text-brand-deep">"{avoidedTask}"</p>
        </div>

        <p className="text-xs font-medium text-brand-muted uppercase tracking-wide">Choose a dopamine hack:</p>
        <div className="space-y-2">
          {noveltySwitches.map((sw, i) => (
            <button
              key={i}
              onClick={() => setSelectedSwitch(sw)}
              className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-all ${
                selectedSwitch === sw
                  ? "border-brand-deep bg-brand-warm/50 ring-2 ring-brand-light/20"
                  : "border-white/60 bg-white/50 hover:border-brand-light/30 hover:bg-brand-warm/30"
              }`}
            >
              <span className="mt-0.5 text-sm shrink-0">{["⏱️","🔄","🎵","🎨","📱"][i] || "✨"}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-brand-dark">{sw}</p>
              </div>
              {selectedSwitch === sw && <span className="text-brand-deep shrink-0">✓</span>}
            </button>
          ))}
        </div>

        {selectedSwitch && (
          <div className="flex gap-2 slide-up">
            <button
              onClick={() => onResponse(`I'll try the dopamine cold start: ${selectedSwitch}`)}
              className="btn-primary text-xs flex-1"
            >
              🚀 Try this now
            </button>
            <button onClick={() => setSelectedSwitch(null)} className="btn-ghost text-xs">
              Pick another
            </button>
          </div>
        )}

        <div className="border-t border-brand-cream/30 pt-3">
          <p className="text-xs font-medium text-brand-muted">💡 The science:</p>
          <p className="text-xs text-brand-muted/70 leading-relaxed mt-1">
            ADHD brains have lower baseline dopamine. Novelty, urgency, competition, and social commitment all trigger dopamine release — making the task threshold crossable. The "10-second rule" works because it converts "start the task" into "beat the clock," giving your brain the neurochemical push it needs.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── 8. Burnout Boundary Guard Card ──
function BurnoutBoundaryCard({ msg, onResponse }: { msg: CoachMessage; onResponse: (text: string) => void }) {
  const [customRequest, setCustomRequest] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [customized, setCustomized] = useState("");
  const [copied, setCopied] = useState(false);
  const templates = msg.data?.boundaryTemplates || [];

  const handleSelectTemplate = (template: string) => {
    setSelectedTemplate(template);
    // Pre-fill customizable version
    setCustomized(template);
  };

  const copyBoundary = async () => {
    const text = customized || selectedTemplate || "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-[90%] rounded-xl bg-white shadow-sm ring-1 ring-brand-cream/30 overflow-hidden border border-brand-rose/10">
      <div className="bg-gradient-to-r from-rose-50 via-brand-warm/40 to-brand-warm/20 px-4 py-3 flex items-center gap-2">
        <span className="text-lg">🌊</span>
        <span className="font-serif text-sm font-semibold text-brand-dark tracking-tight">Boundary Guard</span>
        <span className="ml-auto rounded-full bg-brand-rose/15 px-2 py-0.5 text-[10px] font-medium text-brand-rose">Burnout Protection</span>
      </div>
      <div className="p-5 space-y-4">
        <p className="text-sm leading-relaxed text-brand-dark">{msg.content}</p>

        {/* Step 1: Name the request */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-brand-muted">Step 1: What are you being asked to take on?</p>
          <input
            value={customRequest}
            onChange={(e) => setCustomRequest(e.target.value)}
            placeholder='e.g., "Join the committee" or "Take on the extra project"...'
            className="input-field text-xs"
          />
        </div>

        {/* Step 2: Choose a template */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-brand-muted">Step 2: Choose a boundary template:</p>
          <div className="space-y-1.5">
            {templates.map((t, i) => (
              <button
                key={i}
                onClick={() => handleSelectTemplate(t)}
                className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2.5 text-left transition-all ${
                  selectedTemplate === t
                    ? "border-brand-rose bg-rose-50/50 ring-2 ring-brand-rose/10"
                    : "border-white/60 bg-white/50 hover:border-brand-rose/20 hover:bg-rose-50/30"
                }`}
              >
                <span className="mt-0.5 text-xs shrink-0 text-brand-rose font-medium">{i + 1}.</span>
                <p className="text-xs leading-relaxed text-brand-dark">{t}</p>
                {selectedTemplate === t && <span className="text-brand-rose shrink-0">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Customize and copy */}
        {selectedTemplate && (
          <div className="space-y-2 slide-up">
            <p className="text-xs font-medium text-brand-muted">
              Step 3: {customRequest ? `Personalize for "${customRequest}"` : "Personalize it"}:
            </p>
            <textarea
              value={customized}
              onChange={(e) => setCustomized(e.target.value)}
              className="input-field text-xs min-h-[60px] resize-none"
              rows={3}
            />
            <div className="flex gap-2">
              <button onClick={copyBoundary} className="btn-primary text-xs flex-1">
                {copied ? "✓ Copied!" : "📋 Copy to clipboard"}
              </button>
              <button
                onClick={() => onResponse(customRequest
                  ? `I've prepared a boundary response for "${customRequest}" and I'm ready to use it.`
                  : "I've prepared a boundary response and I'm ready to use it when needed.")}
                className="btn-ghost text-xs"
              >
                I feel empowered ✨
              </button>
            </div>
          </div>
        )}

        <div className="border-t border-brand-cream/30 pt-3">
          <p className="text-xs text-brand-muted/60 leading-relaxed italic font-serif">
            "No is a complete sentence. You don't owe anyone an explanation for protecting your peace."
          </p>
        </div>
      </div>
    </div>
  );
}

// ── 9. Clarity Check-in Diagnostic Card ──
function ClarityCheckinCard({ msg, onResponse }: { msg: CoachMessage; onResponse: (text: string) => void }) {
  const [step, setStep] = useState<"physical" | "mental" | "environmental" | "summary">(
    msg.data?.diagnosticStep || "physical"
  );
  const [answers, setAnswers] = useState<Record<string, string>>(msg.data?.diagnosticAnswers || {});

  const physicalQuestions = [
    { id: "p1", question: "Have you eaten in the last 3 hours?" },
    { id: "p2", question: "Have you had water recently?" },
    { id: "p3", question: "Have you moved your body today (even a short walk)?" },
    { id: "p4", question: "Did you sleep at least 6 hours last night?" },
  ];

  const mentalQuestions = [
    { id: "m1", question: "Is there a specific task creating anxiety or avoidance?" },
    { id: "m2", question: "Are you comparing your progress to someone else's?" },
    { id: "m3", question: "Is perfectionism making the first step feel impossible?" },
  ];

  const environmentalQuestions = [
    { id: "e1", question: "Is your current space noisy, cluttered, or distracting?" },
    { id: "e2", question: "Would changing rooms or surfaces help you think differently?" },
    { id: "e3", question: "Is there something in your environment you could remove or add?" },
  ];

  const currentQuestions =
    step === "physical" ? physicalQuestions :
    step === "mental" ? mentalQuestions :
    step === "environmental" ? environmentalQuestions : [];

  const allAnswered = currentQuestions.every((q) => answers[q.id] !== undefined);

  const moveToNext = () => {
    if (step === "physical") setStep("mental");
    else if (step === "mental") setStep("environmental");
    else if (step === "environmental") setStep("summary");
  };

  const getSummary = () => {
    const physicalNo = physicalQuestions.filter((q) => answers[q.id] === "no").length;
    const mentalNo = mentalQuestions.filter((q) => answers[q.id] === "yes").length;
    const environmentalNo = environmentalQuestions.filter((q) => answers[q.id] === "yes").length;

    const insights: string[] = [];
    if (physicalNo >= 2) insights.push("🧬 Your body needs attention first — address physical needs before expecting mental clarity.");
    if (mentalNo >= 2) insights.push("🧠 There's significant mental friction — thought reframing or CBT exercises may help more than pushing through.");
    if (environmentalNo >= 1) insights.push("🏠 Your environment may be working against you — even a small change could unlock momentum.");
    if (insights.length === 0) insights.push("🌿 Your friction may be situational rather than systemic. A micro-action or brief reset could be the nudge you need.");

    return insights;
  };

  const resetDiagnostic = () => {
    setStep("physical");
    setAnswers({});
  };

  return (
    <div className="max-w-[90%] rounded-xl bg-white shadow-sm ring-1 ring-brand-cream/30 overflow-hidden border border-brand-leaf/10">
      <div className="bg-gradient-to-r from-emerald-50/80 via-brand-warm/40 to-brand-warm/20 px-4 py-3 flex items-center gap-2">
        <span className="text-lg">🧭</span>
        <span className="font-serif text-sm font-semibold text-brand-dark tracking-tight">Clarity Check-in</span>
        <div className="ml-auto flex gap-1">
          <span className={`h-1.5 w-1.5 rounded-full ${step === "physical" ? "bg-brand-leaf" : "bg-brand-cream"}`} />
          <span className={`h-1.5 w-1.5 rounded-full ${step === "mental" ? "bg-brand-leaf" : "bg-brand-cream"}`} />
          <span className={`h-1.5 w-1.5 rounded-full ${step === "environmental" ? "bg-brand-leaf" : "bg-brand-cream"}`} />
          <span className={`h-1.5 w-1.5 rounded-full ${step === "summary" ? "bg-brand-deep" : "bg-brand-cream"}`} />
        </div>
      </div>
      <div className="p-5 space-y-4">
        {step !== "summary" ? (
          <>
            <p className="text-sm leading-relaxed text-brand-dark">{msg.content}</p>

            <p className="text-xs font-semibold text-brand-muted uppercase tracking-wide">
              {step === "physical" ? "🩺 Physical Check" :
               step === "mental" ? "🧠 Mental Check" :
               "🏠 Environmental Check"}
            </p>

            <div className="space-y-2">
              {currentQuestions.map((q) => (
                <div key={q.id} className="flex items-center gap-3 rounded-lg bg-brand-cream/15 px-3 py-2.5">
                  <p className="flex-1 text-sm text-brand-dark">{q.question}</p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: "yes" }))}
                      className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                        answers[q.id] === "yes"
                          ? "bg-brand-leaf text-white"
                          : "bg-white/60 text-brand-muted hover:bg-brand-leaf/20 hover:text-brand-leaf"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: "no" }))}
                      className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                        answers[q.id] === "no"
                          ? "bg-brand-rose text-white"
                          : "bg-white/60 text-brand-muted hover:bg-brand-rose/20 hover:text-brand-rose"
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              {step !== "physical" && (
                <button onClick={() => setStep(step === "mental" ? "physical" : "mental")} className="btn-ghost text-xs">
                  ← Back
                </button>
              )}
              <button
                onClick={moveToNext}
                disabled={!allAnswered}
                className="btn-primary text-xs flex-1 disabled:opacity-50"
              >
                {step === "environmental" ? "See my insights →" : "Next →"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-lg">🔍</span>
              <p className="font-serif text-base font-semibold text-brand-dark">Your Clarity Snapshot</p>
            </div>

            <div className="space-y-2">
              {getSummary().map((insight, i) => (
                <div key={i} className="rounded-xl bg-gradient-to-br from-brand-warm/50 to-white border border-brand-light/15 p-4">
                  <p className="text-sm leading-relaxed text-brand-dark">{insight}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={resetDiagnostic} className="btn-ghost text-xs">
                Run again
              </button>
              <button
                onClick={() => onResponse("The clarity check-in helped. I understand better where my friction is coming from.")}
                className="btn-primary text-xs flex-1"
              >
                This helps — thank you ✨
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
