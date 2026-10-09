/**
 * 网站配置表单 hook
 *
 * 负责：本地配置副本、字段校验、单个/批量保存、导入导出、重置、
 * 标签页状态与 URL 同步、主题实时预览联动。
 * 渲染由 pages/ConfigPage.tsx 编排、components/config/ 子组件承担。
 */

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSiteConfig } from './useSiteConfig';
import { useTheme } from '../stores/themeStore';
import { useToast } from '../components/Toast';
import { api } from '../utils/api';
import {
  configGroups,
  findConfigItem,
  validateConfigItem,
} from '../components/config/configSchema';

export function useSiteConfigForm() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { config, loading: configLoading, updateConfig, refreshConfig } = useSiteConfig();
  const { setPrimaryColor, setThemeMode } = useTheme();
  const { showSuccess, showError } = useToast();

  // 从URL参数获取当前标签页索引
  const getTabIndexFromUrl = (): number => {
    const tab = searchParams.get('tab');
    const index = parseInt(tab || '0', 10);
    return isNaN(index) || index < 0 || index >= configGroups.length ? 0 : index;
  };

  const [localConfig, setLocalConfig] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [updating, setUpdating] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(getTabIndexFromUrl());
  const [techStackInput, setTechStackInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 当URL参数变化时，同步更新activeTab状态
  useEffect(() => {
    const tabFromUrl = getTabIndexFromUrl();
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // 初始化本地配置
  useEffect(() => {
    setLocalConfig(config);
    if (config.footer_tech_stack && Array.isArray(config.footer_tech_stack)) {
      setTechStackInput(config.footer_tech_stack.join('\n'));
    }
  }, [config]);

  // 切换标签页
  const handleTabChange = (index: number) => {
    setActiveTab(index);
    setSearchParams({ tab: index.toString() });
  };

  // 处理输入变化
  const handleInputChange = (key: string, value: any) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);

    // 清除该字段的错误
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }

    // 实时预览主题配置
    const item = findConfigItem(key);
    if (item?.preview) {
      if (key === 'theme_primary_color') {
        setPrimaryColor(value);
      } else if (key === 'theme_default_mode') {
        setThemeMode(value);
      }
    }
  };

  // 处理技术栈输入变化
  const handleTechStackChange = (value: string) => {
    setTechStackInput(value);
    const stack = value.split('\n').filter(item => item.trim() !== '');
    handleInputChange('footer_tech_stack', stack);
  };

  // 保存单个配置
  const handleSave = async (key: string, value: any) => {
    const configItem = findConfigItem(key);
    if (!configItem) {
      showError('配置项不存在');
      return;
    }

    // 验证
    const validationError = validateConfigItem(configItem, value);
    if (validationError) {
      setErrors(prev => ({ ...prev, [key]: validationError }));
      return;
    }

    try {
      setUpdating(key);
      await updateConfig(key, value);

      // 保存后强制刷新缓存
      await refreshConfig();

      showSuccess(`成功更新 ${configItem.label}`);
      setHasChanges(false);
    } catch (error) {
      console.error('更新配置失败:', error);
      showError('更新配置失败,请重试');
    } finally {
      setUpdating(null);
    }
  };

  // 批量保存
  const handleBatchSave = async () => {
    // 验证所有更改
    const validationErrors: Record<string, string> = {};

    for (const group of configGroups) {
      for (const item of group.items) {
        if (localConfig[item.key] !== config[item.key]) {
          const error = validateConfigItem(item, localConfig[item.key]);
          if (error) {
            validationErrors[item.key] = error;
          }
        }
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      alert('请修正表单中的错误后再保存');
      return;
    }

    // 准备要更新的配置
    const changedConfigs: Record<string, any> = {};
    for (const key in localConfig) {
      if (localConfig[key] !== config[key]) {
        changedConfigs[key] = localConfig[key];
      }
    }

    if (Object.keys(changedConfigs).length === 0) {
      alert('没有需要保存的更改');
      return;
    }

    try {
      setUpdating('batch');
      const response = await api.batchUpdateConfig(changedConfigs);

      setSuccessMessage(`成功更新 ${response.data?.updated || 0} 项配置`);
      setHasChanges(false);

      await refreshConfig();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('批量更新配置失败:', error);
      alert('批量更新失败,请重试');
    } finally {
      setUpdating(null);
    }
  };

  // 重置更改
  const handleReset = () => {
    if (confirm('确定要放弃所有未保存的更改吗?')) {
      setLocalConfig(config);
      if (config.footer_tech_stack && Array.isArray(config.footer_tech_stack)) {
        setTechStackInput(config.footer_tech_stack.join('\n'));
      }
      setHasChanges(false);
      setErrors({});

      // 重置主题预览
      if (config.theme_primary_color) {
        setPrimaryColor(config.theme_primary_color);
      }
      if (config.theme_default_mode) {
        setThemeMode(config.theme_default_mode);
      }
    }
  };

  // 导出配置
  const handleExport = () => {
    const exportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      config: localConfig
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `site-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSuccessMessage('配置导出成功');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // 导入配置
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const imported = JSON.parse(content);

        // 验证导入的数据结构
        if (!imported.config || typeof imported.config !== 'object') {
          throw new Error('无效的配置文件格式');
        }

        // 确认导入
        if (confirm(`确定要导入配置吗?这将覆盖当前的配置设置。\n\n导出时间: ${imported.exportedAt || '未知'}\n版本: ${imported.version || '未知'}`)) {
          // 只导入已知的配置项
          const validKeys = configGroups.flatMap(g => g.items.map(i => i.key));
          const filteredConfig: Record<string, any> = {};

          for (const key of validKeys) {
            if (imported.config[key] !== undefined) {
              filteredConfig[key] = imported.config[key];
            }
          }

          setLocalConfig(prev => ({ ...prev, ...filteredConfig }));
          setHasChanges(true);
          setSuccessMessage(`成功导入 ${Object.keys(filteredConfig).length} 项配置`);
          setTimeout(() => setSuccessMessage(null), 3000);
        }
      } catch (error) {
        console.error('导入配置失败:', error);
        alert('导入失败: ' + (error instanceof Error ? error.message : '无效的配置文件'));
      }
    };
    reader.readAsText(file);

    // 重置文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return {
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
  };
}