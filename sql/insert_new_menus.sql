-- 插入新的菜单项
-- 先检查是否存在，不存在则插入

-- 舆情帖子
INSERT INTO menu (id, name, code, icon, path, parent_id, sort_order, status, created_at, updated_at)
SELECT gen_random_uuid(), '舆情帖子', 'sentiment-posts', 'MessageSquare', '/content/sentiment-posts', NULL, 4, 'active', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM menu WHERE code = 'sentiment-posts');

-- 数据入库 (Admin)
INSERT INTO menu (id, name, code, icon, path, parent_id, sort_order, status, created_at, updated_at)
SELECT gen_random_uuid(), '数据入库', 'etl', 'Database', '/etl', NULL, 6, 'active', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM menu WHERE code = 'etl');

-- 分类管理 (Admin)
INSERT INTO menu (id, name, code, icon, path, parent_id, sort_order, status, created_at, updated_at)
SELECT gen_random_uuid(), '分类管理', 'categories', 'Tag', '/categories', NULL, 7, 'active', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM menu WHERE code = 'categories');

-- 将新菜单分配给 Admin 角色 (roleId = 2)
INSERT INTO role_menu (id, role_id, menu_id, created_at)
SELECT gen_random_uuid(), 2, m.id, NOW()
FROM menu m
WHERE m.code IN ('sentiment-posts', 'etl', 'categories')
AND NOT EXISTS (SELECT 1 FROM role_menu WHERE role_id = 2 AND menu_id = m.id);