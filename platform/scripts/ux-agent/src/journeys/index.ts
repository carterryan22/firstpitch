import { coachJourneys } from "./coach.ts";
import { parentJourneys } from "./parent.ts";
import { playerJourneys } from "./player.ts";
import type { Journey } from "../types.ts";

export const journeys: Journey[] = [...coachJourneys, ...parentJourneys, ...playerJourneys];
