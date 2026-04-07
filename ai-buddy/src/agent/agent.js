require('dotenv').config();
const { StateGraph, MessagesAnnotation } = require('@langchain/langgraph');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { ToolMessage, AIMessage } = require('@langchain/core/messages');
const tools = require('./tool');

const googleApiKey = process.env.GOOGLE_API_KEY;
if (!googleApiKey) {
    throw new Error(
        'Missing GOOGLE_API_KEY. Set it in your environment or in a .env file at the project root, then restart the server.'
    );
}

console.log('Google API Key loaded :', googleApiKey);

const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    temperature: 0.5,
    apiKey: googleApiKey,
    maxRetries: 0
});


const graph = new StateGraph(MessagesAnnotation)
    .addNode("tools", async (state, config) => {
        console.log("🛠️ Tools node");
        const lastMessage = state.messages[state.messages.length - 1];
        const toolsCall = lastMessage.tool_calls || [];

        const toolResults = await Promise.all(toolsCall.map(async (call) => {
            const tool = tools[call.name];
            if (!tool) {
                throw new Error(`Tool ${call.name} not found`);
            }

            const toolInput = call.args;
            const toolResult = await tool.func({ ...toolInput, token: config.metadata.token })

            return new ToolMessage({
                content: typeof toolResult === "string"
                    ? toolResult
                    : JSON.stringify(toolResult),
                name: call.name,
                tool_call_id: call.id
            });
        }));

        return {...state, messages: [...state.messages, ...toolResults] };
    })
    .addNode("chat", async (state, config) => {
        console.log("💬 Chat node");

        let lastCallTime = 0;

async function rateLimit() {
    const now = Date.now();
    if (now - lastCallTime < 1500) {
        await new Promise(r => setTimeout(r, 1500));
    }
    lastCallTime = Date.now();
}

rateLimit();
        const response = await model.invoke(state.messages, {
            tools: [tools.searchProduct, tools.addProductToCart],
            metadata: {
                token: config?.metadata?.token
            }
        });

        console.log("Model response:", response);

        return {
    ...state,
    messages: [
        ...state.messages,
        new AIMessage({
            content: response.content,
            tool_calls: response.tool_calls,
        })
    ]
};
    })
    .addEdge("__start__", "chat")
    .addConditionalEdges("chat", async (state) => {
        const lastMessage = state.messages[state.messages.length - 1];

        if (state.messages.length > 6) {
        console.log("🚨 Loop detected, stopping");
        return "__end__";
    }

        if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
            return ["tools"];
        }else {
            return "__end__"
        }
    })
    .addEdge("tools", "chat");


const agent = graph.compile();

module.exports = agent;