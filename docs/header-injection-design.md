# Foundry VTT 表单角标注入优化方案

> 设计版本: 2.1
> 基于: Codex + Gemini 双模型交叉验证分析
> 目标: 向各类文档表单顶部注入自定义角标，兼容 v12/v13、AppV1/AppV2、核心/系统/模块三层架构

---

## 0. 注入模式概述

### 0.1 两种注入位置对比

在 Foundry VTT 中，向表单注入自定义元素存在两个主要位置：

```
┌─────────────────────────────────────────────────────────────────┐
│  Window Header (窗口标题栏)                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  [图标] 标题              [配置] [复制UUID] [关闭]       │    │
│  │                          ↑ Header Button 注入位置        │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│  Window Content (表单内容区)                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │  [头像] 名称  [徽章1] [徽章2] ← 始终可见角标位置  │    │    │
│  │  │              ↑ Sheet Header / Profile 区域       │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  │                                                         │    │
│  │  ┌─ 折叠区域 ─────────────────────────────────────┐    │    │
│  │  │  [▼ 展开] ← 点击展开的下拉式控制区域             │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  │                                                         │    │
│  │  [表单主体内容...]                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 0.2 三种注入模式

| 模式 | 位置 | 可见性 | 交互类型 | 典型用途 | 实现难度 |
|------|------|--------|----------|----------|----------|
| **Header Button** | Window Header | 表单打开时可见 | 点击触发功能 | 工具入口、操作按钮 | ⭐ 低 |
| **始终可见角标** | Sheet Header / Profile 区域 | 始终显示 | 纯展示 / 悬停信息 | 状态指示、模块标识 | ⭐⭐⭐ 高 |
| **下拉式控制区** | 折叠面板内 | 点击展开后可见 | 点击操作 | 高级设置、批量操作 | ⭐⭐ 中 |

### 0.3 系统间差异

不同系统的表单结构差异巨大，以下是典型示例：

#### Core Foundry (默认)
```html
<form class="actor-sheet">
  <header class="sheet-header">
    <img class="profile" src="..."/>
    <h1 class="charname">角色名</h1>
    <!-- 始终可见角标注入点 -->
  </header>
  <nav class="sheet-tabs">...</nav>
  <section class="sheet-body">...</section>
</form>
```

#### dnd5e v3.x (传统布局)
```html
<form class="dnd5e2 sheet actor character">
  <header class="sheet-header flexrow">
    <img class="profile" src="..."/>
    <section class="header-details">
      <h1 class="charname">...</h1>
      <div class="characteristics">...</div>
      <!-- 始终可见角标注入点 -->
    </section>
  </header>
</form>
```

#### dnd5e v4.x (现代布局 - 折叠式)
```html
<form class="dnd5e2 sheet actor character">
  <header class="sheet-header">
    <div class="header-top">
      <img class="profile"/>
      <h1 class="charname"/>
    </div>
    <div class="header-details collapsible"> <!-- 折叠区域 -->
      <button class="collapse-toggle">▼</button>
      <div class="collapse-content">
        <!-- 下拉式控制区注入点 -->
      </div>
    </div>
  </header>
</form>
```

---

## 1. 架构概览

### 1.1 分层注入策略

```
┌─────────────────────────────────────────────────────────────────┐
│                    Layer 1: Hook-Based Injection                │
│                         (最高优先级，最稳定)                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  AppV1: get*SheetHeaderButtons Hooks                    │    │
│  │  - getActorSheetHeaderButtons                           │    │
│  │  - getItemSheetHeaderButtons                            │    │
│  │  - getJournalSheetHeaderButtons (可扩展)                │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                   Layer 2: DOM-Based Injection                  │
│                      (AppV2 主要路径)                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  renderDocumentSheetV2 Hook → Container Injection       │    │
│  │  锚点优先级:                                             │    │
│  │    1. .window-controls (prepend)                        │    │
│  │    2. header.window-header (append)                     │    │
│  │    3. .window-title (after)                             │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                   Layer 3: Context Menu Fallback                │
│                         (兜底保障)                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Sidebar 右键菜单入口                                    │    │
│  │  - getActorContextOptions / getActorDirectoryEntryContext│    │
│  │  - getItemContextOptions / getItemDirectoryEntryContext  │    │
│  │  - getCompendiumEntryContextOptions                      │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                   Layer 4: API Access                           │
│                      (程序化访问)                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  game.modules.get('data-inspector').api.inspect(doc)    │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 核心设计原则

