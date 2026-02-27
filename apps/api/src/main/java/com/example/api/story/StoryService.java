package com.example.api.story;

import com.example.api.story.dto.StoryCreateRequest;
import com.example.api.story.dto.StoryListItemResponse;
import com.example.api.story.dto.StoryResponse;
import com.example.api.story.dto.StoryUpdateRequest;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface StoryService {

    /**
     * 列出所有已发布的小说
     */
    Page<StoryListItemResponse> listPublished(Pageable pageable);

    /**
     * 列出已完成的小说
     */
    Page<StoryListItemResponse> listCompleted(Pageable pageable);

    /**
     * 列出待续写的互动小说（开源小说）
     */
    Page<StoryListItemResponse> listInteractive(Pageable pageable);

    /**
     * 列出开源小说
     */
    Page<StoryListItemResponse> listOpenSource(Pageable pageable);

    /**
     * 搜索已发布的小说
     */
    Page<StoryListItemResponse> searchPublished(String query, Pageable pageable);

    /**
     * 高级搜索：支持多标签筛选、状态筛选等
     */
    Page<StoryListItemResponse> advancedSearch(String query, Boolean openSource, List<String> tags, Pageable pageable);

    /**
     * 根据标签列出小说
     */
    Page<StoryListItemResponse> listPublishedByTag(String tag, Pageable pageable);

    /**
     * 根据slug获取小说详情
     */
    StoryResponse getBySlug(String slug);

    /**
     * 根据ID获取已发布小说详情（公开访问）
     */
    StoryResponse getById(Long id);

    /**
     * 根据ID获取小说详情（验证作者权限）
     */
    StoryResponse getByIdForAuthor(String username, Long id);

    /**
     * 列出当前用户的所有小说
     */
    Page<StoryListItemResponse> listMyStories(String username, Pageable pageable);

    /**
     * 列出当前用户已完成的小说
     */
    Page<StoryListItemResponse> listMyCompleted(String username, Pageable pageable);

    /**
     * 列出当前用户待续写的小说
     */
    Page<StoryListItemResponse> listMyInteractive(String username, Pageable pageable);

    /**
     * 创建小说
     */
    StoryResponse create(String username, StoryCreateRequest request);

    /**
     * 更新小说
     */
    StoryResponse update(String username, Long id, StoryUpdateRequest request);

    /**
     * 删除小说
     */
    void delete(String username, Long id);

    /**
     * 获取所有标签
     */
    List<String> getAllTags();

    /**
     * 获取当前用户的所有标签
     */
    List<String> getMyTags(String username);
}
