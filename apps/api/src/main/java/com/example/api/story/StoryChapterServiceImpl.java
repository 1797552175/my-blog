package com.example.api.story;

import com.example.api.common.ApiException;
import com.example.api.story.dto.StoryChapterCreateRequest;
import com.example.api.story.dto.StoryChapterResponse;
import com.example.api.story.dto.StoryChapterUpdateRequest;
import com.example.api.user.User;
import com.example.api.user.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class StoryChapterServiceImpl implements StoryChapterService {

    private final StoryChapterRepository chapterRepository;
    private final StoryRepository storyRepository;
    private final UserRepository userRepository;

    public StoryChapterServiceImpl(StoryChapterRepository chapterRepository,
                                   StoryRepository storyRepository,
                                   UserRepository userRepository) {
        this.chapterRepository = chapterRepository;
        this.storyRepository = storyRepository;
        this.userRepository = userRepository;
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
        List<StoryChapter> chapters = upToSortOrder != null && upToSortOrder > 0
                ? chapterRepository.findByStoryIdUpToSortOrder(story.getId(), upToSortOrder)
                : chapterRepository.findByStoryIdOrderBySortOrderAsc(story.getId());
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
        chapter = chapterRepository.save(chapter);
        return StoryChapterResponse.fromEntity(chapter);
    }

    @Override
    @Transactional
    public StoryChapterResponse updateChapter(String username, Long storyId, Long chapterId, StoryChapterUpdateRequest request) {
        Story story = storyRepository.findByIdAndAuthorUsername(storyId, username)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "小说不存在"));
        StoryChapter chapter = chapterRepository.findByIdAndStoryId(chapterId, story.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "章节不存在"));
        if (request.title() != null) {
            chapter.setTitle(request.title().isBlank() ? ("第" + chapter.getSortOrder() + "章") : request.title().trim());
        }
        if (request.contentMarkdown() != null) {
            chapter.setContentMarkdown(request.contentMarkdown());
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
        return StoryChapterResponse.fromEntity(chapter);
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
}
