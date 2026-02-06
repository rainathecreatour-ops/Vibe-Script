import { approxWordsForDuration, clampWords } from './validators';

export type Platform =
  | 'Suno'
  | 'YouTube'
  | 'TikTok/Reels'
  | 'Podcast'
  | 'Meditation App'
  | 'ElevenLabs';

export type Topic =
  | 'Money Affirmations'
  | 'Motivation'
  | 'Spiritual (Non-Religious)'
  | 'Religious (Faith/Bible)'
  | 'Relatable Everyday'
  | 'Healing/Anxiety Relief'
  | 'Confidence/Self-Worth'
  | 'Custom';

export type Tone =
  | 'Calm'
  | 'Powerful'
  | 'Emotional'
  | 'Soft & Nurturing'
  | 'Bold & Confident'
  | 'Cinematic'
  | 'Relatable/Conversational';

export type Aspect = 'Vertical 9:16' | 'Square 1:1' | 'Horizontal 16:9';

export type ScriptStructure =
  | 'Hook → Message → Close'
  | 'Affirmation Loop'
  | 'Story-Based'
  | 'Guided Reflection'
  | 'Prayer-Style';

export type Input = {
  topic: Topic;
  customTopic?: string;
  tone: Tone;
  platform: Platform;
  durationSeconds: number;
  structure: ScriptStructure;
  aspect: Aspect;
  voiceStyle: 'Warm Coach' | 'Soft Narrator' | 'Confident Narrator' | 'Spiritual Guide';
  hookStrength: 'Gentle' | 'Balanced' | 'Strong' | 'Scroll-Stopping';
  audience: 'Women' | 'Men' | 'Moms' | 'Teens' | 'Everyone';
  keywords?: string;
  notes?: string;

  includeHooksCaptions: boolean;

  // ✅ NEW: B-roll toggle
  includeBRoll: boolean;
};

function platformGuidance(p: Platform) {
  switch (p) {
    case 'TikTok/Reels':
      return 'Short lines, fast clarity, strong hook in first 2 seconds, punchy closing line.';
    case 'YouTube':
      return 'Clear intro, steady pacing, slight repetition for retention.';
    case 'Podcast':
      return 'More natural transitions, less “salesy,” more storytelling and depth.';
    case 'Meditation App':
      return 'Slower pace, more pauses, soothing language, gentle cues like (pause).';
    case 'ElevenLabs':
      return 'Voice-ready narration with natural breath breaks and clean punctuation.';
    case 'Suno':
      return 'Instrumental guidance should be music-generator friendly with BPM and vibe notes.';
    default:
      return '';
  }
}

function topicRules(topic: Topic) {
  if (topic === 'Religious (Faith/Bible)') {
    return `Keep it respectful and faith-forward. You may include a short Bible verse reference (no long quotes).`;
  }
  if (topic === 'Money Affirmations') {
    return `Use empowering, believable affirmations (avoid unrealistic claims). Include 1 practical mindset line.`;
  }
  return '';
}

export function buildWordTarget(seconds: number) {
  const raw = approxWordsForDuration(seconds);
  return clampWords(raw, 60, 7800);
}

export function buildSystemPrompt() {
  return `
You are a professional scriptwriter and creative director for creators.
You write narration-ready scripts optimized for spoken delivery, pacing, and clarity.
You generate image prompts and instrumental/music prompts that match the vibe.
When requested, you also generate hooks/captions and a B-roll shot list.
Return clean output with headings. No markdown tables. No emojis unless requested.
`.trim();
}

function hooksCaptionsRulesBlock() {
  return `
Hooks & captions rules:
- Hooks: 1–2 sentences max each.
- Captions: concise, post-ready, natural.
- Max 3 hashtags only if they fit organically.
- Do NOT repeat the script verbatim.
`.trim();
}

function hooksCaptionsOutputBlock() {
  return `
HOOKS (3):
- Hook 1 (soft):
- Hook 2 (balanced):
- Hook 3 (scroll-stopping):

CAPTIONS (3):
- Caption 1 (short & clean):
- Caption 2 (engaging with CTA):
- Caption 3 (emotional or relatable):
`.trim();
}

function brollRulesBlock() {
  return `
B-roll rules:
- Provide 10 clip ideas (8–12 acceptable).
- Each line should include: subject + action + setting + shot type (wide/medium/close) + motion (static/slow pan/handheld) + mood.
- Keep it platform-friendly and easy to source on stock sites or generate with AI video tools.
- No brand names, no copyrighted characters.
`.trim();
}

function brollOutputBlock() {
  return `
B-ROLL SHOT LIST (10):
1)
2)
3)
4)
5)
6)
7)
8)
9)
10)
`.trim();
}

export function buildUserPrompt(input: Input) {
  const topicFinal = input.topic === 'Custom' ? (input.customTopic || 'Custom Topic') : input.topic;
  const targetWords = buildWordTarget(input.durationSeconds);

  const includeHC = !!input.includeHooksCaptions;
  const includeBR = !!input.includeBRoll;

  return `
Create:
1) A narration-ready script
${includeHC ? '2) THREE hooks\n3) THREE captions\n' : ''}${includeBR ? `${includeHC ? '' : '2) '}A B-roll shot list\n` : ''}4) FIVE distinct visual image prompts
5) An instrumental/music prompt tailored to the chosen platform

Constraints:
- Topic: ${topicFinal}
- Audience: ${input.audience}
- Tone: ${input.tone}
- Voice Style: ${input.voiceStyle}
- Structure: ${input.structure}
- Hook Strength: ${input.hookStrength}
- Platform: ${input.platform}
- Target length: ~${targetWords} words (match pacing for ${Math.round(input.durationSeconds / 60)} minutes)
- Avoid unsafe/medical/legal claims. Keep it practical and uplifting.
- If Religious: no long verse quotes; brief reference only.

Platform guidance: ${platformGuidance(input.platform)}
Topic rules: ${topicRules(input.topic)}
${includeHC ? hooksCaptionsRulesBlock() : ''}
${includeBR ? brollRulesBlock() : ''}

Visuals:
- Create 5 prompts with different looks:
  1) Minimal
  2) Cinematic
  3) Soft/Calming
  4) Relatable/Real-life
  5) Abstract/Symbolic
- Aspect ratio: ${input.aspect}
- Each prompt: subject, environment, lighting, camera feel, mood keywords, and "no text, no watermark".

Instrumental/music:
- Provide: mood, BPM range, instruments, energy curve, loopability, and mixing notes for voice-over.

Extra keywords: ${input.keywords || 'N/A'}
Extra notes: ${input.notes || 'N/A'}

Output format:
TITLE:

SCRIPT:
${includeHC ? '\n' + hooksCaptionsOutputBlock() + '\n' : ''}

${includeBR ? brollOutputBlock() + '\n' : ''}

VISUAL PROMPTS (5):
1)
2)
3)
4)
5)

INSTRUMENTAL / MUSIC PROMPT:
`.trim();
}
