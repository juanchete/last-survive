# MCP Server Setup Guide for NFL Fantasy App

## 1. Install MCP Servers

First, install the MCP servers globally:

```bash
# Install Supabase MCP
npm install -g @modelcontextprotocol/server-supabase

# Install PostgreSQL MCP
npm install -g @modelcontextprotocol/server-postgresql

# Install GitHub MCP (optional)
npm install -g @modelcontextprotocol/server-github
```

## 2. Configure Claude Desktop

### Find Your Config File

**macOS**: 
```bash
open ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Windows**: 
```bash
notepad %APPDATA%\Claude\claude_desktop_config.json
```

**Linux**: 
```bash
nano ~/.config/Claude/claude_desktop_config.json
```

### Add MCP Servers to Config

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "node",
      "args": ["/usr/local/lib/node_modules/@modelcontextprotocol/server-supabase/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://tvzktsamnoiyjbayimvh.supabase.co",
        "SUPABASE_SERVICE_KEY": "your-service-role-key-here"
      }
    },
    "postgresql": {
      "command": "node",
      "args": ["/usr/local/lib/node_modules/@modelcontextprotocol/server-postgresql/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://postgres:[password]@[host]:[port]/[database]"
      }
    },
    "github": {
      "command": "node",
      "args": ["/usr/local/lib/node_modules/@modelcontextprotocol/server-github/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_github_personal_access_token"
      }
    }
  }
}
```

## 3. Get Your Credentials

### Supabase Service Key (IMPORTANT: Keep this secret!)
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings → API
4. Copy the `service_role` key (NOT the anon key)
5. ⚠️ **WARNING**: Never commit this key to git!

### PostgreSQL Connection String
1. In Supabase Dashboard → Settings → Database
2. Copy the connection string
3. It looks like: `postgresql://postgres:[password]@db.tvzktsamnoiyjbayimvh.supabase.co:5432/postgres`

### GitHub Token (Optional)
1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token with repo access
3. Copy the token

## 4. Alternative: Use npx (Easier but slower)

If you prefer not to install globally, use npx:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-supabase"],
      "env": {
        "SUPABASE_URL": "https://tvzktsamnoiyjbayimvh.supabase.co",
        "SUPABASE_SERVICE_KEY": "your-service-role-key"
      }
    }
  }
}
```

## 5. Restart Claude Desktop

After editing the config:
1. Completely quit Claude Desktop
2. Start it again
3. Check the MCP icon in Claude to see if servers are connected

## 6. Test Your MCP Servers

In Claude, you can now use:

**For Supabase MCP:**
- Direct database queries
- Table management
- RLS policy inspection
- Real-time subscriptions

**For PostgreSQL MCP:**
- Raw SQL queries
- Performance analysis
- Index management
- Database optimization

## 🔒 Security Notes

1. **NEVER share your service_role key** - it has full database access
2. **Don't commit credentials** - Keep them in your local config only
3. **Use environment variables** in production
4. **Rotate keys regularly** for security

## 🚨 Troubleshooting

### MCP Not Showing Up?
1. Check the file path in args is correct
2. Verify the server is installed: `npm list -g @modelcontextprotocol/server-supabase`
3. Check Claude's developer console for errors

### Permission Errors?
- On macOS/Linux, you might need to make the file executable
- Try using npx instead of global install

### Connection Failed?
- Verify your credentials are correct
- Check if your Supabase project is active
- Ensure you're using the service key, not the anon key