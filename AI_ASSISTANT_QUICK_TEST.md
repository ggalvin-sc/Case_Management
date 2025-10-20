# AI Assistant - Quick Test Guide

## ✅ Everything Is Ready!

Both servers are running and the endpoint is configured correctly.

## Test It Now!

### 1. Open Your Browser

Go to: **https://localhost:3000/pages/ai-assistant.html**

(Accept the self-signed certificate warning if prompted)

### 2. Login (if needed)

- Email: `attorney@example.com`
- Password: `password123`

### 3. Ask a Question

Try one of these:

**Legal Questions:**
- "What is the statute of limitations in California?"
- "What are the elements of a contract?"
- "What is discovery in civil litigation?"

**General Questions:**
- "How far is the sun from the earth?"
- "What is 2+2?"
- "Explain photosynthesis in simple terms"

### 4. What to Expect

✅ **Loading indicator** should appear
✅ **Response in ~2-3 seconds**
✅ **Answer displayed** in formatted paragraphs
✅ **No [object Object] errors**
✅ **Copy and New Question buttons** work

## System Status

| Component | Status | Details |
|-----------|--------|---------|
| **Node.js Backend** | ✅ Running | Port 3000 (HTTPS) |
| **Rust Service** | ✅ Running | Port 3001 (HTTP) |
| **vLLM Endpoint** | ✅ Active | 3 workers ready |
| **Answer Extraction** | ✅ Configured | Handles tokens[] format |

## Troubleshooting

### If you see errors:

**"CSRF token expired"**
- Just refresh the page and login again

**Connection refused**
- Check that both servers are running (see below)

**Still getting [object Object]**
- Check Node.js backend logs for errors
- Check Rust service logs

## Check Server Status

### Node.js Backend
```bash
# Look for this process
ps aux | grep "node server.js"

# Or check with netstat
netstat -ano | findstr :3000
```

### Rust Service
```bash
# Look for this process
ps aux | grep runpod-rust

# Or check with netstat
netstat -ano | findstr :3001
```

### Test Endpoints Directly

**Rust Service Health:**
```bash
curl http://localhost:3001/health
```

**Rust Service API Health:**
```bash
curl http://localhost:3001/api-health
```

## Expected Flow

```
1. You type question in browser
2. Frontend → POST /api/v1/ai/ask → Node.js (3000)
3. Node.js → POST /execute → Rust (3001)
4. Rust → POST /runsync → RunPod vLLM (3hm50vlw5z2y5o)
5. RunPod processes with AI model
6. Response flows back: RunPod → Rust → Node.js → Browser
7. Answer displayed on screen
```

## What Changed

### From Broken ❌
- **Endpoint:** Ollama (jk5momzbmdxhk9)
- **Status:** Jobs failing
- **Display:** [object Object]

### To Working ✅
- **Endpoint:** vLLM (3hm50vlw5z2y5o)
- **Status:** Jobs completing
- **Display:** Properly formatted answers

---

**Ready to test!** 🚀

Visit: https://localhost:3000/pages/ai-assistant.html
