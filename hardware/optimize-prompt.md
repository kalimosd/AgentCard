打开 /Users/zhanchidong/code/AgentCard/hardware/index.html，先用 Chrome 以 800×240 viewport 分别查看 5 个场景的实际渲染效果：

```
http://localhost:4322/index.html?working
http://localhost:4322/index.html?approval
http://localhost:4322/index.html?question
http://localhost:4322/index.html?failed
http://localhost:4322/index.html?done
```

如果 server 没跑，先 `python3 -m http.server 4322 --directory /Users/zhanchidong/code/AgentCard/hardware`。

## 背景

这是一个硬件产品的 UI 原型——一块卡在显示器顶上的横条触屏，尺寸约 800×200 像素。五个场景分别是：agent 工作中（安静指标）、等待权限（紧凑介入卡片）、等待回答问题（展开问题面板）、命令失败、任务完成。

## 要优化的

1. 当前布局是三栏 grid（河狸 | 状态 | 右侧），在 800×200 的窄条里，三栏比例和元素对齐是否合理？
2. 问题场景下，三行选项的文字（~11px 中文）在 200px 高度内实际可读性如何？
3. 不同场景切换时，布局突变是否自然？还是需要过渡动画？
4. 河狸在左侧是否显得孤立？是否该和中栏融合？
5. 任何溢出、裁切、拥挤的地方

## 要求

- 直接用浏览器 DevTools 查看并调整
- 修改 index.html 的 CSS 和结构，让 5 个场景在 800×200 内都舒服
- 改完后重新打开页面验证
- 告诉我改了什么
