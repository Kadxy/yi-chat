import { smoothStream, streamText } from "ai";

import { customModelProvider, MODEL_IDS } from "lib/ai/models";
import { MODEL_ID } from "app-types/models";
import { CREATE_THREAD_TITLE_PROMPT } from "lib/ai/prompts";
import globalLogger from "logger";
import { chatRepository } from "lib/db/repository";
import { getSession } from "auth/server";
import { colorize } from "consola/utils";
import { handleError } from "../shared.chat";

const logger = globalLogger.withDefaults({
  message: colorize("blackBright", `Title API: `),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();

    const { message, threadId } = json as {
      message: string;
      threadId: string;
    };

    if (!message || !threadId) {
      return new Response("Missing message or threadId", { status: 400 });
    }

    const session = await getSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    logger.info(`threadId: ${threadId}`);

    const result = streamText({
      model: customModelProvider.getModel(MODEL_IDS[MODEL_ID.HAIKU]),
      system: CREATE_THREAD_TITLE_PROMPT,
      maxOutputTokens: 80,
      experimental_transform: smoothStream(),
      prompt: message,
      abortSignal: request.signal,
      onFinish: (ctx) => {
        chatRepository
          .upsertThread({
            id: threadId,
            title: ctx.text,
            userId: session.user.id,
          })
          .catch((err) => logger.error(err));
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    return new Response(handleError(err), { status: 500 });
  }
}
