package com.example.api.story;

import com.example.api.ai.AiDebugContext;
import com.example.api.common.ApiException;
import com.example.api.story.dto.PublishChapterResponse;
import com.example.api.story.dto.StoryChapterCreateRequest;
import com.example.api.story.dto.StoryChapterResponse;
import com.example.api.story.dto.StoryChapterUpdateRequest;
import com.example.api.user.User;
import com.example.api.user.UserRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class StoryChapterServiceImpl implements StoryChapterService {

    @Value("${ai.debug-log:false}")
    private boolean debugLogEnabled;

    private final StoryChapterRepository chapterRepository;
    private final StoryRepository storyRepository;
    private final UserRepository userRepository;
    private final ChapterSummaryService chapterSummaryService;

    public StoryChapterServiceImpl(StoryChapterRepository chapterRepository,
                                   StoryRepository storyRepository,
                                   UserRepository userRepository,
                                   ChapterSummaryService chapterSummaryService) {
        this.chapterRepository = chapterRepository;
        this.storyRepository = storyRepository;
        this.userRepository = userRepository;
        this.chapterSummaryService = chapterSummaryService;
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoryChapterResponse> listChapters(String username, Long storyId) {
        Story story = storyRepository.findByIdAndAuthorUsername(storyId, username)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "小说不存在"));
        return chapterRepository.findByStoryIdOrderBySortOrderAsc(story.getId()).stream()
                .map(StoryChapterResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoryChapterResponse> listChaptersByStorySlug(String slug, Integer upToSortOrder) {
        Story story = storyRepository.findBySlugAndPublishedTrue(slug)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "小说不存在"));
        List<StoryChapter> chapters;
        if (upToSortOrder != null && upToSortOrder > 0) {
            chapters = chapterRepository.findByStoryIdAndPublishedTrueUpToSortOrder(story.getId(), upToSortOrder);
        } else {
            chapters = chapterRepository.findByStoryIdAndPublishedTrueOrderBySortOrderAsc(story.getId());
        }
        return chapters.stream().map(StoryChapterResponse::fromEntity).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public StoryChapterResponse getChapter(String username, Long storyId, Long chapterId) {
        Story story = storyRepository.findByIdAndAuthorUsername(storyId, username)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "小说不存在"));
        StoryChapter chapter = chapterRepository.findByIdAndStoryId(chapterId, story.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "章节不存在"));
        return StoryChapterResponse.fromEntity(chapter);
    }

    @Override
    @Transactional
    public StoryChapterResponse createChapter(String username, Long storyId, StoryChapterCreateRequest request) {
        System.out.println("DEBUG: createChapter called with published=" + request.published());
        Story story = storyRepository.findByIdAndAuthorUsername(storyId, username)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "小说不存在"));
        int count = chapterRepository.countByStoryId(storyId);
        int sortOrder = request.sortOrder() != null && request.sortOrder() >= 1 && request.sortOrder() <= count + 1
                ? request.sortOrder()
                : count + 1;
        List<StoryChapter> existing = chapterRepository.findByStoryIdOrderBySortOrderAsc(storyId);
        for (StoryChapter c : existing) {
            if (c.getSortOrder() >= sortOrder) {
                c.setSortOrder(c.getSortOrder() + 1);
                chapterRepository.save(c);
            }
        }
        String title = request.title() != null && !request.title().isBlank()
                ? request.title().trim()
                : ("第" + sortOrder + "章");
        User author = userRepository.findByUsername(username).orElse(null);
        StoryChapter chapter = new StoryChapter(story, author, sortOrder, title, request.contentMarkdown() != null ? request.contentMarkdown() : "");
        // 根据请求参数决定是否直接发布，默认草稿
        boolean shouldPublish = request.published() != null ? request.published() : false;
        System.out.println("DEBUG: setting published to " + shouldPublish);
        chapter.setPublished(shouldPublish);
        chapter = chapterRepository.save(chapter);
        System.out.println("DEBUG: chapter saved with published=" + chapter.getPublished());
        return StoryChapterResponse.fromEntity(chapter);
    }

    @Override
    @Transactional
    public PublishChapterResponse updateChapter(String username, Long storyId, Long chapterId, StoryChapterUpdateRequest request) {
        Story story = storyRepository.findByIdAndAuthorUsername(storyId, username)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "小说不存在"));
        StoryChapter chapter = chapterRepository.findByIdAndStoryId(chapterId, story.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "章节不存在"));
        
        // 标记内容是否发生变化（只有内容变化才需要重新预压缩）
        boolean contentChanged = false;
        
        if (request.title() != null) {
            chapter.setTitle(request.title().isBlank() ? ("第" + chapter.getSortOrder() + "章") : request.title().trim());
        }
        if (request.contentMarkdown() != null) {
            // 检查内容是否真的发生了变化
            String newContent = request.contentMarkdown();
            String oldContent = chapter.getContentMarkdown();
            if (oldContent == null || !oldContent.equals(newContent)) {
                contentChanged = true;
            }
            chapter.setContentMarkdown(newContent);
        }
        if (request.sortOrder() != null && request.sortOrder() != chapter.getSortOrder()) {
            int newOrder = Math.max(1, request.sortOrder());
            int oldOrder = chapter.getSortOrder();
            if (newOrder != oldOrder) {
                List<StoryChapter> all = chapterRepository.findByStoryIdOrderBySortOrderAsc(storyId);
                for (StoryChapter c : all) {
                    int o = c.getSortOrder();
                    if (oldOrder < newOrder) {
                        if (o > oldOrder && o <= newOrder) {
                            c.setSortOrder(o - 1);
                            chapterRepository.save(c);
                        }
                    } else {
                        if (o >= newOrder && o < oldOrder) {
                            c.setSortOrder(o + 1);
                            chapterRepository.save(c);
                        }
                    }
                }
                chapter.setSortOrder(newOrder);
            }
        }
        chapter = chapterRepository.save(chapter);
        System.out.println("DEBUG: chapter saved, id=" + chapter.getId() + ", published=" + chapter.getPublished() + ", contentChanged=" + contentChanged);
        
        String warning = null;
        Map<String, Object> debugInfo = null;
        
        // 只有章节已发布且内容发生变化时，才触发预压缩
        if (Boolean.TRUE.equals(chapter.getPublished()) && contentChanged) {
            System.out.println("DEBUG: chapter is published and content changed, triggering precompress");
            warning = chapterSummaryService.generateAndSave(chapter);
            System.out.println("DEBUG: precompress result warning=" + warning);
            
            // 收集调试信息
            if (debugLogEnabled && AiDebugContext.hasDebugInfo()) {
                debugInfo = new HashMap<>();
                debugInfo.put("chapterId", chapter.getId());
                debugInfo.put("published", chapter.getPublished());
                debugInfo.put("contentLength", chapter.getContentMarkdown() != null ? chapter.getContentMarkdown().length() : 0);
                debugInfo.put("aiLogs", AiDebugContext.get().getLogs());
            }
        } else {
            System.out.println("DEBUG: skipping precompress (published=" + chapter.getPublished() + ", contentChanged=" + contentChanged + ")");
        }
        
        StoryChapterResponse resp = StoryChapterResponse.fromEntity(chapter);
        
        if (warning != null && debugInfo != null) {
            return PublishChapterResponse.withWarningAndDebug(resp, warning, debugInfo);
        } else if (warning != null) {
            return PublishChapterResponse.withWarning(resp, warning);
        } else if (debugInfo != null) {
            return PublishChapterResponse.withDebug(resp, debugInfo);
        } else {
            return PublishChapterResponse.ok(resp);
        }
    }

    @Override
    @Transactional
    public void deleteChapter(String username, Long storyId, Long chapterId) {
        Story story = storyRepository.findByIdAndAuthorUsername(storyId, username)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "小说不存在"));
        StoryChapter chapter = chapterRepository.findByIdAndStoryId(chapterId, story.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "章节不存在"));
        int order = chapter.getSortOrder();
        chapterRepository.delete(chapter);
        for (StoryChapter c : chapterRepository.findByStoryIdOrderBySortOrderAsc(storyId)) {
            if (c.getSortOrder() > order) {
                c.setSortOrder(c.getSortOrder() - 1);
                chapterRepository.save(c);
            }
        }
    }

    @Override
    @Transactional
    public PublishChapterResponse publishChapter(String username, Long storyId, Long chapterId) {
        Story story = storyRepository.findByIdAndAuthorUsername(storyId, username)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "小说不存在"));
        StoryChapter chapter = chapterRepository.findByIdAndStoryId(chapterId, story.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "章节不存在"));
        chapter.setPublished(true);
        chapter = chapterRepository.save(chapter);
        String warning = chapterSummaryService.generateAndSave(chapter);
        StoryChapterResponse resp = StoryChapterResponse.fromEntity(chapter);
        return warning != null ? PublishChapterResponse.withWarning(resp, warning) : PublishChapterResponse.ok(resp);
    }

    @Override
    @Transactional
    public StoryChapterResponse unpublishChapter(String username, Long storyId, Long chapterId) {
        Story story = storyRepository.findByIdAndAuthorUsername(storyId, username)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "小说不存在"));
        StoryChapter chapter = chapterRepository.findByIdAndStoryId(chapterId, story.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "章节不存在"));
        chapter.setPublished(false);
        chapter = chapterRepository.save(chapter);
        return StoryChapterResponse.fromEntity(chapter);
    }
}
