# Uber Eats Integration Admin Dashboard

Web管理后台，用于整合Uber Eats与POS系统。

## 功能

### 1. 店铺管理 (`/shops`)
- 显示用户所有的POS店铺
- 显示每个店铺的Uber连接状态
- 一键连接/断开Uber账号
- 快速访问菜单同步功能

### 2. Uber OAuth集成
- 通过OAuth 2.0连接Uber账号
- 自动获取并保存Uber Store ID
- 支持多个店铺分别绑定不同的Uber账号

### 3. 菜单同步 (`/menu-sync/:shopId`) ⭐ 核心功能
- 从POS系统获取所有菜单/产品
- 按分类展示产品
- 选择要同步到Uber的产品
- 一键批量同步
- 显示同步历史记录
- 同步结果反馈（成功/失败/错误）

## 项目结构

```
web/
├── src/
│   ├── pages/
│   │   ├── Login.tsx          # 登录页面
│   │   ├── Shops.tsx          # 店铺管理页面
│   │   └── MenuSync.tsx       # 菜单同步页面（核心）
│   ├── services/
│   │   ├── posApi.ts          # POS API调用服务
│   │   └── uberService.ts     # Uber集成服务
│   ├── config/
│   │   └── api.ts             # API配置
│   ├── App.tsx                # 主应用程序
│   ├── index.tsx              # 入口文件
│   └── index.css              # 全局样式
├── public/
│   └── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── .env.example               # 环境变量示例
```

## 快速开始

### 安装依赖

```bash
cd web
npm install
```

### 配置环境变量

```bash
cp .env.example .env.local
# 编辑 .env.local，填入实际的API地址和Uber OAuth凭证
```

### 启动开发服务器

```bash
npm start
```

访问 `http://localhost:3000`

## 工作流程

1. **登录** → 使用POS系统的邮箱/密码登录
2. **选择店铺** → 查看所有可用的店铺
3. **连接Uber** → 点击"Connect to Uber"，授权Uber OAuth
4. **同步菜单** → 选择要同步的产品，点击"Sync to Uber"

## 关键技术栈

- **React 18** - UI框架
- **React Router 6** - 路由
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式
- **Axios** - HTTP客户端
- **Lucide React** - 图标库

## API集成

### POS系统API
- `POST /staff/login` - 登录
- `POST /shop/list_shop` - 获取店铺列表
- `POST /product/list` - 获取产品列表

### 后端Node.js服务API
- `POST /uber/oauth/callback` - OAuth回调处理
- `POST /uber/disconnect` - 断开Uber连接
- `POST /uber/status` - 获取连接状态
- `POST /uber/sync-menu` - 同步菜单到Uber
- `POST /uber/sync-history` - 获取同步历史

## 环境变量说明

```
REACT_APP_POS_API_URL      - POS系统API基础URL
REACT_APP_BACKEND_URL      - Node.js后端服务URL
REACT_APP_UBER_CLIENT_ID   - Uber OAuth Client ID
REACT_APP_UBER_CLIENT_SECRET - Uber OAuth Client Secret
REACT_APP_UBER_REDIRECT_URI  - OAuth回调URL
```

## 部署

### 构建生产版本

```bash
npm run build
```

生成的 `build/` 目录可部署到任何静态服务器。

## 注意事项

1. 确保POS系统API能正常访问
2. 配置正确的Uber OAuth凭证
3. token存储在localStorage，生产环境建议使用httpOnly cookies
4. 菜单同步前确保产品信息完整（名称、价格等）
