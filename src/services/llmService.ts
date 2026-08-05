
import type { AgentProfile } from '../types/store.types';

/**
 * Builds the system prompt for the AI engine embedded in Somaterm.
 * 
 * @returns {string} The constructed system prompt defining the AI's identity,
 * environment, constraints, and capabilities.
 */
export function buildSystemPrompt(): string {
  const osName = "macOS Apple Silicon";
  const shellName = "zsh";

  return `
# [IDENTITY & ENVIRONMENT]
You are the AI engine embedded directly within "Somaterm", an advanced native terminal multiplexer and developer workspace.
If the user asks "what application is this?", "who are you?", or asks about your capabilities, introduce Somaterm naturally but concisely. Do not assume these meta-questions are terminal errors.
Current Host OS: ${osName}
Current Shell: ${shellName}

# [SOMATERM CAPABILITIES]
If the user asks what they can do or how to use you, explain these core features in bullet points:
1. Terminal Context Awareness (Kamikaze): Users can select terminal text to instantly send errors to you for analysis.
2. One-Click Execution: You provide executable code blocks that users can run directly in their terminal with a click.
3. Local Privacy: You run entirely locally, ensuring zero latency and total data privacy.

# [SITUATIONAL AWARENESS]
If the user's prompt includes a \`\`\`console block, treat it as the absolute source of truth for an active terminal error or output.

# [BEHAVIORAL CONSTRAINTS]
1. Zero Fluff: For technical issues, skip pleasantries. Start immediately with the solution.
2. Extreme Brevity: Explanations must be 2 sentences maximum.
3. Action-Oriented: If diagnosing an error, explain the *why* briefly, followed immediately by the *how* in a \`\`\`bash or \`\`\`sh code block.
4. Language Support: If providing Python code, use \`\`\`python blocks.
5. Strict Formatting: Do NOT output bash, sh, or terminal code blocks unless they contain actual, executable commands. Never output explanatory text or comments inside a code block just to trigger the UI.
  `.trim();
}

/**
 * Sends a message to the specified LLM agent and handles the streaming response.
 * 
 * @param activeAgent - The active agent profile containing the endpoint and credentials.
 * @param networkMessages - The complete history of messages to send to the agent, including the new user message.
 * @param signal - An AbortSignal to allow cancelling the network request.
 * @param onChunk - Callback executed for every chunk of text received from the LLM stream.
 * @param onLog - Callback for internal system logs (e.g. cold start notifications).
 * 
 * @throws {Error} If the network request fails or returns a non-OK status.
 */
export async function streamLLMResponse(
  activeAgent: AgentProfile,
  networkMessages: { role: string, content: string }[],
  signal: AbortSignal,
  onChunk: (chunk: string) => void,
  onLog: (level: 'INFO' | 'WARN' | 'ERROR', msg: string) => void
): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (activeAgent.apiKey && activeAgent.apiKey.trim() !== '') {
    headers['Authorization'] = `Bearer ${activeAgent.apiKey.trim()}`;
  }

  const payload: Record<string, unknown> = {
    model: activeAgent.modelName.trim(),
    messages: [{ role: 'system', content: buildSystemPrompt() }, ...networkMessages],
    stream: true
  };
  
  if (activeAgent.type === 'local') {
    payload.keep_alive = 0;
    onLog('INFO', '[Agent Lifecycle] Waking up local model. Expect cold start delay...');
  }

  onLog('INFO', `[Network] Dispatching generation request to: ${activeAgent.endpoint.trim()}`);
  
  const response = await fetch(activeAgent.endpoint.trim(), {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  if (!response.body) throw new Error("No response body");

  onLog('INFO', '[Agent Lifecycle] Stream started. Model loaded in RAM.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n');
    buffer = parts.pop() || '';
    
    for (const part of parts) {
      const line = part.trim();
      if (!line || line === 'data: [DONE]') continue;
      
      let jsonStr = line;
      if (line.startsWith('data: ')) {
        jsonStr = line.replace('data: ', '');
      }
      
      try {
        const data = JSON.parse(jsonStr);
        const contentChunk = data.choices?.[0]?.delta?.content || data.message?.content || '';
        if (contentChunk) {
          onChunk(contentChunk);
        }
      } catch (e) {
        // Ignore JSON parse errors for incomplete chunks
      }
    }
  }

  if (activeAgent.type === 'local') {
    onLog('INFO', '[Agent Lifecycle] Stream complete. Ollama auto-unloading model...');
  }
}

/**
 * Requests a short chat title from the LLM based on the user's first message.
 * 
 * @param activeAgent - The agent profile to use for generation.
 * @param firstUserMessage - The text of the user's first message to summarize.
 * @returns {Promise<string>} The generated title, cleaned of punctuation and quotes.
 * 
 * @throws {Error} If the network request fails or times out.
 */
export async function generateTitleWithLLM(
  activeAgent: AgentProfile,
  firstUserMessage: string
): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (activeAgent.apiKey && activeAgent.apiKey.trim() !== '') {
    headers['Authorization'] = `Bearer ${activeAgent.apiKey.trim()}`;
  }
  const titlePayload: Record<string, unknown> = {
    model: activeAgent.modelName.trim(),
    messages: [{ role: 'user', content: "Summarize the following prompt in 3 to 5 words to use as a chat title. Do not use quotes or punctuation: " + firstUserMessage }],
    stream: false
  };
  if (activeAgent.type === 'local') {
    titlePayload.keep_alive = 0;
  }

  const titleResponse = await fetch(activeAgent.endpoint.trim(), {
    method: 'POST',
    headers,
    body: JSON.stringify(titlePayload),
    signal: AbortSignal.timeout(10000)
  });
  
  if (!titleResponse.ok) {
    throw new Error(`API Error: ${titleResponse.statusText}`);
  }
  
  const titleData = await titleResponse.json();
  let generatedTitle = titleData.choices?.[0]?.message?.content || titleData.message?.content || 'New Chat';
  generatedTitle = generatedTitle.replace(/["']/g, '').trim();
  
  return generatedTitle;
}
