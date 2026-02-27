package com.example.api.story;

import com.example.api.common.ApiException;
import com.example.api.inspiration.Inspiration;
import com.example.api.inspiration.InspirationRepository;
import com.example.api.readerfork.ReaderForkRepository;
import com.example.api.readerfork.StoryPullRequestRepository;
import com.example.api.story.dto.StoryCreateRequest;
import com.example.api.story.dto.StoryListItemResponse;
import com.example.api.story.dto.StoryResponse;
import com.example.api.story.dto.StoryUpdateRequest;
import com.example.api.story.wiki.StoryWikiCharacterRepository;
import com.example.api.story.wiki.StoryWikiPageRepository;
import com.example.api.story.wiki.StoryWikiTimelineEventRepository;
import com.example.api.storyseed.StoryBranchPointRepository;
import com.example.api.storyseed.StoryCharacterRepository;
import com.example.api.storyseed.StoryReadmeRepository;
import com.example.api.storyseed.StoryTermRepository;
import com.example.api.user.User;
import com.example.api.user.UserRepository;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.Collections;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class StoryServiceImpl implements StoryService {

    private final StoryRepository storyRepository;
    private final StoryChapterRepository storyChapterRepository;
    private final UserRepository userRepository;
    private final InspirationRepository inspirationRepository;
    private final StoryStarRepository storyStarRepository;
    private final ReaderForkRepository readerForkRepository;
    private final StoryWikiPageRepository storyWikiPageRepository;
    private final StoryWikiCharacterRepository storyWikiCharacterRepository;
    private final StoryWikiTimelineEventRepository storyWikiTimelineEventRepository;
    private final StoryReadmeRepository storyReadmeRepository;
    private final StoryCharacterRepository storyCharacterRepository;
    private final StoryTermRepository storyTermRepository;
    private final StoryBranchPointRepository storyBranchPointRepository;
    private final StoryPullRequestRepository storyPullRequestRepository;

    public StoryServiceImpl(StoryRepository storyRepository,
                            StoryChapterRepository storyChapterRepository,
                            UserRepository userRepository,
                            InspirationRepository inspirationRepository,
                            StoryStarRepository storyStarRepository,
                            ReaderForkRepository readerForkRepository,
                            StoryWikiPageRepository storyWikiPageRepository,
                            StoryWikiCharacterRepository storyWikiCharacterRepository,
                            StoryWikiTimelineEventRepository storyWikiTimelineEventRepository,
                            StoryReadmeRepository storyReadmeRepository,
                            StoryCharacterRepository storyCharacterRepository,
                            StoryTermRepository storyTermRepository,
                            StoryBranchPointRepository storyBranchPointRepository,
                            StoryPullRequestRepository storyPullRequestRepository) {
        this.storyRepository = storyRepository;
        this.storyChapterRepository = storyChapterRepository;
        this.userRepository = userRepository;
        this.inspirationRepository = inspirationRepository;
        this.storyStarRepository = storyStarRepository;
        this.readerForkRepository = readerForkRepository;
        this.storyWikiPageRepository = storyWikiPageRepository;
        this.storyWikiCharacterRepository = storyWikiCharacterRepository;
        this.storyWikiTimelineEventRepository = storyWikiTimelineEventRepository;
        this.storyReadmeRepository = storyReadmeRepository;
        this.storyCharacterRepository = storyCharacterRepository;
        this.storyTermRepository = storyTermRepository;
        this.storyBranchPointRepository = storyBranchPointRepository;
        this.storyPullRequestRepository = storyPullRequestRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<StoryListItemResponse> listPublished(Pageable pageable) {
        Page<Story> result = storyRepository.findByPublishedTrue(pageable);
        return mapToListItemWithHasContent(result);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<StoryListItemResponse> listCompleted(Pageable pageable) {
        return mapToListItemWithHasContent(
                storyRepository.findByPublishedTrueAndHasChapters(pageable));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<StoryListItemResponse> listInteractive(Pageable pageable) {
        return mapToListItemWithHasContent(
                storyRepository.findByPublishedTrueAndOpenSourceTrue(pageable));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<StoryListItemResponse> listOpenSource(Pageable pageable) {
        return mapToListItemWithHasContent(
                storyRepository.findByPublishedTrueAndOpenSourceTrue(pageable));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<StoryListItemResponse> searchPublished(String query, Pageable pageable) {
        return mapToListItemWithHasContent(
                storyRepository.searchPublished(query, pageable));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<StoryListItemResponse> advancedSearch(String query, Boolean openSource, List<String> tags, Pageable pageable) {
        return mapToListItemWithHasContent(
                storyRepository.advancedSearch(query, openSource, tags, pageable));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<StoryListItemResponse> listPublishedByTag(String tag, Pageable pageable) {
        return mapToListItemWithHasContent(
                storyRepository.findByPublishedTrueAndTag(tag, pageable));
    }

    private Set<Long> findStoryIdsWithChaptersSafe(List<Long> ids) {
        try {
            return storyChapterRepository.findDistinctStoryIdsByStoryIdIn(ids);
        } catch (Exception e) {
            log.warn("findDistinctStoryIdsByStoryIdIn failed, assuming no chapters: {}", e.getMessage());
            return Collections.emptySet();
        }
    }

    /** 列表转 DTO 时用批量查询判断是否有章节，避免访问懒加载 chapters 导致 500 */
    private Page<StoryListItemResponse> mapToListItemWithHasContent(Page<Story> result) {
        List<Story> content = result.getContent();
        if (content.isEmpty()) {
            return result.map(s -> StoryListItemResponse.fromEntity(s, false));
        }
        List<Long> ids = content.stream().map(Story::getId).toList();
        Set<Long> withChapters = findStoryIdsWithChaptersSafe(ids);
        return result.map(s -> StoryListItemResponse.fromEntity(s, withChapters.contains(s.getId())));
    }

    @Override
    @Transactional(readOnly = true)
    public StoryResponse getBySlug(String slug) {
        try {
            // 尝试从缓存获取
            return getBySlugWithCache(slug);
        } catch (Exception e) {
            // 缓存失败时直接从数据库查询
            log.warn("Cache access failed, falling back to database: {}", e.getMessage());
            Story story = storyRepository.findBySlugAndPublishedTrue(slug)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "小说不存在"));
            return StoryResponse.fromEntity(story);
        }
    }

    @Cacheable(value = "stories", key = "#slug")
    private StoryResponse getBySlugWithCache(String slug) {
        Story story = storyRepository.findBySlugAndPublishedTrue(slug)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "小说不存在"));
        return StoryResponse.fromEntity(story);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "stories", key = "#id")
    public StoryResponse getById(Long id) {
        Story story = storyRepository.findByIdAndPublishedTrue(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "小说不存在"));
        return StoryResponse.fromEntity(story);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "stories", key = "'author:' + #username + ':' + #id")
    public StoryResponse getByIdForAuthor(String username, Long id) {
        Story story = storyRepository.findByIdAndAuthorUsername(id, username)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "小说不存在"));
        return StoryResponse.fromEntity(story);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<StoryListItemResponse> listMyStories(String username, Pageable pageable) {
        return mapToListItemWithHasContent(
                storyRepository.findByAuthorUsername(username, pageable));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<StoryListItemResponse> listMyCompleted(String username, Pageable pageable) {
        return mapToListItemWithHasContent(
                storyRepository.findByAuthorUsername(username, pageable));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<StoryListItemResponse> listMyInteractive(String username, Pageable pageable) {
        return mapToListItemWithHasContent(
                storyRepository.findByAuthorUsername(username, pageable));
    }

    @Override
    @Transactional
    public StoryResponse create(String username, StoryCreateRequest request) {
        System.out.println("DEBUG: Creating story - title=" + request.title() + ", published=" + request.published());

        User author = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "用户不存在"));

        // 使用自定义 slug 或生成新的
        String slug = request.slug() != null && !request.slug().isBlank()
                ? request.slug()
                : generateSlug(request.title());

        // 检查slug是否已存在
        if (storyRepository.existsBySlug(slug)) {
            slug = slug + "-" + System.currentTimeMillis();
        }

        Story story = new Story(request.title(), slug, request.published(), author);

        // 设置AI创作相关字段
        story.setStyleParams(request.styleParams());
        story.setStorySummary(request.storySummary());
        story.setIntentKeywords(request.intentKeywords());

        // 设置开源相关字段
        story.setOpenSource(request.openSource());
        story.setOpenSourceLicense(request.openSourceLicense());

        // 设置标签
        if (request.tags() != null && !request.tags().isEmpty()) {
            story.setTags(request.tags());
        }

        // 设置关联的灵感
        if (request.inspirationId() != null) {
            Inspiration inspiration = inspirationRepository.findById(request.inspirationId())
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "灵感不存在"));
            story.setInspiration(inspiration);
        }

        Story saved = storyRepository.save(story);
        System.out.println("DEBUG: Story saved - id=" + saved.getId() + ", published=" + saved.isPublished());
        return StoryResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    @CacheEvict(value = "stories", key = "#id")
    public StoryResponse update(String username, Long id, StoryUpdateRequest request) {
        Story story = storyRepository.findByIdAndAuthorUsername(id, username)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "小说不存在"));

        story.setTitle(request.title());

        // 更新AI创作相关字段
        story.setStyleParams(request.styleParams());
        story.setStorySummary(request.storySummary());
        story.setIntentKeywords(request.intentKeywords());

        // 更新开源相关字段
        story.setOpenSource(request.openSource());
        story.setOpenSourceLicense(request.openSourceLicense());

        story.setPublished(request.published());
        story.setTags(request.tags());

        // 更新关联的灵感
        if (request.inspirationId() != null) {
            Inspiration inspiration = inspirationRepository.findById(request.inspirationId())
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "灵感不存在"));
            story.setInspiration(inspiration);
        } else {
            story.setInspiration(null);
        }

        Story saved = storyRepository.save(story);
        return StoryResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public void delete(String username, Long id) {
        Story story = storyRepository.findByIdAndAuthorUsername(id, username)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "小说不存在"));
        
        // 先删除相关的记录，避免外键约束冲突
        try {
            // 1. 删除 Star 记录
            storyStarRepository.deleteByStoryId(id);
            
            // 2. 删除 Reader Fork 记录
            readerForkRepository.findByStory_Id(id).forEach(readerForkRepository::delete);
            
            // 3. 删除 Wiki 页面
            storyWikiPageRepository.findByStoryIdOrderBySortOrderAsc(id).forEach(storyWikiPageRepository::delete);
            
            // 4. 删除 Wiki 角色
            storyWikiCharacterRepository.findByStoryIdOrderBySortOrderAsc(id).forEach(storyWikiCharacterRepository::delete);
            
            // 5. 删除 Wiki 时间线事件
            storyWikiTimelineEventRepository.findByStoryIdOrderBySortOrderAsc(id).forEach(storyWikiTimelineEventRepository::delete);
            
            // 6. 删除设定文档
            storyReadmeRepository.findByStory_Id(id).ifPresent(storyReadmeRepository::delete);
            
            // 7. 删除角色设定
            storyCharacterRepository.findByStory_IdOrderBySortOrderAsc(id).forEach(storyCharacterRepository::delete);
            
            // 8. 删除专有名词
            storyTermRepository.findByStory_IdOrderBySortOrderAsc(id).forEach(storyTermRepository::delete);
            
            // 9. 删除分支点
            storyBranchPointRepository.findByStory_IdOrderBySortOrderAsc(id).forEach(storyBranchPointRepository::delete);
            
            // 10. 删除 Pull Request (只针对storySeed，小说的PR会通过级联删除)
            // storyPullRequestRepository.findByStory_Id(id).forEach(storyPullRequestRepository::delete);
            
        } catch (Exception e) {
            log.warn("删除相关记录时出错: {}", e.getMessage());
        }
        
        // 最后删除小说本身
        storyRepository.delete(story);
    }

    @Override
    public List<String> getAllTags() {
        return storyRepository.findAllTags();
    }

    @Override
    public List<String> getMyTags(String username) {
        return storyRepository.findTagsByAuthorUsername(username);
    }

    /**
     * 生成URL友好的slug
     */
    private String generateSlug(String title) {
        String normalized = Normalizer.normalize(title, Normalizer.Form.NFD);
        String slug = normalized.toLowerCase(Locale.ROOT)
                .replaceAll("[^\\w\\s-]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-");
        return slug.length() > 200 ? slug.substring(0, 200) : slug;
    }
}
