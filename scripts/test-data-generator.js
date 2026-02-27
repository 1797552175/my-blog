/**
 * 测试数据生成脚本
 * 用于生成测试所需的初始数据
 * 
 * 使用方法:
 *   node test-data-generator.js
 * 
 * 环境变量:
 *   API_BASE_URL - API 基础 URL (默认: http://localhost:8080)
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const CONFIG = {
  BASE_URL: process.env.API_BASE_URL || 'http://localhost:8080',
  TIMEOUT: 30000,
  TEST_USER: {
    username: 'test_author',
    email: 'test_author@example.com',
    password: 'Test123456'
  }
};

// 存储生成的数据
const generatedData = {
  users: [],
  stories: [],
  storySeeds: [],
  chapters: [],
  wikiPages: [],
  wikiCharacters: [],
  wikiTimeline: [],
  inspirations: [],
  posts: []
};

// 工具函数：延迟
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 工具函数：HTTP 请求
function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, CONFIG.BASE_URL);
    const client = url.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      },
      timeout: CONFIG.TIMEOUT
    };

    if (options.token) {
      requestOptions.headers['Authorization'] = `Bearer ${options.token}`;
    }

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const body = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, body, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

// 生成测试用户
async function generateTestUser() {
  console.log('👤 生成测试用户...');
  
  try {
    // 尝试注册
    const registerRes = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: {
        username: CONFIG.TEST_USER.username,
        email: CONFIG.TEST_USER.email,
        password: CONFIG.TEST_USER.password
      }
    });

    if (registerRes.status === 201 || registerRes.status === 200) {
      console.log('  ✅ 测试用户注册成功');
    } else if (registerRes.status === 409) {
      console.log('  ℹ️  测试用户已存在');
    } else {
      console.log('  ⚠️  注册失败:', registerRes.status);
    }

    // 登录获取 token
    const loginRes = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        username: CONFIG.TEST_USER.username,
        password: CONFIG.TEST_USER.password
      }
    });

    if (loginRes.status === 200 && loginRes.body.token) {
      console.log('  ✅ 登录成功，获取到 token');
      generatedData.users.push({
        ...CONFIG.TEST_USER,
        token: loginRes.body.token,
        userId: loginRes.body.id || loginRes.body.userId
      });
      return loginRes.body.token;
    } else {
      throw new Error('登录失败: ' + JSON.stringify(loginRes.body));
    }
  } catch (error) {
    console.error('  ❌ 生成测试用户失败:', error.message);
    throw error;
  }
}

// 生成测试小说
async function generateTestStories(token) {
  console.log('📚 生成测试小说...');
  
  const stories = [
    {
      title: '测试小说 - 玄幻修仙',
      slug: 'test-xuanhuan-xiuxian',
      description: '这是一个测试用的玄幻小说，用于自动化测试',
      content: '第一章：初入修仙界\n\n在一个遥远的世界...',
      tags: ['玄幻', '修仙', '测试'],
      status: 'ONGOING',
      isInteractive: true
    },
    {
      title: '测试小说 - 都市异能',
      slug: 'test-dushi-yineng',
      description: '这是一个测试用的都市异能小说',
      content: '第一章：觉醒\n\n平凡的一天...',
      tags: ['都市', '异能', '测试'],
      status: 'COMPLETED',
      isInteractive: false
    },
    {
      title: '测试小说 - 科幻未来',
      slug: 'test-kehuan-weilai',
      description: '这是一个测试用的科幻小说',
      content: '第一章：星际旅行\n\n公元3000年...',
      tags: ['科幻', '未来', '测试'],
      status: 'ONGOING',
      isInteractive: true
    }
  ];

  for (const story of stories) {
    try {
      const res = await makeRequest('/api/stories', {
        method: 'POST',
        token,
        body: story
      });

      if (res.status === 201 || res.status === 200) {
        console.log(`  ✅ 创建小说: ${story.title}`);
        generatedData.stories.push({ ...story, id: res.body.id });
      } else {
        console.log(`  ⚠️  创建小说失败 ${story.title}:`, res.status);
      }
    } catch (error) {
      console.error(`  ❌ 创建小说失败 ${story.title}:`, error.message);
    }
  }
}

// 生成测试章节
async function generateTestChapters(token) {
  console.log('📖 生成测试章节...');
  
  if (generatedData.stories.length === 0) {
    console.log('  ⚠️  没有可用的小说，跳过章节生成');
    return;
  }

  const storyId = generatedData.stories[0].id;
  const chapters = [
    {
      title: '第一章：开篇',
      content: '这是第一章的内容...',
      chapterNumber: 1
    },
    {
      title: '第二章：发展',
      content: '这是第二章的内容...',
      chapterNumber: 2
    },
    {
      title: '第三章：高潮',
      content: '这是第三章的内容...',
      chapterNumber: 3
    }
  ];

  for (const chapter of chapters) {
    try {
      const res = await makeRequest(`/api/stories/${storyId}/chapters`, {
        method: 'POST',
        token,
        body: chapter
      });

      if (res.status === 201 || res.status === 200) {
        console.log(`  ✅ 创建章节: ${chapter.title}`);
        generatedData.chapters.push({ ...chapter, id: res.body.id, storyId });
      } else {
        console.log(`  ⚠️  创建章节失败 ${chapter.title}:`, res.status);
      }
    } catch (error) {
      console.error(`  ❌ 创建章节失败 ${chapter.title}:`, error.message);
    }
  }
}

// 生成测试 Wiki 数据
async function generateTestWikiData(token) {
  console.log('📚 生成测试 Wiki 数据...');
  
  if (generatedData.stories.length === 0) {
    console.log('  ⚠️  没有可用的小说，跳过 Wiki 生成');
    return;
  }

  const storyId = generatedData.stories[0].id;

  // Wiki 页面
  const wikiPages = [
    { slug: 'world-setting', title: '世界观设定', content: '这是一个修仙世界...', category: 'SETTING' },
    { slug: 'magic-system', title: '修炼体系', content: '修炼分为九个境界...', category: 'SYSTEM' }
  ];

  for (const page of wikiPages) {
    try {
      const res = await makeRequest(`/api/stories/${storyId}/wiki/pages`, {
        method: 'POST',
        token,
        body: page
      });

      if (res.status === 201 || res.status === 200) {
        console.log(`  ✅ 创建 Wiki 页面: ${page.title}`);
        generatedData.wikiPages.push({ ...page, id: res.body.id, storyId });
      } else {
        console.log(`  ⚠️  创建 Wiki 页面失败 ${page.title}:`, res.status);
      }
    } catch (error) {
      console.error(`  ❌ 创建 Wiki 页面失败 ${page.title}:`, error.message);
    }
  }

  // Wiki 角色
  const wikiCharacters = [
    { name: '主角张三', description: '本书主角，天赋异禀', roleType: 'PROTAGONIST' },
    { name: '反派李四', description: '大反派，阴险狡诈', roleType: 'ANTAGONIST' }
  ];

  for (const character of wikiCharacters) {
    try {
      const res = await makeRequest(`/api/stories/${storyId}/wiki/characters`, {
        method: 'POST',
        token,
        body: character
      });

      if (res.status === 201 || res.status === 200) {
        console.log(`  ✅ 创建 Wiki 角色: ${character.name}`);
        generatedData.wikiCharacters.push({ ...character, id: res.body.id, storyId });
      } else {
        console.log(`  ⚠️  创建 Wiki 角色失败 ${character.name}:`, res.status);
      }
    } catch (error) {
      console.error(`  ❌ 创建 Wiki 角色失败 ${character.name}:`, error.message);
    }
  }

  // Wiki 时间线
  const timelineEvents = [
    { title: '故事开始', description: '主角出生', eventDate: '公元元年' },
    { title: '修炼开始', description: '主角开始修炼', eventDate: '公元十年' }
  ];

  for (const event of timelineEvents) {
    try {
      const res = await makeRequest(`/api/stories/${storyId}/wiki/timeline`, {
        method: 'POST',
        token,
        body: event
      });

      if (res.status === 201 || res.status === 200) {
        console.log(`  ✅ 创建时间线事件: ${event.title}`);
        generatedData.wikiTimeline.push({ ...event, id: res.body.id, storyId });
      } else {
        console.log(`  ⚠️  创建时间线事件失败 ${event.title}:`, res.status);
      }
    } catch (error) {
      console.error(`  ❌ 创建时间线事件失败 ${event.title}:`, error.message);
    }
  }
}

// 生成测试灵感
async function generateTestInspirations(token) {
  console.log('💡 生成测试灵感...');
  
  const inspirations = [
    {
      title: '修仙灵感1',
      content: '主角获得神秘宝物，开始修炼之路...'
    },
    {
      title: '都市灵感1',
      content: '主角意外觉醒异能，生活发生巨变...'
    }
  ];

  for (const inspiration of inspirations) {
    try {
      const res = await makeRequest('/api/inspirations', {
        method: 'POST',
        token,
        body: inspiration
      });

      if (res.status === 201 || res.status === 200) {
        console.log(`  ✅ 创建灵感: ${inspiration.title}`);
        generatedData.inspirations.push({ ...inspiration, id: res.body.id });
      } else {
        console.log(`  ⚠️  创建灵感失败 ${inspiration.title}:`, res.status);
      }
    } catch (error) {
      console.error(`  ❌ 创建灵感失败 ${inspiration.title}:`, error.message);
    }
  }
}

// 生成测试文章
async function generateTestPosts(token) {
  console.log('📝 生成测试文章...');
  
  const posts = [
    {
      title: '测试文章1',
      slug: 'test-post-1',
      content: '这是测试文章1的内容...',
      summary: '测试文章1摘要',
      tags: ['测试', '文章']
    },
    {
      title: '测试文章2',
      slug: 'test-post-2',
      content: '这是测试文章2的内容...',
      summary: '测试文章2摘要',
      tags: ['测试', '文章']
    }
  ];

  for (const post of posts) {
    try {
      const res = await makeRequest('/api/posts', {
        method: 'POST',
        token,
        body: post
      });

      if (res.status === 201 || res.status === 200) {
        console.log(`  ✅ 创建文章: ${post.title}`);
        generatedData.posts.push({ ...post, id: res.body.id });
      } else {
        console.log(`  ⚠️  创建文章失败 ${post.title}:`, res.status);
      }
    } catch (error) {
      console.error(`  ❌ 创建文章失败 ${post.title}:`, error.message);
    }
  }
}

// 主函数
async function main() {
  console.log('🚀 开始生成测试数据');
  console.log(`📍 API: ${CONFIG.BASE_URL}`);
  console.log('');

  try {
    // 1. 生成测试用户并获取 token
    const token = await generateTestUser();
    
    await sleep(500);

    // 2. 生成测试小说
    await generateTestStories(token);
    
    await sleep(500);

    // 3. 生成测试章节
    await generateTestChapters(token);
    
    await sleep(500);

    // 4. 生成测试 Wiki 数据
    await generateTestWikiData(token);
    
    await sleep(500);

    // 5. 生成测试灵感
    await generateTestInspirations(token);
    
    await sleep(500);

    // 6. 生成测试文章
    await generateTestPosts(token);

    console.log('');
    console.log('✅ 测试数据生成完成！');
    console.log('');
    console.log('📊 生成统计:');
    console.log(`  - 用户: ${generatedData.users.length}`);
    console.log(`  - 小说: ${generatedData.stories.length}`);
    console.log(`  - 章节: ${generatedData.chapters.length}`);
    console.log(`  - Wiki 页面: ${generatedData.wikiPages.length}`);
    console.log(`  - Wiki 角色: ${generatedData.wikiCharacters.length}`);
    console.log(`  - 时间线事件: ${generatedData.wikiTimeline.length}`);
    console.log(`  - 灵感: ${generatedData.inspirations.length}`);
    console.log(`  - 文章: ${generatedData.posts.length}`);
    console.log('');
    console.log('💡 提示: 运行 api-test.js 进行完整测试');

    // 保存生成的数据到文件
    const fs = require('fs');
    const path = require('path');
    const dataPath = path.join(__dirname, 'test-data.json');
    fs.writeFileSync(dataPath, JSON.stringify(generatedData, null, 2));
    console.log(`💾 测试数据已保存到: ${dataPath}`);

  } catch (error) {
    console.error('');
    console.error('❌ 生成测试数据失败:', error.message);
    process.exit(1);
  }
}

main();