| 原则 | 说明 |
|------|------|
| **Window Header 唯一性** | 徽章/按钮仅注入 Window Header，不进入表单内容区 |
| **Hook 优先于 DOM** | 优先使用 Foundry 提供的 Hook API，DOM 操作作为补充 |
| **幂等性保证** | 重复渲染不会产生重复按钮 |
| **事件直接绑定** | 避免 setTimeout hack，创建元素时立即绑定事件 |
| **主题自适应** | 使用 CSS 变量，适配各系统主题 |

---

## 2. 兼容性矩阵

### 2.1 Foundry 版本 × 应用架构

| 版本 | AppV1 | AppV2 | 主要策略 |
|------|-------|-------|----------|
| v11 | ✅ 主流 | ❌ 无 | Layer 1 (Hook) |
| v12 | ✅ 兼容 | ✅ 引入 | Layer 1 + Layer 2 |
| v13 | ⚠️ 废弃中 | ✅ 主流 | Layer 2 为主 |

### 2.2 系统兼容性

| 系统 | 表单类型 | 预期覆盖层 | 备注 |
|------|----------|------------|------|
| Core Foundry | AppV1/V2 | L1 + L2 | 完全覆盖 |
| dnd5e (v3.x) | AppV1 | L1 | Hook 稳定 |
| dnd5e (v4.x+) | AppV2 | L2 | 需验证 .window-controls |
| pf2e | AppV2 | L2 | 需验证 header 结构 |
| pf1 | AppV1 | L1 | 已有系统扩展 |
| 其他系统 | 混合 | L1 + L2 + L3 | 兜底保障 |

---

## 3. 详细实现方案

### 3.1 Layer 1: Hook-Based Injection (AppV1)

```javascript
/**
 * AppV1 Header Button 注入
 * 使用 Foundry 官方 Hook API，最稳定的实现方式
 *
 * @param {Application} sheet - 表单应用实例
 * @param {object[]} buttons - 按钮数组（可变）
 */
function injectHeaderDataButton(sheet, buttons) {
    // 权限检查
    if (!canUserAccess()) return;

    // 文档查找（兼容多种表单结构）
    const document = resolveDocument(sheet);
    if (!document) return;

    // 幂等性：检查是否已存在
    if (buttons.some(b => b.class === 'data-inspector')) return;

    // 注入按钮定义
    buttons.unshift({
        class: 'data-inspector',
        icon: 'fa-solid fa-atom',
        label: 'DataInspector.DataButton',
        onclick: () => openInspector(document),
    });
}

/**
 * 文档解析器：兼容各种表单结构
 */
function resolveDocument(sheet) {
    const doc = sheet.document ?? sheet.actor ?? sheet.item ?? sheet.object;
    if (doc instanceof foundry.abstract.Document) return doc;
    return null;
}

// Hook 注册
const HEADER_BUTTON_HOOKS = [
    'getActorSheetHeaderButtons',
    'getItemSheetHeaderButtons',
    // 可扩展到其他文档类型
    // 'getJournalSheetHeaderButtons',
    // 'getCardsSheetHeaderButtons',
];

HEADER_BUTTON_HOOKS.forEach(hook => {
    Hooks.on(hook, injectHeaderDataButton);
});
```

### 3.2 Layer 2: DOM-Based Injection (AppV2)

