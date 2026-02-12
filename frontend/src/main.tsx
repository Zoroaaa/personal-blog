/**
 * 应用入口文件
 * 
 * 功能：
 * - 初始化React应用
 * - 挂载App组件到DOM根节点
 * - 引入全局样式文件
 * 
 * 引入文件：
 * - App.tsx：应用主组件
 * - index.css：全局样式
 * - markdown.css：Markdown样式
 * 
 * @author 博客系统
 * @version 1.0.0
 * @created 2024-01-01
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/markdown.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
