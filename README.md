# Quick Upload

[English](#english) | [简体中文](#简体中文)

---

# English

## Overview
Quick Upload is a Foundry VTT module that speeds up image updates for documents. It supports drag & drop, clipboard paste, and URL import, includes a built-in image editor, and converts images to WebP automatically.

## Compatibility
- Foundry VTT v13 (minimum/verified)

## Features
- Upload sources: drag & drop, clipboard paste, file picker, and image URL.
- Built-in image editor (Filerobot) with crop/resize/filters/annotate.
- Foundry presets for token and portrait sizes.
- Auto WebP conversion with optional compression and quality control.
- Naming template with placeholders: `{name}`, `{type}`, `{hash}`.
- Per-document save paths stored under your world folder.
- UI entry points: hover button on images and header button on sheets.
- Field selection for documents with multiple image fields (Actor/Scene).

## Supported Documents and Fields
- Actor: `portrait`, `token`
- Item: `image`
- Scene: `background`, `foreground`
- Journal Entry: `image`
- Roll Table: `image`
- Cards: `image`
- Macro: `image`
- Token Config (prototype token image)

## Installation
1. In Foundry VTT, go to **Add-on Modules** → **Install Module**.
2. Paste the manifest URL:
   `https://github.com/<user>/<repo>/releases/latest/download/module.json`
3. Click **Install**, then enable **Quick Upload** in your world.

## Usage
1. Open a supported document sheet or config window.
2. Click the **Quick Upload** button in the header, or hover an image and click the upload icon.
3. Provide an image:
   - Drag & drop into the dialog
   - Paste from clipboard (Ctrl+V)
   - Click to browse a local file
   - Paste an image URL (http/https)
4. (Optional) Click **Edit** to open the built-in editor.
5. Adjust save path and filename, then **Upload & Save**.

## Settings
All settings are **world** scope and live under **Module Settings**.

| Setting | Default | Description |
| --- | --- | --- |
| Enable Compression | `true` | Compress images when converting to WebP. |
| Compression Quality | `0.8` | WebP quality level (0.1–1.0). |
| Naming Template | `{name}-{type}-{hash}` | Filename template for uploads. |
| Hash Length | `8` | Random hash length in filename. |
| Show Hover Button | `true` | Show upload button on image hover. |
| Show Header Button | `true` | Show upload button in sheet header. |
| Storage Source | `data` | Choose the storage backend (`data` or `s3`). |
| S3 Bucket | `` | Bucket name for S3 uploads. |
| Actor Portrait Path | `images/actors/portraits` | Save path for actor portraits. |
| Actor Token Path | `images/actors/tokens` | Save path for actor tokens. |
| Item Image Path | `images/items` | Save path for items. |
| Scene Background Path | `images/scenes/backgrounds` | Save path for scene backgrounds. |
| Scene Foreground Path | `images/scenes/foregrounds` | Save path for scene foregrounds. |
| Journal Image Path | `images/journals` | Save path for journals. |
| Roll Table Image Path | `images/tables` | Save path for roll tables. |
| Cards Image Path | `images/cards` | Save path for cards. |
| Macro Image Path | `images/macros` | Save path for macros. |

## Notes
- Save paths are resolved under `worlds/<worldId>/...` when using the `data` source.
- When `s3` is selected, paths are combined as `s3:bucket/path` and are not world-prefixed.
- Uploads always end with `.webp`. If the source is already WebP and compression is disabled, it is reused as-is.
- URL imports support `http`/`https` only in the dialog UI.

## API (for other modules)
Quick Upload exposes a small API via:
`game.modules.get('foundry-quick-upload').api`

Available helpers:
- `openDialog(document, field)` - open the upload dialog for a document field.
- `UploadController`, `ImagePipeline`, `PathResolver` - lower-level helpers.

## Screenshots (placeholders)
Replace these with your own images.

![Quick Upload Dialog](docs/images/quick-upload-dialog.png)
![Editor View](docs/images/editor-view.png)
![Hover Button](docs/images/hover-button.png)
![Module Settings](docs/images/module-settings.png)

## Acknowledgements
- Foundry VTT community and API.
- Filerobot Image Editor by Scaleflex.

## License
MIT. See `LICENSE`.

---

# 简体中文

## 概述
Quick Upload 是一个用于 Foundry VTT 的快速图片上传模块，支持拖拽、剪贴板粘贴与 URL 导入，内置图片编辑器，并自动转换为 WebP。

## 兼容性
- Foundry VTT v13（最低/已验证）

## 功能特性
- 上传来源：拖拽、剪贴板粘贴、文件选择、图片 URL。
- 内置图片编辑器（Filerobot），支持裁剪/缩放/滤镜/标注。
- Foundry 预设尺寸（Token 与肖像）。
- 自动 WebP 转换，可配置压缩与质量。
- 命名模板占位符：`{name}`、`{type}`、`{hash}`。
- 按文档类型配置保存路径（位于世界目录下）。
- UI 入口：图片悬浮按钮、表单标题栏按钮。
- 多字段文档支持字段选择（Actor/Scene）。

## 支持的文档与字段
- 角色 Actor：`portrait`、`token`
- 物品 Item：`image`
- 场景 Scene：`background`、`foreground`
- 日志 Journal Entry：`image`
- 骰表 Roll Table：`image`
- 卡牌 Cards：`image`
- 宏 Macro：`image`
- Token 配置（原型 Token 图片）

## 安装
1. 在 Foundry VTT 中进入 **Add-on Modules** → **Install Module**。
2. 粘贴清单地址：
   `https://github.com/<user>/<repo>/releases/latest/download/module.json`
3. 安装后在世界中启用 **Quick Upload**。

## 使用方法
1. 打开支持的文档表单或配置窗口。
2. 点击标题栏的 **快速上传**，或将鼠标悬停在图片上点击上传图标。
3. 提供图片：
   - 拖拽到弹窗
   - 从剪贴板粘贴（Ctrl+V）
   - 点击选择本地文件
   - 输入图片 URL（http/https）
4.（可选）点击 **编辑** 打开内置编辑器。
5. 设置保存路径与文件名，点击 **上传并保存**。

## 设置项
全部为 **world** 范围设置，位于 **模块设置** 中。

| 设置项 | 默认值 | 说明 |
| --- | --- | --- |
| 启用压缩 | `true` | 转换为 WebP 时进行压缩。 |
| 压缩质量 | `0.8` | WebP 质量等级（0.1–1.0）。 |
| 命名模板 | `{name}-{type}-{hash}` | 上传文件名模板。 |
| 哈希长度 | `8` | 文件名中的随机哈希长度。 |
| 显示悬浮按钮 | `true` | 悬停图片时显示上传按钮。 |
| 显示标题栏按钮 | `true` | 表单标题栏显示上传按钮。 |
| 存储来源 | `data` | 选择存储后端（`data` 或 `s3`）。 |
| S3 桶 | `` | S3 上传使用的 bucket 名称。 |
| 角色肖像路径 | `images/actors/portraits` | 角色肖像保存路径。 |
| 角色 Token 路径 | `images/actors/tokens` | 角色 Token 保存路径。 |
| 物品图片路径 | `images/items` | 物品图片保存路径。 |
| 场景背景路径 | `images/scenes/backgrounds` | 场景背景保存路径。 |
| 场景前景路径 | `images/scenes/foregrounds` | 场景前景保存路径。 |
| 日志图片路径 | `images/journals` | 日志图片保存路径。 |
| 骰表图片路径 | `images/tables` | 骰表图片保存路径。 |
| 卡牌图片路径 | `images/cards` | 卡牌图片保存路径。 |
| 宏图片路径 | `images/macros` | 宏图片保存路径。 |

## 说明
- 使用 `data` 时，保存路径会解析到 `worlds/<worldId>/...`。
- 选择 `s3` 时，路径会拼成 `s3:bucket/path`，不再加世界前缀。
- 上传结果统一为 `.webp`。若源图已是 WebP 且关闭压缩，将直接复用。
- 弹窗内的 URL 导入仅支持 `http/https`。

## API（供其他模块调用）
通过以下入口使用：
`game.modules.get('foundry-quick-upload').api`

可用接口：
- `openDialog(document, field)` - 打开指定字段的上传弹窗。
- `UploadController`、`ImagePipeline`、`PathResolver` - 底层辅助类。

## 截图占位（请替换）
![快速上传弹窗](docs/images/quick-upload-dialog.png)
![编辑器视图](docs/images/editor-view.png)
![悬浮按钮](docs/images/hover-button.png)
![模块设置](docs/images/module-settings.png)

## 致谢
- Foundry VTT 社区与 API。
- Scaleflex 的 Filerobot Image Editor。

## 许可证
MIT，详见 `LICENSE`。