```javascript
/**
 * AppV2 DOM 注入配置
 */
const APPV2_INJECTION_CONFIG = {
    // 锚点选择器优先级（从高到低）
    anchors: [
        { selector: '.window-controls', position: 'prepend' },
        { selector: 'header.window-header', position: 'append' },
        { selector: '.window-title', position: 'after' },
    ],
    // 按钮标识
    buttonSelector: 'button[data-action="__dataInspector"]',
    // 排除的应用类
    excludeClasses: ['DataBrowser', 'DataEditor'],
};

/**
 * AppV2 Header Button 注入
 *
 * @param {ApplicationV2} app - V2 应用实例
 * @param {HTMLElement} html - 应用根元素
 */
function injectAppV2HeaderButton(app, html) {
    // 排除自身应用
    if (isExcludedApp(app)) return;

    // 权限与文档检查
    if (!canUserAccess()) return;
    const document = resolveDocument(app);
    if (!document) return;
    if (!document.testUserPermission?.(game.user, 'OBSERVER')) return;

    // 获取 header
    const header = html.querySelector('header.window-header');
    if (!header) return;

    // 幂等性检查
    const { buttonSelector } = APPV2_INJECTION_CONFIG;
    if (header.querySelector(buttonSelector)) return;

    // 创建按钮
    const button = createAppV2Button(document);

    // 按优先级查找锚点并注入
    const injected = injectByPriority(header, button);

    if (injected) {
        // 注册动作处理器
        registerAction(app, document);
    }
}

/**
 * 创建 AppV2 按钮元素
 */
function createAppV2Button(document) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.action = '__dataInspector';
    button.dataset.tooltip = game.i18n.localize('DataInspector.Context.OpenInspector');
    button.classList.add(
        'header-control',
        'fa-solid',
        'fa-atom',
        'data-inspector',
        'icon'
    );
    button.setAttribute('aria-label', game.i18n.localize('DataInspector.Context.OpenInspector'));

    // 直接绑定事件（不依赖 Foundry 动作系统作为主要机制）
    button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openInspector(document);
    });

    return button;
}

/**
 * 按优先级注入按钮
 */
function injectByPriority(header, button) {
    const { anchors } = APPV2_INJECTION_CONFIG;

    for (const { selector, position } of anchors) {
        const anchor = header.querySelector(selector);
        if (!anchor) continue;

        switch (position) {
            case 'prepend':
                anchor.prepend(button);
                return true;
            case 'append':
                anchor.append(button);
                return true;
            case 'before':
                anchor.before(button);
                return true;
            case 'after':
                anchor.after(button);
                return true;
        }
    }

    // 最终兜底：直接加到 header
    header.append(button);
    return true;
}

/**
 * 注册 AppV2 动作（备用机制）
 */
function registerAction(app, document) {
    app.options.actions ??= {};
    app.options.actions.__dataInspector ??= function(_event, _el) {
        openInspector(document);
    };
}

// Hook 注册
Hooks.on('renderDocumentSheetV2', injectAppV2HeaderButton);
```

### 3.3 Layer 1 + Layer 2 整合入口

```javascript
/**
 * 统一的应用处理器
 * 可通过 Hook 暴露给外部模块扩展
 *
 * @param {Application|ApplicationV2} app - 应用实例
 * @param {Function} [getObject] - 自定义对象获取函数
 */
function injectAppHeaderButton(app, getObject) {
    let html = app.element;
    if (html instanceof jQuery) html = html[0];

    // 解析目标对象
    let target;
    if (getObject) {
        target = getObject(app);
        target.title ??= () => target.name ?? target.title ?? target.label;
    } else {
        target = resolveDocument(app);
    }

    if (!target) return;

    // 根据应用类型分发
    if (app instanceof foundry.applications.api.ApplicationV2) {
        injectAppV2HeaderButton(app, html);
    } else {
        injectAppV1HeaderButtonDOM(app, html, target);
    }
}

/**
 * AppV1 DOM 注入（用于非标准表单或 render Hook）
 */
function injectAppV1HeaderButtonDOM(app, html, target) {
    const header = html.querySelector('header.window-header');
    if (!header) return;

    // 幂等性检查
    if (header.querySelector('a.data-inspector.header-button')) return;

    // 权限检查
    if (!canUserAccess()) return;

    // 创建按钮
    const button = document.createElement('a');
    button.dataset.tooltip = game.i18n.localize('DataInspector.Context.OpenInspector');
    button.classList.add('header-button', 'control', 'data-inspector', 'icon');
    button.setAttribute('aria-label', game.i18n.localize('DataInspector.Context.OpenInspector'));

    const icon = document.createElement('i');
    icon.classList.add('fa-solid', 'fa-atom', 'fa-fw');
    icon.inert = true;

    button.append(icon, ' ', game.i18n.localize('DataInspector.DataButton'));

    // 直接绑定事件（移除 setTimeout hack）
    button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        openInspector(target);
    }, { capture: true }); // 使用捕获阶段确保优先级

    // 查找注入位置
    const closeButton = header.querySelector('.header-button.control.close');
    const windowTitle = header.querySelector('.window-title');

    if (closeButton) {
        closeButton.before(button);
    } else if (windowTitle) {
        windowTitle.after(button);
    } else {
        header.append(button);
    }
}

// 暴露 API 供外部扩展
Hooks.once('ready', () => {
    const mod = game.modules.get(CFG.id);
    mod.api.handlers = {
        applications: {
            render: injectAppHeaderButton,
        },
    };

    // 通知其他模块可以注册自定义处理器
    Hooks.callAll('data-inspector.appHandler', injectAppHeaderButton);
});
```

### 3.4 Layer 3: Context Menu Fallback

