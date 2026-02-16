# 后端通知调用修复补丁

## 问题说明

所有 `createInteractionNotification` 调用缺少第三个参数 `env`，导致通知无法真正触发。

## 需要修改的文件

### 1. backend/src/routes/posts.ts

#### 修复点赞通知（约第1617行）

**❌ 修改前：**
```typescript
await createInteractionNotification(c.env.DB, {
  userId: postInfo.author_id,
  subtype: 'like',
  title: `${user.displayName || user.username} 赞了你的文章《${postInfo.title}》`,
  relatedData: {
    postId: parseInt(postId),
    postTitle: postInfo.title,
    postSlug: postInfo.slug,
    senderId: user.userId,
    senderName: user.displayName || user.username,
    senderAvatar: user.avatarUrl,
  },
});
```

**✅ 修改后：**
```typescript
await createInteractionNotification(c.env.DB, {
  userId: postInfo.author_id,
  subtype: 'like',
  title: `${user.displayName || user.username} 赞了你的文章《${postInfo.title}》`,
  relatedData: {
    postId: parseInt(postId),
    postTitle: postInfo.title,
    postSlug: postInfo.slug,
    senderId: user.userId,
    senderName: user.displayName || user.username,
    senderAvatar: user.avatarUrl,
  },
}, c.env);  // 👈 添加这一行
```

---

#### 修复收藏通知（约第1666行）

**❌ 修改前：**
```typescript
await createInteractionNotification(c.env.DB, {
  userId: postInfo.author_id,
  subtype: 'favorite',
  title: `${user.displayName || user.username} 收藏了你的文章《${postInfo.title}》`,
  relatedData: {
    postId: parseInt(postId),
    postTitle: postInfo.title,
    postSlug: postInfo.slug,
    senderId: user.userId,
    senderName: user.displayName || user.username,
    senderAvatar: user.avatarUrl,
  },
});
```

**✅ 修改后：**
```typescript
await createInteractionNotification(c.env.DB, {
  userId: postInfo.author_id,
  subtype: 'favorite',
  title: `${user.displayName || user.username} 收藏了你的文章《${postInfo.title}》`,
  relatedData: {
    postId: parseInt(postId),
    postTitle: postInfo.title,
    postSlug: postInfo.slug,
    senderId: user.userId,
    senderName: user.displayName || user.username,
    senderAvatar: user.avatarUrl,
  },
}, c.env);  // 👈 添加这一行
```

---

### 2. backend/src/routes/comments.ts

#### 修复回复通知（约第389行）

**❌ 修改前：**
```typescript
await createInteractionNotification(c.env.DB, {
  userId: parentComment.user_id,
  subtype: 'reply',
  title: `${user.displayName || user.username} 回复了你的评论`,
  content: content.length > 100 ? content.substring(0, 100) + '...' : content,
  relatedData: {
    postId: postId,
    postTitle: postInfo?.title,
    postSlug: postInfo?.slug,
    commentId: commentId,
    parentCommentId: parentId,
    parentCommentContent: parentComment.content,
    parentCommentAuthor: parentComment.display_name || parentComment.username,
    replyContent: content,
    senderId: user.userId,
    senderName: user.displayName || user.username,
    senderAvatar: user.avatarUrl,
  },
});
```

**✅ 修改后：**
```typescript
await createInteractionNotification(c.env.DB, {
  userId: parentComment.user_id,
  subtype: 'reply',
  title: `${user.displayName || user.username} 回复了你的评论`,
  content: content.length > 100 ? content.substring(0, 100) + '...' : content,
  relatedData: {
    postId: postId,
    postTitle: postInfo?.title,
    postSlug: postInfo?.slug,
    commentId: commentId,
    parentCommentId: parentId,
    parentCommentContent: parentComment.content,
    parentCommentAuthor: parentComment.display_name || parentComment.username,
    replyContent: content,
    senderId: user.userId,
    senderName: user.displayName || user.username,
    senderAvatar: user.avatarUrl,
  },
}, c.env);  // 👈 添加这一行
```

---

#### 修复评论通知（约第425行）

**❌ 修改前：**
```typescript
await createInteractionNotification(c.env.DB, {
  userId: postInfo.author_id,
  subtype: 'comment',
  title: `${user.displayName || user.username} 评论了你的文章《${postInfo.title}》`,
  content: content.length > 100 ? content.substring(0, 100) + '...' : content,
  relatedData: {
    postId: postId,
    postTitle: postInfo.title,
    postSlug: postInfo.slug,
    commentId: commentId,
    senderId: user.userId,
    senderName: user.displayName || user.username,
    senderAvatar: user.avatarUrl,
  },
});
```

**✅ 修改后：**
```typescript
await createInteractionNotification(c.env.DB, {
  userId: postInfo.author_id,
  subtype: 'comment',
  title: `${user.displayName || user.username} 评论了你的文章《${postInfo.title}》`,
  content: content.length > 100 ? content.substring(0, 100) + '...' : content,
  relatedData: {
    postId: postId,
    postTitle: postInfo.title,
    postSlug: postInfo.slug,
    commentId: commentId,
    senderId: user.userId,
    senderName: user.displayName || user.username,
    senderAvatar: user.avatarUrl,
  },
}, c.env);  // 👈 添加这一行
```

---

## 快速查找替换方法

### 使用命令行批量替换

```bash
# 在 backend/src/routes 目录下执行

# 1. 备份文件
cp posts.ts posts.ts.backup
cp comments.ts comments.ts.backup

# 2. 执行替换（macOS/Linux）
sed -i 's/});$/}, c.env);/g' posts.ts
sed -i 's/});$/}, c.env);/g' comments.ts

# Windows PowerShell
(Get-Content posts.ts) -replace '\}\);$', '}, c.env);' | Set-Content posts.ts
(Get-Content comments.ts) -replace '\}\);$', '}, c.env);' | Set-Content comments.ts
```

**⚠️ 警告：** 
- 上述命令会替换所有以 `});` 结尾的行，可能影响其他代码
- **强烈建议手动逐个修改**，确保只修改通知相关的调用

---

## 验证修复

修改完成后，搜索确认所有 `createInteractionNotification` 调用都包含第三个参数：

```bash
# 搜索所有调用
grep -n "createInteractionNotification" backend/src/routes/*.ts

# 应该看到类似输出：
# posts.ts:1629:}, c.env);
# comments.ts:407:}, c.env);
# comments.ts:439:}, c.env);
```

---

## 测试清单

修复后请测试以下场景：

- [ ] 点赞文章后，作者收到通知
- [ ] 收藏文章后，作者收到通知
- [ ] 评论文章后，作者收到通知
- [ ] 回复评论后，被回复者收到通知
- [ ] 通知中心显示未读数
- [ ] 点击通知能正确跳转

---

## 注意事项

1. **只需添加第三个参数**，不要修改其他部分
2. **保持代码格式一致**，注意缩进
3. 修改后**重启后端服务**才能生效
4. 如果使用 TypeScript，确保没有类型错误

---

*补丁版本: 1.0*
*创建日期: 2026-02-13*
