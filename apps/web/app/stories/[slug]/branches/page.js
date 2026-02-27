'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getStoryBySlug } from '../../../../services/stories';
import { getBranchTree, getBranchStats } from '../../../../services/branches';
import BranchTree from '../../../../components/BranchTree';

export default function BranchesPage() {
  const params = useParams();
  const slug = params?.slug;

  const [story, setStory] = useState(null);
  const [treeData, setTreeData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [filter, setFilter] = useState('all'); // all, mainline, mine

  useEffect(() => {
    if (!slug) return;

    async function loadData() {
      try {
        setLoading(true);
        const storyData = await getStoryBySlug(slug);
        setStory(storyData);

        const [tree, statsData] = await Promise.all([
          getBranchTree(storyData.id),
          getBranchStats(storyData.id)
        ]);

        setTreeData(tree);
        setStats(statsData);
      } catch (err) {
        setError('加载分支数据失败');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [slug]);

  const handleNodeClick = (node) => {
    setSelectedNode(node);
  };

  // 过滤数据
  const getFilteredData = () => {
    if (!treeData) return null;

    if (filter === 'all') return treeData;

    // 递归过滤函数
    const filterTree = (nodes, predicate) => {
      return nodes.map(node => {
        const newNode = { ...node };
        if (node.children) {
          newNode.children = filterTree(node.children, predicate);
        }
        return newNode;
      }).filter(predicate);
    };

    if (filter === 'mainline') {
      return filterTree(treeData, node => node.isMainline);
    }

    return treeData;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-zinc-500">加载中...</div>
        </div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center text-red-500">{error || '小说不存在'}</div>
      </div>
    );
  }

  const filteredData = getFilteredData();

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* 面包屑 */}
      <div className="mb-6">
        <Link href={`/stories/${slug}`} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
          ← 返回小说详情
        </Link>
      </div>

      {/* 标题区 */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">{story.title} - 分支图谱</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            探索不同的故事线，每个分支都是一个独特的结局
          </p>
        </div>
        <Link
          href={`/stories/${slug}/read`}
          className="btn bg-indigo-600 text-white hover:bg-indigo-700"
        >
          开始阅读
        </Link>
      </div>

      {/* 统计信息 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 text-center">
            <div className="text-2xl font-bold text-indigo-600">{stats.totalChapters}</div>
            <div className="text-sm text-zinc-500">总章节</div>
          </div>
          <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.mainlineChapters}</div>
            <div className="text-sm text-zinc-500">主线章节</div>
          </div>
          <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 text-center">
            <div className="text-2xl font-bold text-amber-600">{stats.branchChapters}</div>
            <div className="text-sm text-zinc-500">分支章节</div>
          </div>
          <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.branchPoints}</div>
            <div className="text-sm text-zinc-500">分叉点</div>
          </div>
          <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.authorCount}</div>
            <div className="text-sm text-zinc-500">创作者</div>
          </div>
        </div>
      )}

      {/* 筛选器 */}
      <div className="flex items-center gap-4 mb-4">
        <span className="text-sm text-zinc-500">显示：</span>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-md text-sm ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            全部分支
          </button>
          <button
            onClick={() => setFilter('mainline')}
            className={`px-3 py-1.5 rounded-md text-sm ${
              filter === 'mainline'
                ? 'bg-indigo-600 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            仅主线
          </button>
        </div>
      </div>

      {/* 树形图 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          {filteredData && filteredData.length > 0 ? (
            <BranchTree
              data={filteredData}
              onNodeClick={handleNodeClick}
            />
          ) : (
            <div className="h-[600px] flex items-center justify-center border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg">
              <div className="text-center">
                <div className="text-4xl mb-3">🌳</div>
                <h3 className="text-lg font-semibold mb-2">暂无分支数据</h3>
                <p className="text-zinc-500 dark:text-zinc-400 mb-4">
                  成为第一个创作者，从这里开始你的故事线！
                </p>
                <Link
                  href={`/stories/${slug}/read`}
                  className="btn bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  开始创作
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* 选中节点详情 */}
        <div className="lg:col-span-1">
          {selectedNode ? (
            <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 sticky top-6">
              <h3 className="font-semibold mb-4">章节详情</h3>
              
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-zinc-500">章节标题</div>
                  <div className="font-medium">{selectedNode.title}</div>
                </div>
                
                <div>
                  <div className="text-xs text-zinc-500">创作者</div>
                  <div className="font-medium">{selectedNode.authorName || '未知'}</div>
                </div>
                
                <div>
                  <div className="text-xs text-zinc-500">章节序号</div>
                  <div className="font-medium">第 {selectedNode.sortOrder} 章</div>
                </div>
                
                <div>
                  <div className="text-xs text-zinc-500">字数</div>
                  <div className="font-medium">{selectedNode.wordCount} 字</div>
                </div>
                
                {selectedNode.branchName && (
                  <div>
                    <div className="text-xs text-zinc-500">分支名称</div>
                    <div className="font-medium text-amber-600">{selectedNode.branchName}</div>
                  </div>
                )}
                
                <div>
                  <div className="text-xs text-zinc-500">类型</div>
                  <div className={`inline-block px-2 py-0.5 rounded text-xs ${
                    selectedNode.isMainline
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}>
                    {selectedNode.isMainline ? '主创主线' : '分支章节'}
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <Link
                  href={`/stories/${slug}/read?chapter=${selectedNode.id}`}
                  className="block w-full btn bg-indigo-600 text-white hover:bg-indigo-700 text-center"
                >
                  阅读此章
                </Link>
                <Link
                  href={`/stories/${slug}/write?parentChapter=${selectedNode.id}`}
                  className="block w-full btn bg-green-600 text-white hover:bg-green-700 text-center"
                >
                  从此续写
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-center text-zinc-500">
              点击树形图中的节点查看详情
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