```javascript
/**
 * 上下文菜单注入
 * 作为 Layer 1/2 失败时的兜底方案
 */
function injectContextMenuEntry(app, entries) {
    // 解析 collection
    let collection = app.collection ?? game.packs.get(app.packId);
    const dc = foundry.documents?.abstract?.DocumentCollection ?? DocumentCollection;

    if (!(collection instanceof dc)) {
        collection = collection?.collection;
    }
    if (!collection) return;

    const packId = collection.metadata?.id;
    const documentType = collection.documentName;

    // 仅支持 Actor/Item（可扩展）
    if (!['Item', 'Actor'].includes(documentType)) return;

    entries.push({
        name: 'DataInspector.Context.OpenInspector',
        icon: '<i class="fa-solid fa-atom"></i>',
        condition: () => canUserAccess(),
        callback: async (entry) => {
            if (entry instanceof jQuery) entry = entry[0];
            const documentId = entry.dataset.entryId || entry.dataset.documentId;

            let doc;
            if (packId) {
                doc = await collection.getDocument(documentId);
            } else {
                doc = collection.get(documentId);
            }

            if (doc) {
                openInspector(doc);
            } else {
                console.warn('Data Inspector: Document not found', { documentId, packId });
            }
        },
    });
}

// 注册所有相关 Hook（v12/v13 双版本兼容）
const CONTEXT_MENU_HOOKS = [
    // v12 及之前
    'getItemDirectoryEntryContext',
    'getActorDirectoryEntryContext',
    'getCompendiumEntryContext',
    // v13
    'getItemContextOptions',
    'getActorContextOptions',
    'getCompendiumEntryContextOptions',
];

CONTEXT_MENU_HOOKS.forEach(hook => {
    Hooks.on(hook, injectContextMenuEntry);
});
```

---

## 4. CSS 样式优化

### 4.1 主题自适应

```scss
// 使用 CSS 变量实现主题自适应
.data-inspector {
    // 优先使用系统变量，回退到自定义值
    --di-icon-color: var(--color-text-light-heading, var(--color-text-hyperlink, lightskyblue));
    --di-icon-color-hover: var(--color-text-light-highlight, var(--color-text-hyperlink-hover, deepskyblue));
}

// AppV2 按钮样式
.application > .window-header button.header-control.data-inspector {
    color: var(--di-icon-color);

    &:hover,
    &:focus {
        color: var(--di-icon-color-hover);
    }

    &:focus-visible {
        outline: 2px solid var(--color-focus-outline, currentColor);
        outline-offset: 2px;
    }
}

// AppV1 按钮样式
.app.window-app > header.window-header {
    .header-button.control.data-inspector {
        > i {
            color: var(--di-icon-color);
        }

        &:hover > i,
        &:focus > i {
            color: var(--di-icon-color-hover);
        }
    }
}

// 高对比度模式支持
@media (prefers-contrast: high) {
    .data-inspector {
        --di-icon-color: currentColor;
        --di-icon-color-hover: currentColor;
    }
}

// 减少动画模式
@media (prefers-reduced-motion: reduce) {
    .data-inspector,
    .data-inspector * {
        transition: none !important;
    }
}
```

### 4.2 系统特定覆盖

```scss
// dnd5e 系统适配
.dnd5e.sheet {
    .data-inspector {
        --di-icon-color: var(--dnd5e-color-gold, var(--di-icon-color));
    }
}

// pf2e 系统适配
.pf2e.sheet {
    .data-inspector {
        --di-icon-color: var(--primary, var(--di-icon-color));
    }
}
```

---

## 5. 可访问性 (A11y)

### 5.1 ARIA 属性

```javascript
// 按钮创建时添加 ARIA 属性
button.setAttribute('aria-label', game.i18n.localize('DataInspector.Context.OpenInspector'));
button.setAttribute('role', 'button');

// 如果使用图标，标记为装饰性
icon.setAttribute('aria-hidden', 'true');
```

### 5.2 键盘导航

```javascript
// 确保按钮可聚焦
button.tabIndex = 0;

// 支持 Enter 和 Space 键激活
button.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        button.click();
    }
});
```

### 5.3 Tooltip 增强

```javascript
// 使用 Foundry 的 tooltip 系统
button.dataset.tooltip = game.i18n.localize('DataInspector.Context.OpenInspector');
button.dataset.tooltipDirection = 'UP';

// v13+ 可使用增强 tooltip
if (game.release.generation >= 13) {
    button.dataset.tooltipClass = 'data-inspector-tooltip';
}
```

---

