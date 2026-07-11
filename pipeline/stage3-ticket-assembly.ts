import { callClaude, parseJsonResponse, MODEL_CONFIG } from '@/lib/anthropic';
import { STAGE_3_SYSTEM_PROMPT } from './prompts/stage3';
import type { ReasonedPick, AssembledTicket, TicketType } from '@/types/edge';

const COMBINED_ODDS_CAP = 3.0;
const ODDS_TOLERANCE = 0.005;
const REQUIRED_TICKET_TYPES: TicketType[] = ['anchor', 'value', 'diversified'];

interface RawTicket {
  type: TicketType;
  picks: string[];
  combinedOdds: number;
  assemblyNote: string;
}

function validate(tickets: RawTicket[]): string | null {
  if (tickets.length !== 3) {
    return `Expected exactly 3 tickets, got ${tickets.length}`;
  }

  const types = tickets.map((t) => t.type).sort();
  if (JSON.stringify(types) !== JSON.stringify([...REQUIRED_TICKET_TYPES].sort())) {
    return `Expected ticket types [anchor, value, diversified], got [${types.join(', ')}]`;
  }

  const allPicks = tickets.flatMap((t) => t.picks);
  if (new Set(allPicks).size !== allPicks.length) {
    return 'A pick appears in more than one ticket';
  }

  for (const ticket of tickets) {
    if (ticket.picks.length !== 3) {
      return `Ticket "${ticket.type}" has ${ticket.picks.length} picks, expected exactly 3`;
    }
    if (ticket.combinedOdds > COMBINED_ODDS_CAP + ODDS_TOLERANCE) {
      return `Ticket "${ticket.type}" combined odds ${ticket.combinedOdds} exceeds the 3.00 cap`;
    }
  }

  return null;
}

function toAssembledTickets(tickets: RawTicket[]): AssembledTicket[] {
  return tickets.map((t) => ({
    type: t.type,
    pickIds: t.picks,
    combinedOdds: t.combinedOdds,
    rationale: t.assemblyNote,
  }));
}

export async function runStage3(picks: ReasonedPick[]): Promise<AssembledTicket[]> {
  const userContent = JSON.stringify(picks);

  const raw = await callClaude({
    model: MODEL_CONFIG.STAGE_3,
    systemPrompt: STAGE_3_SYSTEM_PROMPT,
    userContent,
    maxTokens: 2048,
    stage: 3,
  });

  let { tickets } = parseJsonResponse<{ tickets: RawTicket[] }>(raw);
  let violation = validate(tickets);

  if (violation) {
    console.warn(`[stage3] validation failed, retrying once: ${violation}`);

    const correctionRaw = await callClaude({
      model: MODEL_CONFIG.STAGE_3,
      systemPrompt: STAGE_3_SYSTEM_PROMPT,
      userContent: `${userContent}\n\nYour previous attempt violated a hard rule: ${violation}. Regenerate the 3 tickets, strictly obeying all hard rules this time.`,
      maxTokens: 2048,
      stage: 3,
    });

    ({ tickets } = parseJsonResponse<{ tickets: RawTicket[] }>(correctionRaw));
    violation = validate(tickets);
    if (violation) {
      console.warn(`[stage3] validation still failing after retry: ${violation}`);
    }
  }

  return toAssembledTickets(tickets);
}
