#!/usr/bin/env node

/**
 * API 接口扫描和测试生成脚本
 * 
 * 使用方法:
 *   node scan-api-and-generate-tests.js              # 扫描并显示新增接口
 *   node scan-api-and-generate-tests.js --generate  # 生成测试代码
 *   node scan-api-and-generate-tests.js --update    # 自动更新测试文件
 * 
 * 功能:
 *   1. 扫描所有 Controller 文件提取接口定义
 *   2. 对比现有测试脚本，找出未覆盖的接口
 *   3. 生成测试代码模板
 *   4. 可选：自动追加到测试文件
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 配置
const CONFIG = {
  // Controller 文件路径
  CONTROLLER_PATH: path.join(__dirname, '..', 'apps', 'api', 'src', 'main', 'java', 'com', 'example', 'api', '**', '*Controller.java'),
  // 现有测试脚本路径
  TEST_FILE: path.join(__dirname, 'api-test-complete.js'),
  // 生成的测试模板输出路径
  OUTPUT_FILE: path.join(__dirname, 'generated-tests.js'),
  // 基础 URL
  BASE_URL: process.env.API_BASE_URL || 'http://localhost:8080'
};

// 存储解析的接口信息
const apiEndpoints = [];

// ==================== Java 文件解析 ====================

/**
 * 解析 Controller 文件提取接口信息
 */
function parseControllerFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const endpoints = [];
  
  // 提取类级别的 RequestMapping
  const classMappingMatch = content.match(/@RequestMapping\s*\(\s*["']([^"']+)["']\s*\)/);
  const basePath = classMappingMatch ? classMappingMatch[1] : '';
  
  // 提取类名
  const classNameMatch = content.match(/class\s+(\w+)Controller/);
  const className = classNameMatch ? classNameMatch[1] : 'Unknown';
  
  // 提取方法级别的映射
  const methodPatterns = [
    { pattern: /@GetMapping\s*\(\s*["']([^"']*)["']\s*\)/g, method: 'GET' },
    { pattern: /@GetMapping/g, method: 'GET', emptyPath: true },
    { pattern: /@PostMapping\s*\(\s*["']([^"']*)["']\s*\)/g, method: 'POST' },
    { pattern: /@PostMapping/g, method: 'POST', emptyPath: true },
    { pattern: /@PutMapping\s*\(\s*["']([^"']*)["']\s*\)/g, method: 'PUT' },
    { pattern: /@PutMapping/g, method: 'PUT', emptyPath: true },
    { pattern: /@DeleteMapping\s*\(\s*["']([^"']*)["']\s*\)/g, method: 'DELETE' },
    { pattern: /@DeleteMapping/g, method: 'DELETE', emptyPath: true },
    { pattern: /@PatchMapping\s*\(\s*["']([^"']*)["']\s*\)/g, method: 'PATCH' },
    { pattern: /@PatchMapping/g, method: 'PATCH', emptyPath: true }
  ];
  
  // 按行解析，获取方法名和参数
  const lines = content.split('\n');
  let currentMethod = null;
  let currentPath = '';
  let currentAnnotations = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 检查是否是注解行
    for (const { pattern, method, emptyPath } of methodPatterns) {
      const regex = new RegExp(pattern.source);
      const match = line.match(regex);
      
      if (match) {
        currentMethod = method;
        currentPath = emptyPath ? '' : (match[1] || '');
        currentAnnotations = [line.trim()];
        break;
      }
    }
    
    // 检查是否是方法定义行
    const methodDefMatch = line.match(/public\s+(?:ResponseEntity<[^>]+>|\w+)\s+(\w+)\s*\(/);
    if (methodDefMatch && currentMethod) {
      const methodName = methodDefMatch[1];
      
      // 提取参数信息
      const paramSection = content.substring(content.indexOf(line));
      const paramMatch = paramSection.match(/\(([^)]*)\)/);
      const params = paramMatch ? parseParameters(paramMatch[1]) : [];
      
      // 检查是否需要认证
      const requiresAuth = checkRequiresAuth(content, i, params);
      
      // 构建完整路径
      const fullPath = buildFullPath(basePath, currentPath);
      
      endpoints.push({
        className,
        method: currentMethod,
        path: fullPath,
        originalPath: currentPath,
        methodName,
        params,
        requiresAuth,
        lineNumber: i + 1,
        filePath
      });
      
      currentMethod = null;
      currentPath = '';
    }
  }
  
  return endpoints;
}

/**
 * 解析方法参数
 */
