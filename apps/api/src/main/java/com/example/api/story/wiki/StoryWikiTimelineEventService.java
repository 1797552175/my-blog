package com.example.api.story.wiki;

import com.example.api.common.ApiException;
import com.example.api.story.Story;
import com.example.api.story.StoryRepository;
import com.example.api.story.wiki.dto.StoryWikiTimelineEventCreateRequest;
import com.example.api.story.wiki.dto.StoryWikiTimelineEventResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class StoryWikiTimelineEventService {

    private final StoryWikiTimelineEventRepository repository;
    private final StoryRepository storyRepository;

    public StoryWikiTimelineEventService(StoryWikiTimelineEventRepository repository, StoryRepository storyRepository) {
        this.repository = repository;
        this.storyRepository = storyRepository;
    }

    @Transactional(readOnly = true)
    public List<StoryWikiTimelineEventResponse> listByStoryId(Long storyId) {
        return repository.findByStoryIdOrderBySortOrderAsc(storyId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public StoryWikiTimelineEventResponse getById(Long id) {
        return repository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "事件不存在"));
    }

    @Transactional
    public StoryWikiTimelineEventResponse create(Long storyId, StoryWikiTimelineEventCreateRequest request) {
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "小说不存在"));

        StoryWikiTimelineEvent event = new StoryWikiTimelineEvent(story, request.eventTime(), request.title());
        event.setDescription(request.description());
        event.setContentMarkdown(request.contentMarkdown());
        event.setRelatedCharacters(request.relatedCharacters());
        event.setSortOrder(request.sortOrder() != null ? request.sortOrder() : 0);

        return toResponse(repository.save(event));
    }

    @Transactional
    public void delete(Long id, Long storyId) {
        StoryWikiTimelineEvent event = repository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "事件不存在"));
        if (!event.getStory().getId().equals(storyId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限删除此事件");
        }
        repository.delete(event);
    }

    private StoryWikiTimelineEventResponse toResponse(StoryWikiTimelineEvent event) {
        return new StoryWikiTimelineEventResponse(
                event.getId(),
                event.getStory().getId(),
                event.getEventTime(),
                event.getTitle(),
                event.getDescription(),
                event.getContentMarkdown(),
                event.getRelatedCharacters(),
                event.getSortOrder(),
                event.getCreatedAt(),
                event.getUpdatedAt()
        );
    }
}
