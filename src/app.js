import express from 'express';
import dotenv from 'dotenv';
import routes from './routes/index.js';
import startScheduledScan from './services/scanHome.js';

// 加载环境变量
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// 启用 JSON 解析中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 错误处理中间件
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: '服务器内部错误'
  });
};

// 使用主路由
app.use(routes);

// 处理 404
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: '未找到请求的资源'
  });
});

// 错误处理
app.use(errorHandler);

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
  // 启动定时扫描服务
  startScheduledScan();
});