function parseParameters(paramString) {
  const params = [];
  if (!paramString) return params;
  
  const paramRegex = /(?:@(\w+)\s+)?(\w+)\s+(\w+)/g;
  let match;
  
  while ((match = paramRegex.exec(paramString)) !== null) {
    params.push({
      annotation: match[1] || null,
      type: match[2],
      name: match[3]
    });
  }
  
  return params;
}

/**
 * 检查接口是否需要认证
 */
function checkRequiresAuth(content, lineIndex, params) {
  // 检查是否有 @AuthenticationPrincipal 参数
  const hasAuthParam = params.some(p => 
    p.annotation === 'AuthenticationPrincipal' || 
    p.type.includes('UserDetails') ||
    p.type.includes('User')
  );
  
  // 检查方法前是否有安全注解
  const linesBefore = content.split('\n').slice(Math.max(0, lineIndex - 10), lineIndex);
  const hasSecurityAnnotation = linesBefore.some(line => 
    line.includes('@PreAuthorize') || 
    line.includes('@Secured') ||
    line.includes('@RolesAllowed')
  );
  
  return hasAuthParam || hasSecurityAnnotation;
}

/**
 * 构建完整路径
 */
function buildFullPath(basePath, methodPath) {
  // 处理路径变量
  let fullPath = basePath;
  if (methodPath) {
    fullPath = basePath + methodPath;
  }
  
  // 确保路径格式正确
  fullPath = fullPath.replace(/\/+/g, '/');
  
  return fullPath;
}

// ==================== 测试代码生成 ====================

/**
 * 生成测试代码
 */
function generateTestCode(endpoint) {
  const { method, path, methodName, requiresAuth, params } = endpoint;
  
  // 生成测试描述
  const testDescription = `${method} ${path} 应该正常工作`;
  
  // 生成路径变量替换
  let testPath = path;
  const pathVars = path.match(/\{(\w+)\}/g) || [];
  const pathVarValues = {};
  
  pathVars.forEach((varMatch, index) => {
    const varName = varMatch.replace(/[{}]/g, '');
    if (varName.toLowerCase().includes('id')) {
      testPath = testPath.replace(varMatch, '${testId}');
      pathVarValues[varName] = 'testId';
    } else if (varName.toLowerCase().includes('slug')) {
      testPath = testPath.replace(varMatch, '${testSlug}');
      pathVarValues[varName] = 'testSlug';
    } else {
      testPath = testPath.replace(varMatch, '${test' + index + '}');
      pathVarValues[varName] = 'test' + index;
    }
  });
  
  // 生成请求体
  let requestBody = null;
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    requestBody = generateRequestBody(params);
  }
  
  // 生成断言
  const expectedStatus = method === 'POST' ? 201 : 200;
  
  // 生成测试代码
  let code = `    await this.test('${testDescription}', async () => {`;
  
  // 添加依赖说明注释
  code += generateDependencyNotes(endpoint);
  code += generatePathVarInstructions(endpoint);
  
  code += `\n`;
  
  // 如果需要认证，添加 token
  const tokenParam = requiresAuth ? ', { token: authToken }' : '';
  
  // 添加 skip 条件（如果需要认证）
  const skipCondition = requiresAuth ? 
    `, { skip: !this.runner.globalState.authToken, skipReason: '需要认证令牌' }` : '';
  
  if (requestBody) {
    code += `      const res = await this.httpClient.request('${path}', {\n`;
    code += `        method: '${method}',\n`;
    if (requiresAuth) {
      code += `        token: this.runner.globalState.authToken,\n`;
    }
    code += `        body: ${JSON.stringify(requestBody, null, 10).replace(/\n/g, '\n        ')}\n`;
    code += `      });\n`;
  } else {
    if (requiresAuth) {
      code += `      const res = await this.httpClient.request('${path}', {\n`;
      code += `        token: this.runner.globalState.authToken\n`;
      code += `      });\n`;
    } else {
      code += `      const res = await this.httpClient.request('${path}');\n`;
    }
  }
  
  code += `      this.assert.statusIn(res, [${expectedStatus}, 200]);\n`;
  code += `    }${skipCondition});\n`;
  
  return code;
}

/**
 * 生成请求体示例
 */
function generateRequestBody(params) {
  const body = {};
  
  // 根据参数名推测字段类型
  const commonFields = {
    'title': '测试标题',
    'name': '测试名称',
    'content': '测试内容...',
    'description': '测试描述',
    'slug': 'test-slug-' + Date.now(),
    'email': 'test@example.com',
    'username': 'testuser',
    'password': 'Test123456'
  };
  
  params.forEach(param => {
    if (param.annotation === 'RequestBody') {
      // 这里简化处理，实际应该解析 DTO 类
      return commonFields;
    }
    
    const fieldName = param.name.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (commonFields[fieldName]) {
      body[fieldName] = commonFields[fieldName];
    } else if (fieldName.includes('id')) {
      body[fieldName] = 1;
    } else if (fieldName.includes('status')) {
      body[fieldName] = 'ACTIVE';
    } else {
      body[fieldName] = 'test';
    }
  });
  
  return body;
}

