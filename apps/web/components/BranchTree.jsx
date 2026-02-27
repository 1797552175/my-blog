'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

/**
 * 分支树形图组件
 * @param {Object} props
 * @param {Array} props.data - 树形数据
 * @param {Function} props.onNodeClick - 节点点击回调
 * @param {string} props.highlightAuthor - 高亮显示的作者
 */
export default function BranchTree({ data, onNodeClick, highlightAuthor }) {
  const svgRef = useRef(null);
  const [transform, setTransform] = useState(d3.zoomIdentity);

  useEffect(() => {
    if (!data || data.length === 0) return;

    // 清除之前的内容
    d3.select(svgRef.current).selectAll('*').remove();

    const width = 1200;
    const height = 800;
    const nodeWidth = 180;
    const nodeHeight = 60;
    const levelWidth = 250;

    // 创建 SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    // 添加缩放行为
    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        setTransform(event.transform);
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // 主容器
    const g = svg.append('g')
      .attr('transform', transform);

    // 将数据转换为 D3 层级结构
    const root = d3.hierarchy(data[0], d => d.children);

    // 计算树形布局
    const treeLayout = d3.tree()
      .nodeSize([nodeHeight + 20, levelWidth])
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.5));

    treeLayout(root);

    // 调整位置，让根节点在左侧
    root.each(d => {
      const x = d.y;
      d.y = d.x;
      d.x = x;
    });

    // 绘制连接线
    const links = g.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d3.linkHorizontal()
        .x(d => d.x)
        .y(d => d.y)
      )
      .attr('fill', 'none')
      .attr('stroke', d => {
        // 主线用蓝色，分支用灰色
        return d.target.data.isMainline ? '#3b82f6' : '#9ca3af';
      })
      .attr('stroke-width', d => d.target.data.isMainline ? 3 : 2)
      .attr('opacity', 0.6);

    // 绘制节点
    const nodes = g.selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        if (onNodeClick) onNodeClick(d.data);
      });

    // 节点背景
    nodes.append('rect')
      .attr('width', nodeWidth)
      .attr('height', nodeHeight)
      .attr('x', -nodeWidth / 2)
      .attr('y', -nodeHeight / 2)
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('fill', d => {
        if (d.data.isMainline) return '#dbeafe'; // 蓝色 - 主线
        if (highlightAuthor && d.data.authorName === highlightAuthor) return '#dcfce7'; // 绿色 - 高亮作者
        return '#f3f4f6'; // 灰色 - 其他分支
      })
      .attr('stroke', d => {
        if (d.data.isMainline) return '#3b82f6';
        if (highlightAuthor && d.data.authorName === highlightAuthor) return '#22c55e';
        return '#d1d5db';
      })
      .attr('stroke-width', 2);

    // 章节标题
    nodes.append('text')
      .attr('dy', '-5')
      .attr('text-anchor', 'middle')
      .style('font-weight', 'bold')
      .style('font-size', '12px')
      .style('fill', '#1f2937')
      .text(d => d.data.title.length > 12 
        ? d.data.title.substring(0, 12) + '...' 
        : d.data.title);

    // 作者名
    nodes.append('text')
      .attr('dy', '12')
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('fill', '#6b7280')
      .text(d => d.data.authorName || '未知作者');

    // 分支标记
    nodes.filter(d => !d.data.isMainline && d.data.branchName)
      .append('circle')
      .attr('cx', nodeWidth / 2 - 10)
      .attr('cy', -nodeHeight / 2 + 10)
      .attr('r', 6)
      .attr('fill', '#f59e0b');

    // 添加图例
    const legend = svg.append('g')
      .attr('transform', 'translate(20, 20)');

    const legendData = [
      { color: '#dbeafe', stroke: '#3b82f6', label: '主创主线' },
      { color: '#f3f4f6', stroke: '#d1d5db', label: '其他分支' },
      { color: '#dcfce7', stroke: '#22c55e', label: '我的分支' },
    ];

    legendData.forEach((item, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${i * 25})`);

      legendItem.append('rect')
        .attr('width', 16)
        .attr('height', 16)
        .attr('rx', 4)
        .attr('fill', item.color)
        .attr('stroke', item.stroke)
        .attr('stroke-width', 2);

      legendItem.append('text')
        .attr('x', 24)
        .attr('y', 12)
        .style('font-size', '12px')
        .style('fill', '#374151')
        .text(item.label);
    });

  }, [data, highlightAuthor]);

  return (
    <div className="relative w-full h-[600px] border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
      <svg ref={svgRef} className="w-full h-full" />
      
      {/* 控制按钮 */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          onClick={() => {
            const svg = d3.select(svgRef.current);
            svg.transition().duration(750).call(
              d3.zoom().transform,
              d3.zoomIdentity
            );
          }}
          className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-md text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700"
        >
          重置视图
        </button>
      </div>
    </div>
  );
}
