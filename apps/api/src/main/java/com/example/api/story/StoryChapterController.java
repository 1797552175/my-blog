package com.example.api.story;

import com.example.api.story.dto.PublishChapterResponse;
import com.example.api.story.dto.StoryChapterCreateRequest;
import com.example.api.story.dto.StoryChapterResponse;
import com.example.api.story.dto.StoryChapterUpdateRequest;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/stories")
public class StoryChapterController {

    private final StoryChapterService chapterService;

    public StoryChapterController(StoryChapterService chapterService) {
        this.chapterService = chapterService;
    }

    /**
     * 根据小说 slug 获取章节列表（公开，用于阅读页「从第N章续写」）
     * upToSortOrder 只取序号 <= 该值的章节，不传则返回全部
     */
    @GetMapping("/slug/{slug}/chapters")
    public List<StoryChapterResponse> listChaptersBySlug(
            @PathVariable String slug,
            @RequestParam(required = false) Integer upToSortOrder) {
        return chapterService.listChaptersByStorySlug(slug, upToSortOrder);
    }

    /**
     * 列出小说的所有章节（作者本人）
     */
    @GetMapping("/{storyId}/chapters")
    public List<StoryChapterResponse> listChapters(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long storyId) {
        return chapterService.listChapters(userDetails.getUsername(), storyId);
    }

    /**
     * 获取单章（作者本人）
     */
    @GetMapping("/{storyId}/chapters/{chapterId}")
    public StoryChapterResponse getChapter(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long storyId,
            @PathVariable Long chapterId) {
        return chapterService.getChapter(userDetails.getUsername(), storyId, chapterId);
    }

    /**
     * 创建章节
     */
    @PostMapping("/{storyId}/chapters")
    @ResponseStatus(HttpStatus.CREATED)
    public StoryChapterResponse createChapter(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long storyId,
            @Valid @RequestBody StoryChapterCreateRequest request) {
        return chapterService.createChapter(userDetails.getUsername(), storyId, request);
    }

    /**
     * 更新章节（已发布章节会触发预压缩）
     */
    @PutMapping("/{storyId}/chapters/{chapterId}")
    public PublishChapterResponse updateChapter(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long storyId,
            @PathVariable Long chapterId,
            @Valid @RequestBody StoryChapterUpdateRequest request) {
        return chapterService.updateChapter(userDetails.getUsername(), storyId, chapterId, request);
    }

    /**
     * 删除章节
     */
    @DeleteMapping("/{storyId}/chapters/{chapterId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteChapter(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long storyId,
            @PathVariable Long chapterId) {
        chapterService.deleteChapter(userDetails.getUsername(), storyId, chapterId);
    }

    /**
     * 发布章节（会触发预压缩；失败时 response.warning 有提示）
     */
    @PostMapping("/{storyId}/chapters/{chapterId}/publish")
    public PublishChapterResponse publishChapter(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long storyId,
            @PathVariable Long chapterId) {
        return chapterService.publishChapter(userDetails.getUsername(), storyId, chapterId);
    }

    /**
     * 取消发布章节
     */
    @PostMapping("/{storyId}/chapters/{chapterId}/unpublish")
    public StoryChapterResponse unpublishChapter(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long storyId,
            @PathVariable Long chapterId) {
        return chapterService.unpublishChapter(userDetails.getUsername(), storyId, chapterId);
    }
}
