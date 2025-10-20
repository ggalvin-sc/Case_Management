# RunPod Endpoint Troubleshooting Guide

## ✅ ISSUE RESOLVED

**Problem:** Wrong endpoint type (Ollama instead of vLLM)
**Solution:** Switched to working vLLM endpoint
**New Endpoint ID:** `3hm50vlw5z2y5o`
**Status:** ✅ Working perfectly
**See:** ENDPOINT_FIX_SUMMARY.md for details

---

## Previous Issue (RESOLVED)

**Old Endpoint ID:** `jk5momzbmdxhk9`
**API Key:** Configured ✅
**Workers:** 1 ready, 1 idle, 1 throttled
**Last Job:** FAILED

## Issue: Jobs Failing

Jobs are reaching the endpoint but failing to execute. This typically means:

1. **Wrong input format** - The handler expects different parameters
2. **Model not configured** - The endpoint doesn't have a working model
3. **Handler code error** - The serverless function has bugs
4. **Missing dependencies** - Required packages aren't installed

## Steps to Fix

### 1. Check RunPod Console

Go to: https://www.runpod.io/console/serverless

Find endpoint `jk5momzbmdxhk9` and check:

#### A. Template/Docker Image
- What template is this endpoint using?
- Is it a pre-built template or custom?
- Common templates:
  - `runpod/worker-vllm` - For LLM inference
  - `runpod/worker-a1111` - For Stable Diffusion
  - Custom Docker image

#### B. Handler Configuration
Click on the endpoint → **View Logs** to see:
- What error messages appear
- What the handler expects

#### C. Environment Variables
Check if the handler needs:
- `MODEL_NAME` or `HF_MODEL_ID`
- API tokens (HuggingFace, etc.)
- Other config

### 2. Test Input Format

Our current request:
```json
{
  "input": {
    "prompt": "What is 2+2?"
  }
}
```

Common alternatives the handler might expect:

**Option A: Direct prompt**
```json
{
  "input": {
    "prompt": "What is 2+2?"
  }
}
```

**Option B: Messages format (ChatGPT-style)**
```json
{
  "input": {
    "messages": [
      {"role": "user", "content": "What is 2+2?"}
    ]
  }
}
```

**Option C: Text generation format**
```json
{
  "input": {
    "text": "What is 2+2?",
    "max_new_tokens": 100,
    "temperature": 0.7
  }
}
```

**Option D: vLLM format**
```json
{
  "input": {
    "prompt": "What is 2+2?",
    "sampling_params": {
      "max_tokens": 100,
      "temperature": 0.7
    }
  }
}
```

### 3. Check Worker Logs in RunPod

1. Go to endpoint details
2. Click **Logs** tab
3. Look for error messages like:
   - `KeyError: 'expected_field'`
   - `Model not found`
   - `Invalid input format`
   - Python traceback

### 4. Common Fixes

#### Fix A: Wrong Template
If using wrong template:
1. **Deploy new endpoint** with correct template
2. **Update** `.env` files with new endpoint ID
3. Common templates for Q&A:
   - `runpod/worker-vllm:latest` (for LLMs)
   - Or search RunPod marketplace for "chat" or "LLM"

#### Fix B: Model Not Set
If template needs model configuration:
1. Go to endpoint **Settings**
2. Add environment variable: `MODEL_NAME=meta-llama/Llama-2-7b-chat-hf` (or similar)
3. Restart workers

#### Fix C: Handler Code Issue
If custom handler:
1. Check handler.py in your RunPod files
2. Ensure it has proper error handling
3. Match input format to what we're sending

### 5. Quick Test: Use RunPod's Test Tool

In RunPod console:
1. Go to your endpoint
2. Click **Test**
3. Try these inputs:

**Test 1:**
```json
{
  "input": {
    "prompt": "Hello, world!"
  }
}
```

**Test 2:**
```json
{
  "input": {
    "text": "Hello, world!"
  }
}
```

**Test 3:**
```json
{
  "input": {
    "messages": [{"role": "user", "content": "Hello"}]
  }
}
```

See which one works!

## What to Tell Me

Once you check the RunPod console, tell me:

1. **Template name** (e.g., "runpod/worker-vllm:0.2.0")
2. **Error in logs** (copy the error message)
3. **Which test input worked** (if any)
4. **Model name** (if configured)

With this info, I can:
- Update our code to send the correct format
- Help configure the endpoint properly
- Or help you deploy a better template

## Alternative: Use a Pre-built Template

If your current endpoint is too complex, you can:

1. **Deploy new endpoint** with a working template:
   - Search RunPod marketplace for "vLLM" or "Text Generation"
   - Deploy with a small model (e.g., `meta-llama/Llama-2-7b-chat-hf`)

2. **Update our code** with new endpoint ID:
   ```bash
   # Edit runpod-rust/.env
   RUNPOD_DEFAULT_ENDPOINT_ID=<new_endpoint_id>
   ```

3. **Restart Rust service**:
   ```bash
   # Kill current service (Ctrl+C in terminal)
   cd runpod-rust
   cargo run --release
   ```

## Current System Status

✅ **What's Working:**
- Rust service running on port 3001
- Node.js backend running on port 3000
- API authentication successful
- Request routing: Browser → Node → Rust → RunPod

❌ **What's Not Working:**
- RunPod endpoint processing (jobs fail)
- Need correct input format or endpoint configuration

---

**Next Step:** Check your RunPod console and let me know what you find!
