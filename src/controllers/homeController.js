export const getHome = (req, res) => {
  res.json({ message: '欢迎使用 Express 服务!' });
};

export const getHealth = (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
}; 