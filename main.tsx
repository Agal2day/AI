import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import App from './App.tsx'
import './index.css'

// 配置 Monaco Editor 使用本地安装的包，而不是从 CDN 加载
loader.config({ monaco });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