/**
 * 生成测试代码中的路径变量替换说明
 */
function generatePathVarInstructions(endpoint) {
  const pathVars = endpoint.path.match(/\{(\w+)\}/g) || [];
  if (pathVars.length === 0) return '';
  
  let instructions = '\n    // 路径变量说明:\n';
  pathVars.forEach(varMatch => {
    const varName = varMatch.replace(/[{}]/g, '');
    if (varName.toLowerCase().includes('id')) {
      instructions += `    // - {${varName}}: 需要替换为实际的ID，例如: this.context.${varName} 或 this.runner.globalState.${varName}\n`;
    } else if (varName.toLowerCase().includes('slug')) {
      instructions += `    // - {${varName}}: 需要替换为实际的slug，例如: this.context.${varName}\n`;
    } else {
      instructions += `    // - {${varName}}: 需要替换为实际的${varName}值\n`;
    }
  });
  return instructions;
}

/**
 * 生成依赖说明注释
 */
function generateDependencyNotes(endpoint) {
  let notes = [];
  
  if (endpoint.requiresAuth) {
    notes.push('// 依赖: 需要认证令牌 (authToken)');
    notes.push('//   从 this.runner.globalState.authToken 获取，或在前置测试中设置');
  }
  
  const pathVars = endpoint.path.match(/\{(\w+)\}/g) || [];
  if (pathVars.length > 0) {
    notes.push('// 依赖: 路径变量需要提前准备');
    pathVars.forEach(varMatch => {
      const varName = varMatch.replace(/[{}]/g, '');
      notes.push(`//   - ${varName}: 在 beforeAll 或前置测试中创建并保存到 this.context.${varName}`);
    });
  }
  
  if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
    notes.push('// 依赖: 请求体字段可能需要根据实际 DTO 调整');
  }
  
  return notes.length > 0 ? '\n    ' + notes.join('\n    ') + '\n' : '';
}

/**
 * 生成完整的测试套件代码
 */
function generateTestSuite(className, endpoints) {
  let code = `// ============================================\n`;
  code += `// ${className} 接口测试 - 自动生成\n`;
  code += `// ============================================\n`;
  code += `// 使用说明:\n`;
  code += `// 1. 将此代码复制到 api-test-complete.js 文件中\n`;
  code += `// 2. 确保已导入 TestSuite: const { TestSuite, assert } = require('./test-utils');\n`;
  code += `// 3. 检查所有 "依赖" 注释，确保前置条件已满足\n`;
  code += `// 4. 根据实际情况调整路径变量和请求体\n`;
  code += `// 5. 将此套件添加到 runner: runner.addSuite(new ${className}Tests('${className} 接口'))\n`;
  code += `// ============================================\n\n`;
  code += `class ${className}Tests extends TestSuite {\n`;
  code += `  async runTests() {\n`;
  
  endpoints.forEach(endpoint => {
    code += generateTestCode(endpoint);
    code += '\n';
  });
  
  code += `  }\n`;
  code += `}\n`;
  code += `\nmodule.exports = { ${className}Tests };\n`;
  
  return code;
}

// ==================== 主逻辑 ====================

/**
 * 扫描所有 Controller
 */
function scanAllControllers() {
  console.log('🔍 扫描 Controller 文件...\n');
  
  const files = glob.sync(CONFIG.CONTROLLER_PATH);
  console.log(`找到 ${files.length} 个 Controller 文件\n`);
  
  files.forEach(file => {
    const endpoints = parseControllerFile(file);
    apiEndpoints.push(...endpoints);
  });
  
  // 按类名分组
  const grouped = {};
  apiEndpoints.forEach(ep => {
    if (!grouped[ep.className]) {
      grouped[ep.className] = [];
    }
    grouped[ep.className].push(ep);
  });
  
  return grouped;
}

/**
 * 检查现有测试覆盖情况
 */
