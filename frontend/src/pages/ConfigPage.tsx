/**
 * 管理员配置页面（编排层）
 *
 * 结构说明：
 * - 配置 schema/校验、表单状态与保存/导入导出逻辑分别由
 *   components/config/configSchema 与 hooks/useSiteConfigForm 承担；
 * - 头部、标签页、分组面板等 UI 由 components/config/ 子组件渲染。
 *
 * 功能:
 * - 管理网站配置项，与数据库完全对应
 * - 实时预览配置效果、主题配置联动
 * - 批量更新配置、导入/导出配置
 *
 * @author 博客系统
 * @version 5.0.0
 * @created 2024-01-01
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useSiteConfigForm } from '../hooks/useSiteConfigForm';
import { configGroups } from '../components/config/configSchema';
import { ConfigHeader } from '../components/config/ConfigHeader';
import { ConfigTabs } from '../components/config/ConfigTabs';
import { ConfigGroupPanel } from '../components/config/ConfigGroupPanel';

export function ConfigPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    configLoading,
    localConfig,
    errors,
    updating,
    hasChanges,
    successMessage,
    activeTab,
    techStackInput,
    fileInputRef,
    handleTabChange,
    handleInputChange,
    handleTechStackChange,
    handleSave,
    handleBatchSave,
    handleReset,
    handleExport,
    handleImport,
  } = useSiteConfigForm();

  // 验证权限
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
    }
  }, [user, navigate]);

  if (configLoading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">加载配置中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* 头部 */}
      <ConfigHeader
        hasChanges={hasChanges}
        updating={updating}
        fileInputRef={fileInputRef}
        onImport={handleImport}
        onExport={handleExport}
        onReset={handleReset}
        onBatchSave={handleBatchSave}
      />

      {/* 成功消息 */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {successMessage}
        </div>
      )}

      {/* 标签页导航 */}
      <ConfigTabs groups={configGroups} activeTab={activeTab} onTabChange={handleTabChange} />

      {/* 配置内容 */}
      <div className="space-y-6">
        {configGroups.map((group, groupIndex) => (
          <ConfigGroupPanel
            key={groupIndex}
            group={group}
            active={activeTab === groupIndex}
            localConfig={localConfig}
            errors={errors}
            updating={updating}
            techStackInput={techStackInput}
            onChange={handleInputChange}
            onTechStackChange={handleTechStackChange}
            onSave={handleSave}
          />
        ))}
      </div>
    </div>
  );
}