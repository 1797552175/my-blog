package com.example.api.story;

import com.example.api.story.dto.StoryChapterCreateRequest;
import com.example.api.story.dto.StoryChapterResponse;
import com.example.api.story.dto.StoryChapterUpdateRequest;

import java.util.List;

public interface StoryChapterService {

    /**
     * 列出小说的所有章节（作者本人）
     */
    List<StoryChapterResponse> listChapters(String username, Long storyId);

    /**
     * 根据小说 slug 获取章节列表（公开，用于阅读页「从第N章续写」）
     * @param slug 小说 slug
     * @param upToSortOrder 只取 sortOrder <= 此值的章节，null 表示全部
     */
    List<StoryChapterResponse> listChaptersByStorySlug(String slug, Integer upToSortOrder);

    /**
     * 获取单章（作者本人）
     */
    StoryChapterResponse getChapter(String username, Long storyId, Long chapterId);

    /**
     * 创建章节
     */
    StoryChapterResponse createChapter(String username, Long storyId, StoryChapterCreateRequest request);

    /**
     * 更新章节
     */
    StoryChapterResponse updateChapter(String username, Long storyId, Long chapterId, StoryChapterUpdateRequest request);

    /**
     * 删除章节
     */
    void deleteChapter(String username, Long storyId, Long chapterId);
}