function checkTestCoverage() {
  if (!fs.existsSync(CONFIG.TEST_FILE)) {
    console.log('⚠️  未找到现有测试文件');
    return { covered: [], uncovered: apiEndpoints };
  }
  
  const testContent = fs.readFileSync(CONFIG.TEST_FILE, 'utf-8');
  
  const uncovered = apiEndpoints.filter(endpoint => {
    // 检查测试文件中是否包含该路径
    const pathPattern = endpoint.path.replace(/\{\w+\}/g, '\\{\\w+\\}');
    const regex = new RegExp(pathPattern);
    return !regex.test(testContent);
  });
  
  const covered = apiEndpoints.filter(endpoint => {
    const pathPattern = endpoint.path.replace(/\{\w+\}/g, '\\{\\w+\\}');
    const regex = new RegExp(pathPattern);
    return regex.test(testContent);
  });
  
  return { covered, uncovered };
}

/**
 * 生成 AI 提示信息
 */
function generateAIPrompt(uncoveredEndpoints) {
  let prompt = `## 新接口需要添加测试\n\n`;
  prompt += `检测到 ${uncoveredEndpoints.length} 个接口尚未被自动化测试覆盖。\n\n`;
  prompt += `请在 \`api-test-complete.js\` 中添加以下测试：\n\n`;
  
  // 按类分组
  const grouped = {};
  uncoveredEndpoints.forEach(ep => {
    if (!grouped[ep.className]) {
      grouped[ep.className] = [];
    }
    grouped[ep.className].push(ep);
  });
  
  for (const [className, endpoints] of Object.entries(grouped)) {
    prompt += `### ${className}Controller\n\n`;
    endpoints.forEach(ep => {
      prompt += `- \`${ep.method} ${ep.path}\` - ${ep.methodName}()\n`;
      if (ep.requiresAuth) {
        prompt += `  - 需要认证 ⚠️\n`;
      }
    });
    prompt += '\n';
  }
  
  prompt += `\n## 如何添加测试\n\n`;
  prompt += `1. 在对应的 TestSuite 类中添加测试方法\n`;
  prompt += `2. 参考已有测试的写法\n`;
  prompt += `3. 运行 \`node api-test-complete.js\` 验证\n`;
  
  return prompt;
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const shouldGenerate = args.includes('--generate');
  const shouldUpdate = args.includes('--update');
  
  console.log('🚀 API 接口扫描工具\n');
  console.log('='.repeat(60));
  
  // 1. 扫描所有接口
  const groupedEndpoints = scanAllControllers();
  
  console.log(`📊 共发现 ${apiEndpoints.length} 个接口\n`);
  
  // 2. 检查测试覆盖
  const { covered, uncovered } = checkTestCoverage();
  
  console.log('✅ 已覆盖接口:', covered.length);
  console.log('❌ 未覆盖接口:', uncovered.length);
  console.log('');
  
  // 3. 显示未覆盖接口
  if (uncovered.length > 0) {
    console.log('🔴 未覆盖的接口:\n');
    
    const grouped = {};
    uncovered.forEach(ep => {
      if (!grouped[ep.className]) {
        grouped[ep.className] = [];
      }
      grouped[ep.className].push(ep);
    });
    
    for (const [className, endpoints] of Object.entries(grouped)) {
      console.log(`${className}Controller:`);
      endpoints.forEach(ep => {
        const authMark = ep.requiresAuth ? ' 🔒' : '';
        console.log(`  ${ep.method.padEnd(6)} ${ep.path}${authMark}`);
      });
      console.log('');
    }
    
    // 4. 生成 AI 提示
    const aiPrompt = generateAIPrompt(uncovered);
    
    // 保存到文件
    const promptPath = path.join(__dirname, 'AI_PROMPT.md');
    fs.writeFileSync(promptPath, aiPrompt);
    console.log(`📝 AI 提示已保存到: ${promptPath}\n`);
    
    // 5. 生成测试代码
    if (shouldGenerate || shouldUpdate) {
      let generatedCode = '// 自动生成的测试代码\n';
      generatedCode += '// 复制到 api-test-complete.js 中使用\n\n';
      
      for (const [className, endpoints] of Object.entries(grouped)) {
        generatedCode += generateTestSuite(className, endpoints);
        generatedCode += '\n\n';
      }
      
      fs.writeFileSync(CONFIG.OUTPUT_FILE, generatedCode);
      console.log(`✅ 测试代码已生成: ${CONFIG.OUTPUT_FILE}\n`);
    }
    
    // 6. 自动更新测试文件
    if (shouldUpdate) {
      console.log('⚠️  自动更新功能需要谨慎使用，建议先审查生成的代码');
      console.log('请查看 generated-tests.js，确认无误后手动合并到 api-test-complete.js\n');
    }
  } else {
    console.log('🎉 所有接口都已被测试覆盖！\n');
  }
  
  console.log('='.repeat(60));
  console.log('\n💡 提示:');
  console.log('   运行 node scan-api-and-generate-tests.js --generate');
  console.log('   生成测试代码模板\n');
}

main().catch(console.error);
