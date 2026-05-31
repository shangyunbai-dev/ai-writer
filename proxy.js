// api/proxy.js - 阿里云百炼安全代理
export default async function handler(req, res) {
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 设置CORS头，允许跨域
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理OPTIONS预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 从Vercel环境变量获取API Key（永远不会暴露给前端）
    const apiKey = process.env.ALIYUN_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'API Key not configured' });
    }

    // 阿里云百炼API地址（北京地域，国内最快）
    const apiUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

    // 转发请求到阿里云API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    // 处理流式响应
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value));
      }

      res.end();
    } else {
      // 处理普通响应
      const data = await response.json();
      res.status(response.status).json(data);
    }
  } catch (error) {
    console.error('API proxy error:', error);
    res.status(500).json({ error: 'API request failed' });
  }
}