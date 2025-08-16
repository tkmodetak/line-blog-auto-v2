const { Anthropic } = require('@anthropic-ai/sdk');
const axios = require('axios');

// 環境変数
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

// Claude初期化
const anthropic = new Anthropic({
  apiKey: CLAUDE_API_KEY?.replace(/s+/g, ''),
});

// ブログ生成関数
async function generateBlog(topic) {
  try {
    console.log('Starting blog generation for topic:', topic);

    const prompt = `「${topic}」についてのブログ記事を日本語で作成してください。
    
    以下の構成で書いてください：
    1. キャッチーなタイトル
    2. 導入文
    3. 本文（3つのセクション）
    4. まとめ
    
    読みやすくSEOも意識した構成でお願いします。`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = message.content[0].text;
    console.log('Claude response received, length:', text.length);
    return text;

  } catch (error) {
    console.error('Claude API error:', error.message);
    return `# ${topic}についてnnエラーが発生しました: ${error.message}`;
  }
}

// ブログ保存関数
const blogStorage = [];

async function saveToStorage(content, topic) {
  try {
    const fileName = `blog_${topic}_${Date.now()}.md`;
    blogStorage.push({
      fileName,
      content,
      topic,
      createdAt: new Date()
    });
    console.log('Blog saved:', fileName);
    return fileName;
  } catch (error) {
    console.error('Save error:', error);
    throw error;
  }
}

// LINE返信関数
async function replyToLine(replyToken, message) {
  try {
    console.log('Sending LINE reply...');
    const cleanToken = LINE_CHANNEL_ACCESS_TOKEN?.replace(/s+/g, '');

    const response = await axios.post('https://api.line.me/v2/bot/message/reply', {
      replyToken: replyToken,
      messages: [{
        type: 'text',
        text: message
      }]
    }, {
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Reply sent successfully');
  } catch (error) {
    console.error('Error sending reply:', error.response?.data || error.message);
  }
}

// メインのWebhookハンドラー
module.exports = async (req, res) => {
  console.log('Webhook received, method:', req.method);

  // CORS対応
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-line-signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const events = req.body.events || [];
    console.log('Events received:', events.length);

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const text = event.message.text;
        const replyToken = event.replyToken;
        console.log('Processing message:', text);

        try {
          // ブログ生成
          const blogContent = await generateBlog(text);
          console.log('Blog generated successfully');

          // 保存
          const fileName = await saveToStorage(blogContent, text);
          console.log('Saved:', fileName);

          // LINE に成功メッセージを返信
          const successMessage = `? ブログ記事の生成が完了しました！

? テーマ: 「${text}」
? ファイル名: ${fileName}
? 生成時刻: ${new Date().toLocaleString('ja-JP')}

新しい記事が生成されました！`;

          await replyToLine(replyToken, successMessage);

        } catch (error) {
          console.error('Blog generation error:', error);
          await replyToLine(replyToken, `? エラーが発生しました: ${error.message}`);
        }
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(200).json({ success: true, error: error.message });
  }
};