const { Anthropic } = require('@anthropic-ai/sdk');
const axios = require('axios');

// ���ϐ�
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

// Claude������
const anthropic = new Anthropic({
  apiKey: CLAUDE_API_KEY?.replace(/�s+/g, ''),
});

// �u���O�����֐�
async function generateBlog(topic) {
  try {
    console.log('Starting blog generation for topic:', topic);

    const prompt = `�u${topic}�v�ɂ��Ẵu���O�L������{��ō쐬���Ă��������B
    
    �ȉ��̍\���ŏ����Ă��������F
    1. �L���b�`�[�ȃ^�C�g��
    2. ������
    3. �{���i3�̃Z�N�V�����j
    4. �܂Ƃ�
    
    �ǂ݂₷��SEO���ӎ������\���ł��肢���܂��B`;

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
    return `# ${topic}�ɂ��Ān�n�G���[���������܂���: ${error.message}`;
  }
}

// �u���O�ۑ��֐�
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

// LINE�ԐM�֐�
async function replyToLine(replyToken, message) {
  try {
    console.log('Sending LINE reply...');
    const cleanToken = LINE_CHANNEL_ACCESS_TOKEN?.replace(/�s+/g, '');

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

// ���C����Webhook�n���h���[
module.exports = async (req, res) => {
  console.log('Webhook received, method:', req.method);

  // CORS�Ή�
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
          // �u���O����
          const blogContent = await generateBlog(text);
          console.log('Blog generated successfully');

          // �ۑ�
          const fileName = await saveToStorage(blogContent, text);
          console.log('Saved:', fileName);

          // LINE �ɐ������b�Z�[�W��ԐM
          const successMessage = `? �u���O�L���̐������������܂����I

? �e�[�}: �u${text}�v
? �t�@�C����: ${fileName}
? ��������: ${new Date().toLocaleString('ja-JP')}

�V�����L������������܂����I`;

          await replyToLine(replyToken, successMessage);

        } catch (error) {
          console.error('Blog generation error:', error);
          await replyToLine(replyToken, `? �G���[���������܂���: ${error.message}`);
        }
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(200).json({ success: true, error: error.message });
  }
};