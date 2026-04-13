import { solveChallenge } from "altcha-lib";
import type { Challenge } from "altcha-lib/types";

export async function getAltchaPayload(): Promise<string> {
  const response = await fetch("/api/captcha/challenge");
  if (!response.ok) {
    throw new Error("Failed to get captcha challenge");
  }

  const { algorithm, challenge, salt, maxnumber, signature } =
    (await response.json()) as Challenge;

  const result = solveChallenge(challenge, salt, algorithm, maxnumber);
  const solution = await result.promise;

  if (!solution) {
    throw new Error("Failed to solve captcha challenge");
  }

  const payload = {
    algorithm,
    challenge,
    number: solution.number,
    salt,
    signature,
  };

  return btoa(JSON.stringify(payload));
}
