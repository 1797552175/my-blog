#!/usr/bin/env node

/**
 * API 测试公共工具模块
 * 提供统一的 HTTP 请求、断言、测试框架和报告生成功能
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

// ==================== 默认配置 ====================
const DEFAULT_CONFIG = {
  BASE_URL: process.env.API_BASE_URL || 'http://localhost:8080',
  TIMEOUT: 15000,
  RETRIES: 2,
  RETRY_DELAY: 1000,
  TEST_USER: {
    username: 'test_' + Date.now(),
    email: `test_${Date.now()}@example.com`,
    password: 'Test123456'
  },
  KNOWN_USER: {
    username: 'author',
    password: '123456'
  }
};

// ==================== HTTP 请求工具（带重试）====================
class HttpClient {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async request(path, options = {}) {
    const maxRetries = options.retries !== undefined ? options.retries : this.config.RETRIES;
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this._doRequest(path, options);
      } catch (error) {
        lastError = error;
        const shouldRetry = this._shouldRetry(error, attempt, maxRetries);
        if (!shouldRetry) break;
        
        const delay = this.config.RETRY_DELAY * Math.pow(2, attempt);
        console.log(`  ⏳ 请求失败，${delay}ms 后重试 (${attempt + 1}/${maxRetries}): ${error.message}`);
        await this._sleep(delay);
      }
    }

    throw lastError;
  }

  _shouldRetry(error, attempt, maxRetries) {
    if (attempt >= maxRetries) return false;
    
    // 超时错误、网络错误、5xx 服务器错误应该重试
    if (error.message.includes('timeout')) return true;
    if (error.message.includes('ECONNREFUSED')) return true;
    if (error.message.includes('ETIMEDOUT')) return true;
    if (error.code === 'ECONNRESET') return true;
    
    // HTTP 5xx 错误应该重试
    if (error.statusCode >= 500 && error.statusCode < 600) return true;
    
    return false;
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _doRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.config.BASE_URL);
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
        timeout: options.timeout || this.config.TIMEOUT
      };

      if (options.token) {
        requestOptions.headers['Authorization'] = `Bearer ${options.token}`;
      }

      const req = client.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : null;
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: parsed,
              raw: data
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: null,
              raw: data
            });
          }
        });
      });

      req.on('error', (err) => {
        err.statusCode = 0;
        reject(err);
      });
      
      req.on('timeout', () => {
        req.destroy();
        const err = new Error('Request timeout');
        err.statusCode = 0;
        reject(err);
      });

      if (options.body) {
        req.write(JSON.stringify(options.body));
      }
      req.end();
    });
  }
}

// ==================== 断言工具 ====================
const assert = {
  equal(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  },

  notEqual(actual, expected, message) {
    if (actual === expected) {
      throw new Error(message || `Expected not ${expected}`);
    }
  },

  ok(value, message) {
    if (!value) {
      throw new Error(message || `Expected truthy value, got ${value}`);
    }
  },

  statusOk(response, expectedStatus = 200) {
    if (response.status !== expectedStatus) {
      throw new Error(
        `Expected status ${expectedStatus}, got ${response.status}\n` +
        `Response: ${response.raw?.substring(0, 200) || JSON.stringify(response.body)}`
      );
    }
  },

  statusIn(response, statuses, message) {
    if (!statuses.includes(response.status)) {
      throw new Error(
        message || `Expected status in [${statuses.join(', ')}], got ${response.status}`
      );
    }
  },

  hasField(obj, field, message) {
    if (!obj || !(field in obj)) {
      throw new Error(message || `Expected object to have field '${field}'`);
    }
  },

  isArray(value, message) {
    if (!Array.isArray(value)) {
      throw new Error(message || `Expected array, got ${typeof value}`);
    }
  },

  notNull(value, message) {
    if (value === null || value === undefined) {
      throw new Error(message || 'Expected non-null value');
    }
  },

  match(value, regex, message) {
    if (!regex.test(value)) {
      throw new Error(message || `Expected ${value} to match ${regex}`);
    }
  }
};

// ==================== 测试结果存储 ====================
class TestResults {
  constructor() {
    this.reset();
  }

  reset() {
    this.total = 0;
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
    this.tests = [];
    this.startTime = null;
    this.endTime = null;
  }

  addTest(testInfo) {
    this.tests.push(testInfo);
    this.total++;
    if (testInfo.status === 'passed') this.passed++;
    else if (testInfo.status === 'failed') this.failed++;
    else if (testInfo.status === 'skipped') this.skipped++;
  }

  get duration() {
    return this.endTime - this.startTime;
  }

  get passRate() {
    return this.total > 0 ? ((this.passed / this.total) * 100).toFixed(1) : '0.0';
  }

  get hasTests() {
    return this.total > 0;
  }
}

// ==================== 测试套件基类 ====================
class TestSuite {
  constructor(name, options = {}) {
    this.name = name;
    this.options = options;
    this.context = {}; // 每个套件独立的上下文
  }

  async test(description, testFn, options = {}) {
    const testInfo = {
      suite: this.name,
      description,
      status: 'running',
      error: null,
      duration: 0,
      skipReason: null
    };

    // 检查是否需要跳过
    if (options.skip) {
      testInfo.status = 'skipped';
      testInfo.skipReason = options.skipReason || '条件不满足';
      console.log(`  ⏭️  ${description} (skipped: ${testInfo.skipReason})`);
      return testInfo;
    }

    const start = Date.now();
    try {
      await testFn();
      testInfo.status = 'passed';
      testInfo.duration = Date.now() - start;
      console.log(`  ✅ ${description} (${testInfo.duration}ms)`);
    } catch (error) {
      testInfo.status = 'failed';
      testInfo.error = error.message;
      testInfo.duration = Date.now() - start;
      console.log(`  ❌ ${description}`);
      console.log(`     Error: ${error.message}`);
    }

    return testInfo;
  }

  async beforeAll() {
    // 子类可重写
  }

  async afterAll() {
    // 子类可重写
  }

  async runTests() {
    // 子类必须实现
    throw new Error('TestSuite must implement runTests()');
  }

  async run(testResults) {
    console.log(`\n📦 ${this.name}`);
    
    try {
      await this.beforeAll();
    } catch (error) {
      console.log(`  ❌ beforeAll 失败: ${error.message}`);
      // 标记整个套件失败
      const failedTest = {
        suite: this.name,
        description: 'beforeAll 前置条件',
        status: 'failed',
        error: error.message,
        duration: 0
      };
      testResults.addTest(failedTest);
      return;
    }

    try {
      await this.runTests();
    } catch (error) {
      console.error(`Suite ${this.name} error:`, error.message);
    }

    try {
      await this.afterAll();
    } catch (error) {
      console.log(`  ⚠️  afterAll 失败: ${error.message}`);
    }
  }
}

// ==================== 报告生成器 ====================
class ReportGenerator {
  constructor(testResults, config) {
    this.results = testResults;
    this.config = config;
  }

  generateConsoleReport() {
    const { total, passed, failed, skipped, duration, passRate } = this.results;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试报告');
    console.log('='.repeat(60));
    console.log(`总测试数: ${total}`);
    console.log(`✅ 通过: ${passed}`);
    console.log(`❌ 失败: ${failed}`);
    console.log(`⏭️  跳过: ${skipped}`);
    console.log(`⏱️  总耗时: ${duration}ms`);
    console.log(`📈 通过率: ${passRate}%`);
    console.log('='.repeat(60));

    if (failed > 0) {
      console.log('\n❌ 失败的测试:');
      this.results.tests
        .filter(t => t.status === 'failed')
        .forEach(t => {
          console.log(`\n  [${t.suite}] ${t.description}`);
          console.log(`   Error: ${t.error}`);
        });
    }
  }

  generateAIReport() {
    const { total, passed, failed, skipped, duration, passRate, tests } = this.results;
    
    const aiReport = {
      summary: {
        total,
        passed,
        failed,
        skipped,
        duration: `${duration}ms`,
        passRate: `${passRate}%`
      },
      failedTests: tests
        .filter(t => t.status === 'failed')
        .map(t => ({
          suite: t.suite,
          test: t.description,
          error: t.error
        })),
      skippedTests: tests
        .filter(t => t.status === 'skipped')
        .map(t => ({
          suite: t.suite,
          test: t.description,
          reason: t.skipReason
        })),
      timestamp: new Date().toISOString(),
      baseUrl: this.config.BASE_URL
    };

    console.log('\n' + '='.repeat(60));
    console.log('🤖 AI 友好报告 (可复制给 AI 分析)');
    console.log('='.repeat(60));
    console.log(JSON.stringify(aiReport, null, 2));

    return aiReport;
  }

  generateMarkdownReport() {
    const { total, passed, failed, skipped, duration, passRate, tests } = this.results;
    const timestamp = new Date().toISOString();
    
    let md = `# API 测试报告\n\n`;
    md += `**测试时间:** ${timestamp}\n\n`;
    md += `**基础 URL:** ${this.config.BASE_URL}\n\n`;
    md += `## 摘要\n\n`;
    md += `- **总测试数:** ${total}\n`;
    md += `- **✅ 通过:** ${passed}\n`;
    md += `- **❌ 失败:** ${failed}\n`;
    md += `- **⏭️ 跳过:** ${skipped}\n`;
    md += `- **通过率:** ${passRate}%\n`;
    md += `- **总耗时:** ${duration}ms\n\n`;

    if (failed > 0) {
      md += `## ❌ 失败的测试\n\n`;
      tests
        .filter(t => t.status === 'failed')
        .forEach(t => {
          md += `### [${t.suite}] ${t.description}\n\n`;
          md += `**错误:** ${t.error}\n\n`;
          md += `**耗时:** ${t.duration}ms\n\n`;
          md += `---\n\n`;
        });
    }

    if (skipped > 0) {
      md += `## ⏭️ 跳过的测试\n\n`;
      tests
        .filter(t => t.status === 'skipped')
        .forEach(t => {
          md += `- **[${t.suite}]** ${t.description} (${t.skipReason})\n`;
        });
      md += `\n`;
    }

    md += `## 详细结果\n\n`;
    md += `| 套件 | 测试 | 状态 | 耗时 |\n`;
    md += `|------|------|------|------|\n`;
    
    tests.forEach(t => {
      const status = t.status === 'passed' ? '✅ 通过' : t.status === 'failed' ? '❌ 失败' : '⏭️ 跳过';
      md += `| ${t.suite} | ${t.description} | ${status} | ${t.duration}ms |\n`;
    });

    return md;
  }

  generateJUnitReport() {
    const { total, passed, failed, skipped, duration, tests } = this.results;
    const timestamp = new Date().toISOString();
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<testsuites name="API Tests" tests="${total}" failures="${failed}" skipped="${skipped}" time="${duration / 1000}" timestamp="${timestamp}">\n`;
    
    // 按套件分组
    const suites = {};
    tests.forEach(t => {
      if (!suites[t.suite]) suites[t.suite] = [];
      suites[t.suite].push(t);
    });

    Object.entries(suites).forEach(([suiteName, suiteTests]) => {
      const suiteFailures = suiteTests.filter(t => t.status === 'failed').length;
      const suiteSkipped = suiteTests.filter(t => t.status === 'skipped').length;
      const suiteTime = suiteTests.reduce((sum, t) => sum + t.duration, 0) / 1000;
      
      xml += `  <testsuite name="${this._escapeXml(suiteName)}" tests="${suiteTests.length}" failures="${suiteFailures}" skipped="${suiteSkipped}" time="${suiteTime}">\n`;
      
      suiteTests.forEach(t => {
        xml += `    <testcase name="${this._escapeXml(t.description)}" time="${t.duration / 1000}">\n`;
        
        if (t.status === 'failed') {
          xml += `      <failure message="${this._escapeXml(t.error)}">${this._escapeXml(t.error)}</failure>\n`;
        } else if (t.status === 'skipped') {
          xml += `      <skipped message="${this._escapeXml(t.skipReason || '')}"/>\n`;
        }
        
        xml += `    </testcase>\n`;
      });
      
      xml += `  </testsuite>\n`;
    });

    xml += `</testsuites>\n`;
    return xml;
  }

  _escapeXml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

// ==================== 测试运行器 ====================
class TestRunner {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.httpClient = new HttpClient(this.config);
    this.results = new TestResults();
    this.suites = [];
    
    // 全局状态（建议尽量少用，优先使用 suite.context）
    this.globalState = {
      authToken: null,
      testUserId: null
    };
  }

  addSuite(suite) {
    this.suites.push(suite);
    suite.httpClient = this.httpClient;
    suite.assert = assert;
    suite.runner = this;
    return this;
  }

  async checkHealth() {
    try {
      const res = await this.httpClient.request('/api/health', { retries: 0, timeout: 5000 });
      if (res.status === 200 && res.body && res.body.status === 'ok') {
        return { ok: true, message: 'API 服务运行正常' };
      }
      return { ok: false, message: `健康检查返回异常状态: ${res.status}` };
    } catch (error) {
      return { ok: false, message: `无法连接到 API 服务: ${error.message}` };
    }
  }

  async run(options = {}) {
    const { 
      ci = false, 
      report = false, 
      reportPath = null,
      junitPath = null,
      seed = false,
      skipHealthCheck = false
    } = options;

    console.log('🚀 开始 API 自动化测试');
    console.log(`📍 Base URL: ${this.config.BASE_URL}`);
    console.log('');

    // 健康检查
    if (!skipHealthCheck) {
      const health = await this.checkHealth();
      if (!health.ok) {
        console.log('❌ 健康检查失败');
        console.log(`   ${health.message}`);
        console.log('');
        console.log('💡 请确保 API 服务已启动:');
        console.log('   cd apps/api && ../../gradlew bootRun --args="--spring.profiles.active=h2"');
        console.log('');
        console.log('   或使用 --skip-health-check 跳过健康检查');
        process.exit(1);
      }
      console.log(`✅ ${health.message}`);
      console.log('');
    }

    // 如果需要，先运行数据生成
    if (seed) {
      console.log('🌱 运行测试数据生成...');
      try {
        require('./test-data-generator.js');
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (e) {
        console.log('⚠️  数据生成跳过:', e.message);
      }
      console.log('');
    }

    this.results.startTime = Date.now();

    for (const suite of this.suites) {
      // 包装测试方法，使测试结果能自动记录
      const originalTest = suite.test.bind(suite);
      suite.test = async (description, testFn, options = {}) => {
        const testInfo = await originalTest(description, testFn, options);
        this.results.addTest(testInfo);
        return testInfo;
      };

      await suite.run(this.results);
    }

    this.results.endTime = Date.now();

    // 生成报告
    const reportGen = new ReportGenerator(this.results, this.config);
    reportGen.generateConsoleReport();
    reportGen.generateAIReport();

    // 保存 Markdown 报告
    if (report || reportPath) {
      const reportDir = path.join(__dirname, '..', 'test-reports');
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }
      
      const finalReportPath = reportPath || path.join(reportDir, `api-test-report-${Date.now()}.md`);
      fs.writeFileSync(finalReportPath, reportGen.generateMarkdownReport());
      console.log(`\n📝 Markdown 报告已保存: ${finalReportPath}`);
    }

    // 保存 JUnit XML 报告
    if (junitPath) {
      const reportDir = path.dirname(junitPath);
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }
      fs.writeFileSync(junitPath, reportGen.generateJUnitReport());
      console.log(`\n📝 JUnit 报告已保存: ${junitPath}`);
    }

    // CI 模式退出码
    if (ci && this.results.failed > 0) {
      process.exit(1);
    }

    return this.results;
  }
}

// ==================== 导出 ====================
module.exports = {
  HttpClient,
  TestSuite,
  TestRunner,
  TestResults,
  ReportGenerator,
  assert,
  DEFAULT_CONFIG
};