## 6. 扩展性设计

### 6.1 自定义处理器注册

```javascript
/**
 * 允许外部模块注册自定义应用处理器
 *
 * @example
 * Hooks.once('data-inspector.appHandler', (handler) => {
 *     Hooks.on('renderMyCustomApp', (app) => handler(app, (app) => ({
 *         object: app.myData,
 *         title: () => app.myData.name,
 *         document: app.myData.parent,
 *     })));
 * });
 */
```

### 6.2 系统适配器接口

```javascript
/**
 * 系统适配器配置
 * 允许系统或模块注册自定义选择器
 */
const systemAdapters = new Map();

/**
 * 注册系统适配器
 *
 * @param {string} systemId - 系统 ID
 * @param {object} config - 适配器配置
 */
function registerSystemAdapter(systemId, config) {
    systemAdapters.set(systemId, {
        headerSelector: config.headerSelector ?? 'header.window-header',
        controlsSelector: config.controlsSelector ?? '.window-controls',
        buttonClass: config.buttonClass ?? 'header-control',
        ...config,
    });
}

// 使用示例
registerSystemAdapter('dnd5e', {
    controlsSelector: '.window-header .document-controls, .window-controls',
});

registerSystemAdapter('pf2e', {
    controlsSelector: '.window-controls, .header-controls',
});
```

---

## 7. 测试清单

### 7.1 功能测试

| 测试场景 | 预期结果 | 验证层 |
|----------|----------|--------|
| Core Actor Sheet (v12) | 按钮出现在 header | L1 |
| Core Actor Sheet (v13) | 按钮出现在 header | L2 |
| Core Item Sheet | 按钮出现在 header | L1/L2 |
| dnd5e Character Sheet | 按钮出现在 header | L1/L2 |
| dnd5e Item Sheet | 按钮出现在 header | L1/L2 |
| Compendium Entry | 右键菜单可用 | L3 |
| Sidebar Actor | 右键菜单可用 | L3 |
| 重复渲染 | 不产生重复按钮 | All |
| 权限限制 | 非 GM 无按钮（设置禁用时） | All |

### 7.2 兼容性测试

| 测试场景 | 验证点 |
|----------|--------|
| 纯净 Foundry (无模块) | 基础功能正常 |
| dnd5e + 核心模块 | 无冲突 |
| pf2e 系统 | 按钮正常显示 |
| 自定义主题模块 | 样式自适应 |

### 7.3 可访问性测试

| 测试项 | 验证方法 |
|--------|----------|
| 键盘导航 | Tab 可聚焦，Enter/Space 可激活 |
| 屏幕阅读器 | aria-label 正确播报 |
| 高对比度 | 按钮可见 |
| 缩放 200% | 布局不错乱 |

---

## 8. 迁移指南

### 8.1 从当前实现迁移

1. **移除 setTimeout hack**
   - 旧代码：`setTimeout(() => { ... }, 550)`
   - 新代码：直接事件绑定 + `{ capture: true }`

2. **更新 AppV2 锚点选择器**
   - 旧代码：`querySelector('button[data-action="copyUuid"]')`
   - 新代码：优先级查找 `.window-controls` → `header.window-header`

3. **更新 CSS 变量**
   - 旧代码：`--color-icon: lightskyblue`
   - 新代码：`--di-icon-color: var(--color-text-light-heading, lightskyblue)`

### 8.2 版本兼容

```javascript
// 版本检测
const isV13Plus = game.release.generation >= 13;
const hasAppV2 = !!foundry.applications?.api?.ApplicationV2;

// 条件注册 Hook
if (hasAppV2) {
    Hooks.on('renderDocumentSheetV2', injectAppV2HeaderButton);
}

// v12/v13 上下文菜单 Hook 双注册
Hooks.on('getActorDirectoryEntryContext', injectContextMenuEntry); // v12
Hooks.on('getActorContextOptions', injectContextMenuEntry); // v13
```

---

## 9. 附录

### 9.1 完整 Hook 列表

```javascript
// Header Button Hooks (AppV1)
'getActorSheetHeaderButtons'
'getItemSheetHeaderButtons'
'getJournalSheetHeaderButtons'
'getCardsSheetHeaderButtons'

// Render Hooks (AppV2)
'renderDocumentSheetV2'
'renderActorSheet'  // 兼容层
'renderItemSheet'   // 兼容层

// Context Menu Hooks
'getActorDirectoryEntryContext'      // v12
'getActorContextOptions'             // v13
'getItemDirectoryEntryContext'       // v12
'getItemContextOptions'              // v13
'getCompendiumEntryContext'          // v12
'getCompendiumEntryContextOptions'   // v13
```

