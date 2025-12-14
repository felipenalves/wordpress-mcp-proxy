import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";

// Multi-tenant client configuration
const CLIENTS: Record<string, { wpApiUrl: string; wpToken: string }> = {
  carbureto: {
    wpApiUrl: "https://produtoracarbureto.com.br/wp-json",
    wpToken: "your-jwt-token-here",
  },
  // Add more clients here
  // clienteY: {
  //   wpApiUrl: "https://siteclienteY.com/wp-json",
  //   wpToken: "token-clienteY",
  // },
};

export class WordPressMCPProxy extends McpAgent {
  server = new McpServer({
    name: "WordPress MCP Proxy",
    version: "1.0.0",
  });

  async init() {
    // Tool: List posts for a client
    this.server.tool(
      "list_posts",
      {
        clientId: z.string().describe("Client identifier (e.g., 'carbureto')"),
        status: z.string().optional().describe("Post status (draft, publish, etc)"),
      },
      async ({ clientId, status }) => {
        const client = CLIENTS[clientId];
        if (!client) {
          return {
            content: [{ type: "text", text: `Client '${clientId}' not found` }],
            isError: true,
          };
        }

        try {
          const params = new URLSearchParams();
          if (status) params.append("status", status);
          const url = `${client.wpApiUrl}/wp/v2/posts?${params}`;
          const response = await fetch(url, {
            headers: {
              Authorization: `Bearer ${client.wpToken}`,
              "Content-Type": "application/json",
            },
          });
          const posts = await response.json();
          return {
            content: [{ type: "text", text: JSON.stringify(posts, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error fetching posts: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Tool: Create a draft post
    this.server.tool(
      "create_draft_post",
      {
        clientId: z.string().describe("Client identifier"),
        title: z.string().describe("Post title"),
        content: z.string().describe("Post content"),
      },
      async ({ clientId, title, content }) => {
        const client = CLIENTS[clientId];
        if (!client) {
          return {
            content: [{ type: "text", text: `Client '${clientId}' not found` }],
            isError: true,
          };
        }

        try {
          const url = `${client.wpApiUrl}/wp/v2/posts`;
          const response = await fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${client.wpToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title,
              content,
              status: "draft",
            }),
          });
          const post = await response.json();
          return {
            content: [{ type: "text", text: `Draft post created: ${JSON.stringify(post, null, 2)}` }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error creating post: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }
    );
  }
}
