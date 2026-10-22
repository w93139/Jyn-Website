# Jyn 个人作品站

AI 产品与实践作品的静态展示网站，包含项目介绍、GitHub 入口、工作方式和联系信息。页面使用原生 HTML、CSS、JavaScript 和本地视觉效果代码，无需前端构建。

## 本地预览

需要 Python 3，从仓库根目录运行：

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

打开 <http://127.0.0.1:8000/>。页面入口是 [index.html](index.html)，内容与交互修改后刷新浏览器即可查看。

## 部署与来源

可将仓库文件作为静态网站部署，保持脚本与样式的相对路径。第三方组件的来源、版权和使用限制见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)；不要移除其中的许可声明。仓库未单独声明整站代码的统一开源许可证。
