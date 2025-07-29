# Supabase MCP Server Setup

## 1. Get Your Personal Access Token

1. Go to [Supabase Dashboard](https://app.supabase.com/account/tokens)
2. Click on "Generate new token"
3. Give it a name like "Claude Code MCP"
4. Copy the token (you'll only see it once!)

## 2. Get Your Project Reference

Your project ref is: `tvzktsamnoiyjbayimvh`

(It's the part of your Supabase URL: https://tvzktsamnoiyjbayimvh.supabase.co)

## 3. Update .mcp.json

Edit the `.mcp.json` file in your project root and replace `YOUR_PERSONAL_ACCESS_TOKEN_HERE` with your actual token:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref=tvzktsamnoiyjbayimvh"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "sbp_your_actual_token_here"
      }
    }
  }
}
```

## 4. Optional: Add Read-Only Mode

For safety, you can add `"--read-only"` to prevent accidental modifications:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--read-only",
        "--project-ref=tvzktsamnoiyjbayimvh"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "sbp_your_actual_token_here"
      }
    }
  }
}
```

## 5. Restart Claude Code

After updating the file:
1. Save the changes
2. Restart Claude Code completely
3. You should see the Supabase MCP server in the MCP panel

## 6. What You Can Do With Supabase MCP

Once connected, you can ask Claude to:

- **Query data**: "Show me all active leagues"
- **Analyze schema**: "What tables are in my database?"
- **Check RLS policies**: "Show me the RLS policies for fantasy_teams"
- **Performance analysis**: "Find slow queries in my database"
- **Data validation**: "Check for orphaned records in team_rosters"

## 🔒 Security Notes

1. **NEVER commit .mcp.json** with your token!
2. Add `.mcp.json` to your `.gitignore`:
   ```bash
   echo ".mcp.json" >> .gitignore
   ```
3. The token gives access to your Supabase project, keep it secure
4. Use read-only mode when possible

## 🚨 Troubleshooting

### MCP not showing up?
- Make sure you've restarted Claude Code
- Check that the token is valid
- Verify the project ref is correct

### Permission errors?
- Make sure your token has the necessary permissions
- Try generating a new token

### Connection issues?
- Check your internet connection
- Verify Supabase project is active
- Try without `--read-only` flag first