### 9.2 关键选择器参考

```css
/* AppV2 Header 结构 */
.application > header.window-header
    > .window-icon
    > .window-title
    > .window-controls
        > button[data-action="configure"]
        > button[data-action="copyUuid"]
        > button[data-action="close"]

/* AppV1 Header 结构 */
.app.window-app > header.window-header
    > .window-title
    > a.header-button.control.configure
    > a.header-button.control.close
```

### 9.3 参考资源

- [Foundry VTT API Documentation](https://foundryvtt.com/api/)
- [ApplicationV2 Migration Guide](https://foundryvtt.wiki/en/development/api/applicationv2)
- [WCAG 2.1 Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

## 10. 始终可见角标注入方案

### 10.1 概述

"始终可见角标"是指注入到表单内容区（.window-content）顶部的持久性图标/徽章，与 Header Button 不同，它：
- 位于表单内容区而非窗口标题栏
- 通常用于状态指示而非功能触发
- 需要适配各系统不同的模板结构

### 10.2 核心挑战

| 挑战 | 描述 | 应对策略 |
|------|------|----------|
| **模板结构差异** | 不同系统的 sheet-header 结构完全不同 | 系统适配器注册机制 |
| **CSS 布局干扰** | 注入元素可能破坏原有 Flex/Grid 布局 | 使用绝对定位或容器包装 |
| **重渲染覆盖** | 表单重渲染可能清除注入内容 | render Hook 中幂等注入 |
| **Z-index 冲突** | 角标可能被其他元素遮挡 | 合理设置层级 |

### 10.3 实现架构

```javascript
/**
 * 始终可见角标注入系统
 */
const SheetBadgeInjector = {
    // 系统适配器注册表
    adapters: new Map(),

    /**
     * 注册系统适配器
     * @param {string} systemId - 系统ID (如 'dnd5e', 'pf2e')
     * @param {object} config - 适配器配置
     */
    registerAdapter(systemId, config) {
        this.adapters.set(systemId, {
            // 角标容器选择器（按优先级）
            containerSelectors: config.containerSelectors ?? [
                '.sheet-header .header-details',
                '.sheet-header',
                'header.sheet-header',
                'form > header',
            ],
            // 角标插入位置
            insertPosition: config.insertPosition ?? 'beforeend', // beforeend | afterbegin
            // 是否使用绝对定位
            useAbsolutePosition: config.useAbsolutePosition ?? false,
            // 自定义定位配置
            positionConfig: config.positionConfig ?? { top: '5px', right: '5px' },
            // 文档类型过滤
            documentTypes: config.documentTypes ?? ['Actor', 'Item'],
            ...config,
        });
    },

    /**
     * 获取当前系统的适配器
     */
    getAdapter() {
        const systemId = game.system.id;
        return this.adapters.get(systemId) ?? this.adapters.get('default');
    },

    /**
     * 注入角标到表单
     * @param {Application} app - 应用实例
     * @param {HTMLElement} html - 表单 HTML 元素
     * @param {object} badgeConfig - 角标配置
     */
    inject(app, html, badgeConfig) {
        const adapter = this.getAdapter();
        if (!adapter) return false;

        // 获取文档
        const doc = app.document ?? app.object;
        if (!doc) return false;

        // 文档类型检查
        const docType = doc.documentName ?? doc.constructor.name;
        if (!adapter.documentTypes.includes(docType)) return false;

        // 查找容器
        const container = this._findContainer(html, adapter.containerSelectors);
        if (!container) {
            console.warn('SheetBadgeInjector: Container not found', adapter.containerSelectors);
            return false;
        }

        // 幂等性检查
        const badgeId = badgeConfig.id ?? 'default-badge';
        if (container.querySelector(`[data-badge-id="${badgeId}"]`)) return true;

        // 创建角标元素
        const badge = this._createBadge(badgeConfig, adapter);

        // 插入角标
        if (adapter.insertPosition === 'afterbegin') {
            container.prepend(badge);
        } else {
            container.append(badge);
        }

        return true;
    },

    /**
     * 查找容器
     */
    _findContainer(html, selectors) {
        for (const selector of selectors) {
            const container = html.querySelector(selector);
            if (container) return container;
        }
        return null;
    },

    /**
     * 创建角标元素
     */
    _createBadge(config, adapter) {
        const badge = document.createElement('div');
        badge.className = `sheet-badge ${config.className ?? ''}`;
        badge.dataset.badgeId = config.id ?? 'default-badge';

        // 图标
        if (config.icon) {
            const icon = document.createElement('i');
            icon.className = config.icon;
            icon.setAttribute('aria-hidden', 'true');
            badge.append(icon);
        }

        // 文本
        if (config.text) {
            const text = document.createElement('span');
            text.className = 'badge-text';
            text.textContent = config.text;
            badge.append(text);
        }

        // Tooltip
        if (config.tooltip) {
            badge.dataset.tooltip = config.tooltip;
            badge.dataset.tooltipDirection = config.tooltipDirection ?? 'UP';
        }

        // 绝对定位
        if (adapter.useAbsolutePosition) {
            badge.style.position = 'absolute';
            Object.assign(badge.style, adapter.positionConfig);
        }

        // 点击事件（可选）
        if (config.onClick) {
            badge.style.cursor = 'pointer';
            badge.addEventListener('click', config.onClick);
        }

        return badge;
    },
};

// 注册默认适配器
SheetBadgeInjector.registerAdapter('default', {
    containerSelectors: [
        '.sheet-header',
        'header.sheet-header',
        'form > header',
    ],
});
```

### 10.4 系统适配器示例

```javascript
// dnd5e v3.x 适配器
SheetBadgeInjector.registerAdapter('dnd5e', {
    containerSelectors: [
        '.sheet-header .header-details',      // 优先注入到详情区
        '.sheet-header .characteristics',     // 备选：特征区
        '.sheet-header',                      // 最终兜底
    ],
    insertPosition: 'beforeend',
    documentTypes: ['Actor', 'Item'],
});

// pf2e 适配器
SheetBadgeInjector.registerAdapter('pf2e', {
    containerSelectors: [
        '.sheet-header .header-content',
        '.sheet-header',
    ],
    useAbsolutePosition: true,
    positionConfig: { top: '10px', right: '10px' },
});

// 通用兜底（使用绝对定位覆盖头像区域）
SheetBadgeInjector.registerAdapter('fallback', {
    containerSelectors: ['.window-content'],
    useAbsolutePosition: true,
    positionConfig: { top: '5px', left: '5px' },
});
```

### 10.5 使用示例

```javascript
// 在 render Hook 中注入角标
Hooks.on('renderActorSheet', (app, html, data) => {
    if (html instanceof jQuery) html = html[0];

    SheetBadgeInjector.inject(app, html, {
        id: 'data-inspector-badge',
        icon: 'fa-solid fa-atom',
        className: 'data-inspector-badge',
        tooltip: game.i18n.localize('DataInspector.Context.OpenInspector'),
        onClick: () => openInspector(app.document),
    });
});

Hooks.on('renderItemSheet', (app, html, data) => {
    if (html instanceof jQuery) html = html[0];

    SheetBadgeInjector.inject(app, html, {
        id: 'data-inspector-badge',
        icon: 'fa-solid fa-atom',
        className: 'data-inspector-badge',
        tooltip: game.i18n.localize('DataInspector.Context.OpenInspector'),
        onClick: () => openInspector(app.document),
    });
});
```

### 10.6 CSS 样式

```scss
// 始终可见角标基础样式
.sheet-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 0.85em;

    // 使用系统变量
    background: var(--color-cool-4, rgba(0, 0, 0, 0.1));
    color: var(--color-text-light-heading, inherit);

    // 交互反馈
    &[data-tooltip] {
        cursor: help;
    }

    &:hover {
        background: var(--color-cool-5, rgba(0, 0, 0, 0.2));
    }

    // 图标样式
    > i {
        font-size: 1em;
    }
}

// 绝对定位模式
.sheet-badge[style*="position: absolute"] {
    z-index: 10;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

// Data Inspector 特定样式
.sheet-badge.data-inspector-badge {
    --di-badge-color: var(--color-text-light-heading, lightskyblue);

    > i {
        color: var(--di-badge-color);
    }

    &:hover > i {
        color: var(--color-text-hyperlink-hover, deepskyblue);
    }
}

// dnd5e 系统适配
.dnd5e .sheet-badge {
    background: var(--dnd5e-background-5, rgba(0, 0, 0, 0.1));
}

// pf2e 系统适配
.pf2e .sheet-badge {
    background: var(--secondary, rgba(0, 0, 0, 0.1));
}
```

---

## 11. 下拉式控制区注入方案

### 11.1 概述

"下拉式控制区"是指需要点击展开才能看到的折叠面板，常见于现代化的表单设计（如 dnd5e v4+）。

### 11.2 实现模式

有两种实现方式：

#### 方式 A：复用系统现有折叠区域

```javascript
/**
 * 向系统现有的折叠区域注入内容
 */
function injectIntoExistingCollapsible(app, html, content) {
    // dnd5e v4+ 的折叠区域
    const collapsible = html.querySelector('.header-details.collapsible .collapse-content');
    if (!collapsible) return false;

    // 创建控制区容器
    const container = document.createElement('div');
    container.className = 'module-controls data-inspector-controls';
    container.innerHTML = content;

    collapsible.append(container);
    return true;
}
```

#### 方式 B：创建独立折叠面板

```javascript
/**
 * 创建独立的折叠控制面板
 */
function createCollapsiblePanel(app, html, config) {
    const anchor = html.querySelector(config.anchorSelector ?? '.sheet-header');
    if (!anchor) return false;

    // 创建折叠面板
    const panel = document.createElement('details');
    panel.className = 'module-collapsible data-inspector-panel';

    const summary = document.createElement('summary');
    summary.innerHTML = `<i class="${config.icon ?? 'fa-solid fa-cog'}"></i> ${config.title ?? 'Controls'}`;

    const content = document.createElement('div');
    content.className = 'panel-content';
    content.innerHTML = config.content;

    panel.append(summary, content);
    anchor.after(panel);

    return true;
}
```

### 11.3 CSS 样式

```scss
// 独立折叠面板样式
details.module-collapsible {
    margin: 0.5rem;
    border: 1px solid var(--color-border-light-2, #ccc);
    border-radius: 4px;

    > summary {
        padding: 0.5rem;
        cursor: pointer;
        background: var(--color-cool-4, #f5f5f5);
        font-weight: bold;

        &:hover {
            background: var(--color-cool-5, #eee);
        }

        > i {
            margin-right: 0.5rem;
        }
    }

    > .panel-content {
        padding: 0.5rem;
    }

    &[open] > summary {
        border-bottom: 1px solid var(--color-border-light-2, #ccc);
    }
}

// 嵌入现有折叠区的控制区样式
.module-controls {
    padding: 0.5rem;
    border-top: 1px solid var(--color-border-light-2, #ccc);
    margin-top: 0.5rem;

    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}
```

---

## 12. 注入模式选择指南

### 12.1 决策树

```
需要注入什么类型的元素？
│
├─ 功能按钮（点击触发操作）
│   │
│   ├─ 需要始终可见？
│   │   ├─ 是 → Header Button (推荐) 或 始终可见角标
│   │   └─ 否 → 下拉式控制区 或 Context Menu
│   │
│   └─ 是否为"元工具"（操作文档本身）？
│       ├─ 是 → Header Button (强烈推荐)
│       └─ 否 → 始终可见角标 或 下拉式控制区
│
├─ 状态指示器（纯展示）
│   │
│   └─ 需要始终可见？
│       ├─ 是 → 始终可见角标
│       └─ 否 → Tooltip 或 下拉式控制区
│
└─ 复杂控制面板（多个选项/设置）
    │
    └─ → 下拉式控制区 (推荐)
```

### 12.2 推荐策略

| 场景 | 推荐模式 | 理由 |
|------|----------|------|
| Data Inspector 入口 | Header Button | 元工具，应在窗口框架层 |
| 文档状态标记 | 始终可见角标 | 需要即时可见的状态信息 |
| 模块设置面板 | 下拉式控制区 | 复杂配置，按需展开 |
| 批量操作按钮 | 下拉式控制区 | 低频操作，减少视觉干扰 |
| 快捷操作按钮 | 始终可见角标 (可点击) | 高频操作，需要快速访问 |

### 12.3 兼容性考量

| 注入模式 | Core | dnd5e v3 | dnd5e v4 | pf2e | 其他系统 |
|----------|------|----------|----------|------|----------|
| Header Button | ✅ | ✅ | ✅ | ✅ | ✅ |
| 始终可见角标 | ✅ | ✅ | ⚠️ 需适配 | ⚠️ 需适配 | ❓ 需测试 |
| 下拉式控制区 | ⚠️ 需创建 | ⚠️ 需创建 | ✅ 可复用 | ⚠️ 需创建 | ❓ 需测试 |

**结论**：对于 Data Inspector 这类"元工具"，**Header Button 仍是最佳选择**，因为它在所有系统中都有稳定支持。始终可见角标和下拉式控制区适用于更具系统特异性的功能扩展。
